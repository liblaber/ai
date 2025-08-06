import type { Message } from 'ai';
import type { ForwardedRef } from 'react';
import { forwardRef, Fragment, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { chatId } from '~/lib/persistence/useConversationHistory';
import { toast } from 'sonner';
import WithTooltip from '~/components/ui/Tooltip';
import { ProfilePicture } from '~/components/auth/ProfilePicture';
import { useSession } from '~/auth/auth-client';
import { forkConversation, getConversation, getMessageSnapshotId } from '~/lib/persistence/conversations';
import { rewindToSnapshot } from '~/lib/persistence/snapshots';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { loadPreviousFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';
import { workbenchStore } from '~/lib/stores/workbench';
import { useRouter } from 'next/navigation';
import { PROJECT_SETUP_ANNOTATION } from '~/utils/constants';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
  setMessages: (messages: Message[]) => void;
  error?: Error;
  onRetry: (errorMessage: string) => Promise<void>;
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (
    { id, isStreaming = false, messages = [], setMessages, className, error, onRetry }: MessagesProps,
    ref: ForwardedRef<HTMLDivElement> | undefined,
  ) => {
    const { data } = useSession();
    const router = useRouter();
    const user = data?.user;
    const [rewindDialog, setRewindDialog] = useState<{
      isOpen: boolean;
      snapshotId: string | null;
    }>({
      isOpen: false,
      snapshotId: null,
    });

    const handleRewind = (snapshotId: string) => {
      setRewindDialog({ isOpen: true, snapshotId });
    };

    const confirmRewind = async () => {
      if (!rewindDialog.snapshotId) {
        console.error('No snapshot ID provided');
        return;
      }

      try {
        workbenchStore.previewsStore.changesLoading();

        await rewindToSnapshot(chatId.get()!, rewindDialog.snapshotId);

        const conversationId = chatId.get();

        if (!conversationId) {
          console.error('No conversation ID provided');
          router.push('/');

          return;
        }

        const updatedConversation = await getConversation(conversationId);

        if (updatedConversation?.messages && updatedConversation?.snapshot) {
          await loadPreviousFileMapIntoContainer(updatedConversation.snapshot.fileMap);

          setMessages(updatedConversation.messages);
        }

        toast.success('Conversation reverted successfully');
      } catch (error) {
        toast.error('Failed to revert conversation: ' + (error as Error).message);
      }

      closeRewindDialog();
    };

    const closeRewindDialog = () => {
      setRewindDialog({ isOpen: false, snapshotId: null });
    };

    const handleFork = async (messageId: string) => {
      try {
        const conversationId = chatId.get();

        if (!conversationId) {
          toast.error('Invalid chat id');
          return;
        }

        const forkedChatId = await forkConversation(conversationId, messageId);

        router.push(`/chat/${forkedChatId}`);

        toast.success('Chat forked successfully');
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    const shouldShowForkAction = (annotations: Message['annotations']) => {
      return !isStreaming && !error && !annotations?.includes(PROJECT_SETUP_ANNOTATION);
    };

    return (
      <div id={id} className={classNames(className, '')} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId, annotations } = message;
              const snapshotId = getMessageSnapshotId(message);
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isLast = index === messages.length - 1;
              const isHidden = annotations?.includes('hidden');

              if (isHidden) {
                return <Fragment key={message.id} />;
              }

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 p-6 w-full rounded-xl relative', {
                    'bg-liblab-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-liblab-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-2': !isFirst,
                  })}
                >
                  {!isUserMessage && (
                    <div className="absolute top-3 right-3 flex gap-1 flex-col lg:flex-row h-6">
                      {messageId && snapshotId && (
                        <WithTooltip tooltip="Revert to this message">
                          <button
                            onClick={() => handleRewind(snapshotId)}
                            key="i-liblab:ic_back"
                            className={classNames(
                              'i-liblab:ic_back text-2xl opacity-50 hover:opacity-100 text-liblab-elements-icon-primary transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}

                      {shouldShowForkAction(message.annotations) && (
                        <WithTooltip tooltip="Fork chat from this message">
                          <button
                            onClick={() => handleFork(messageId)}
                            key="i-liblab:ic_back-square"
                            className={classNames(
                              'i-liblab:ic_back-square text-2xl opacity-50 hover:opacity-100 text-liblab-elements-icon-primary bg-transparent! transition-colors',
                            )}
                          />
                        </WithTooltip>
                      )}
                    </div>
                  )}
                  {isUserMessage && <ProfilePicture user={user} />}
                  <div className="grid grid-col-1 w-full relative">
                    {isUserMessage ? (
                      <UserMessage key={message.id} content={content} />
                    ) : (
                      <AssistantMessage
                        key={message.id}
                        content={content}
                        annotations={message.annotations}
                        onRetry={onRetry}
                        error={isLast ? error : undefined}
                      />
                    )}
                  </div>
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full text-liblab-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}

        {rewindDialog.isOpen && (
          <DialogRoot open={rewindDialog.isOpen} onOpenChange={(open) => !open && closeRewindDialog()}>
            <Dialog onBackdrop={closeRewindDialog} onClose={closeRewindDialog}>
              <div className="p-6 bg-white dark:bg-gray-950">
                <DialogTitle className="text-gray-900 dark:text-white">Revert Chat?</DialogTitle>
                <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                  <p>You are about to revert the conversation to this point.</p>
                  <p className="mt-2">
                    All messages after this point will be removed. Are you sure you want to continue?
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                    If you want to keep your current work, use the "fork chat" option instead.
                  </p>
                </DialogDescription>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <DialogButton type="secondary" onClick={closeRewindDialog}>
                  Cancel
                </DialogButton>
                <DialogButton type="danger" onClick={confirmRewind}>
                  Revert
                </DialogButton>
              </div>
            </Dialog>
          </DialogRoot>
        )}
      </div>
    );
  },
);
