import { useEffect } from 'react';
import { useConversationsStore } from '~/lib/stores/conversations';
import { useUserStore } from '~/lib/stores/user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import { ChevronRight, Loader2 } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { formatDistance } from 'date-fns';

export function ConversationsList() {
  const { conversations, loadConversations, lastLoaded } = useConversationsStore();
  const { user } = useUserStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const myApps = conversations.filter((c) => c.userId === user?.id);

  return (
    <div
      className={classNames(
        'w-full sm:max-w-[90%] lg:max-w-[630px] mx-auto text-left mt-12 animate transition-height ease-in-out duration-500 overflow-hidden',
        lastLoaded ? 'h-[310px]' : 'h-[80px]',
      )}
    >
      <div className="bg-depth-3 rounded-xl p-4">
        <Tabs defaultValue="my-apps">
          <TabsList className={classNames('rounded-lg bg-depth-1 !h-8 !px-0.5 justify-start', 'text-secondary')}>
            <TabsTrigger
              value="my-apps"
              className={classNames(
                'rounded-lg h-7 px-4 py-1.5 cursor-pointer',
                'data-[state=active]:bg-gray-700 data-[state=active]:text-white',
              )}
            >
              My apps{' '}
              {lastLoaded ? (
                <span className="text-secondary ml-1 font-normal">{myApps.length}</span>
              ) : (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="shared-apps"
              className={classNames(
                'rounded-lg h-7 px-4 py-1.5 cursor-pointer',
                'data-[state=active]:bg-gray-700 data-[state=active]:text-white',
              )}
            >
              Shared with me{' '}
              {lastLoaded ? (
                <span className="text-secondary ml-1 font-normal">0</span>
              ) : (
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my-apps" className="overflow-y-auto max-h-[230px]">
            <div className="flex flex-col">
              {myApps.map((conversation, index) => (
                <a key={conversation.id} href={`/chat/${conversation.id}`}>
                  <div
                    className={`flex items-center justify-between py-4 px-1 bg-transparent cursor-pointer transition-colors ${
                      index < myApps.length - 1 ? 'border-b border-depth-4' : ''
                    }`}
                  >
                    <div>
                      <p className="text-primary font-normal">{conversation.description}</p>
                      <p className="text-sm text-tertiary">
                        Edited {formatDistance(new Date(conversation.editedAt), new Date())} ago
                      </p>
                    </div>
                    <ChevronRight className="text-secondary" />
                  </div>
                </a>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
