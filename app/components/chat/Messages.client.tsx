import type { Message } from 'ai';
import type { ForwardedRef } from 'react';
import { forwardRef, Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation } from '@remix-run/react';
import { chatId } from '~/lib/persistence/useConversationHistory';
import { toast } from 'sonner';
import WithTooltip from '~/components/ui/Tooltip';
import { ProfilePicture } from '~/components/auth/ProfilePicture';
import { useSession } from '~/auth/auth-client';
import { forkConversation } from '~/lib/persistence/conversations';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id, isStreaming = false, messages = [] } = props;
    const location = useLocation();
    const { data } = useSession();
    const user = data?.user;

    const handleRewind = (messageId: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('rewindTo', messageId);
      window.location.search = searchParams.toString();
    };

    const handleFork = async (messageId: string) => {
      try {
        if (!chatId.get()) {
          toast.error('Invalid chat id');
          return;
        }

        const forkedChatId = await forkConversation(chatId.get()!, messageId);
        window.location.href = `/chat/${forkedChatId}`;
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    return (
      <div id={id} className={props.className} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId, annotations } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isLast = index === messages.length - 1;
              const isHidden = annotations?.includes('hidden');

              if (isHidden) {
                return <Fragment key={index} />;
              }

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 p-6 w-full rounded-xl', {
                    'bg-liblab-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-liblab-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-4': !isFirst,
                  })}
                >
                  {isUserMessage && <ProfilePicture user={user} />}
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? (
                      <UserMessage content={content} />
                    ) : (
                      <AssistantMessage content={content} annotations={message.annotations} />
                    )}
                  </div>
                  {!isUserMessage && (
                    <div className="flex gap-2 flex-col lg:flex-row h-6">
                      {messageId && (
                        <WithTooltip tooltip="Revert to this message">
                          <button
                            onClick={() => handleRewind(messageId)}
                            key="i-liblab:ic_back"
                            className={classNames(
                              'i-liblab:ic_back text-2xl opacity-50 hover:opacity-100 text-liblab-elements-icon-primary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}

                      <WithTooltip tooltip="Fork chat from this message">
                        <button
                          onClick={() => handleFork(messageId)}
                          key="i-liblab:ic_back-square"
                          className={classNames(
                            'i-liblab:ic_back-square text-2xl opacity-50 hover:opacity-100 text-liblab-elements-icon-primary transition-colors',
                          )}
                        />
                      </WithTooltip>
                    </div>
                  )}
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full text-liblab-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);
