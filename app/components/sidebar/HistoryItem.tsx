import type { ForwardedRef } from 'react';
import { forwardRef } from 'react';
import { useParams } from 'next/navigation';
import { Check, Copy, Download, Edit, Trash } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import WithTooltip from '~/components/ui/Tooltip';
import { classNames } from '~/utils/classNames';
import { useEditChatDescription } from '~/lib/hooks';
import type { SimpleConversationResponse } from '~/lib/persistence/conversations';
import Link from 'next/link';

interface HistoryItemProps {
  item: SimpleConversationResponse;
  onDelete?: (event: React.UIEvent) => void;
  onDuplicate?: (id: string) => void;
  exportChat: (id?: string) => void;
}

export function HistoryItem({ item, onDelete, onDuplicate, exportChat }: HistoryItemProps) {
  const params = useParams();
  const chatId = params?.id as string;
  const isActiveChat = chatId === item.id;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription: item.description || 'Untitled conversation',
      customChatId: item.id,
      syncWithGlobalStore: isActiveChat,
    });

  return (
    <div
      className={classNames(
        'group rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/80 dark:hover:bg-gray-800/30 overflow-hidden flex justify-between items-center px-3 py-2 transition-colors',
        { 'text-gray-900 dark:text-white bg-gray-50/80 dark:bg-gray-800/30': isActiveChat },
      )}
    >
      {editing ? (
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-md px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
            autoFocus
            value={currentDescription}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="h-4 w-4 text-gray-500 hover:text-accent-500 transition-colors"
            onMouseDown={handleSubmit}
          >
            <Check className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <Link href={`/chat/${item.id}`} className="flex w-full relative truncate block">
          <WithTooltip tooltip={currentDescription}>
            <span className="truncate pr-24">{currentDescription}</span>
          </WithTooltip>
          <div className={classNames('absolute right-0 top-0 bottom-0 flex items-center px-2')}>
            <div className="flex items-center gap-2.5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChatActionButton
                toolTipContent="Export"
                icon={<Download className="h-4 w-4" />}
                onClick={(event) => {
                  event.preventDefault();
                  exportChat(item.id);
                }}
              />
              {onDuplicate && (
                <ChatActionButton
                  toolTipContent="Duplicate"
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => onDuplicate?.(item.id)}
                />
              )}
              <ChatActionButton
                toolTipContent="Rename"
                icon={<Edit className="h-4 w-4" />}
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              />
              <Dialog.Trigger asChild>
                <ChatActionButton
                  toolTipContent="Delete"
                  icon={<Trash className="h-4 w-4" />}
                  className="hover:text-red-500"
                  onClick={(event) => {
                    event.preventDefault();
                    onDelete?.(event);
                  }}
                />
              </Dialog.Trigger>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}

const ChatActionButton = forwardRef(
  (
    {
      toolTipContent,
      icon,
      className,
      onClick,
    }: {
      toolTipContent: string;
      icon: React.ReactNode;
      className?: string;
      onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
      btnTitle?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <WithTooltip tooltip={toolTipContent} position="bottom" sideOffset={4}>
        <button
          ref={ref}
          type="button"
          className={`text-gray-400 dark:text-gray-500 hover:text-accent-500 dark:hover:text-accent-400 cursor-pointer transition-colors ${className ? className : ''}`}
          onClick={onClick}
        >
          {icon}
        </button>
      </WithTooltip>
    );
  },
);
