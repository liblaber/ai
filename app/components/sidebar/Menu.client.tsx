import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { chatId, useConversationHistory } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { openSettingsPanel, settingsPanelStore } from '~/lib/stores/settings';
import { deleteConversation, getConversations, type SimpleConversationResponse } from '~/lib/persistence/conversations';

const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    left: '-340px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: SimpleConversationResponse } | null;

function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800/50">
      <div className="h-4 w-4 i-lucide:clock opacity-80" />
      <div className="flex gap-2">
        <span>{dateTime.toLocaleDateString()}</span>
        <span>{dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export const Menu = () => {
  const { exportChat } = useConversationHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<SimpleConversationResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const { isOpen } = useStore(settingsPanelStore);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: conversations,
    searchFields: ['description'],
  });

  const loadEntries = () => {
    getConversations()
      .then(setConversations)
      .catch((error) => toast.error(error.message));
  };

  const deleteItem = useCallback((event: React.UIEvent, item: SimpleConversationResponse) => {
    event.preventDefault();

    deleteConversation(item.id)
      .then(() => {
        loadEntries();

        if (chatId.get() === item.id) {
          // hard page navigation to clear the stores
          window.location.pathname = '/';
        }
      })
      .catch((error) => {
        toast.error('Failed to delete conversation');
        logger.error(error);
      });
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  useEffect(() => {
    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (isOpen) {
        return;
      }

      if (event.pageX < enterThreshold) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        setOpen(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isOpen]);

  const handleDeleteClick = (event: React.UIEvent, item: SimpleConversationResponse) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleSettingsClick = () => {
    openSettingsPanel();
  };

  return (
    <>
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={menuVariants}
        style={{ width: '340px' }}
        className={classNames(
          'flex selection-accent flex-col side-menu fixed top-0 h-full',
          'bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800/50',
          'shadow-sm text-sm',
          isOpen ? 'z-40' : 'z-sidebar',
        )}
      >
        <CurrentDateTime />
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          <div className="p-4 space-y-3">
            <a
              href="/"
              className="flex gap-2 items-center bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-500/20 rounded-lg px-4 py-2 transition-colors"
            >
              <span className="inline-block i-ph:chat-circle-duotone h-4 w-4" />
              <span className="text-sm font-medium">Start new chat</span>
            </a>
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-100">
                <div className="i-ph:magnifying-glass h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                className="w-full bg-gray-100  dark:bg-gray-900 relative pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-800"
                type="search"
                placeholder="Search chats..."
                onChange={handleSearchChange}
                aria-label="Search chats"
              />
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-2">Your Chats</div>
          <div className="flex-1 overflow-auto px-3 pb-3">
            {filteredList.length === 0 && (
              <div className="px-4 text-gray-500 dark:text-gray-400 text-sm">
                {conversations.length === 0 ? 'No previous conversations' : 'No matches found'}
              </div>
            )}
            <DialogRoot open={dialogContent !== null}>
              {binDates(filteredList).map(({ category, items }) => (
                <div key={category} className="mt-2 first:mt-0 space-y-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 sticky top-0 z-1 bg-white dark:bg-gray-950 px-4 py-1">
                    {category}
                  </div>
                  <div className="space-y-0.5 pr-1">
                    {items.map((item) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        exportChat={exportChat}
                        onDelete={(event) => handleDeleteClick(event, item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                {dialogContent?.type === 'delete' && (
                  <>
                    <div className="p-6 bg-white dark:bg-gray-950">
                      <DialogTitle className="text-gray-900 dark:text-white">Delete Chat?</DialogTitle>
                      <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                        <p>
                          You are about to delete{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dialogContent.item.description || 'Untitled conversation'}
                          </span>
                        </p>
                        <p className="mt-2">Are you sure you want to delete this chat?</p>
                      </DialogDescription>
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 bg-gray-100  dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        Cancel
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={(event) => {
                          deleteItem(event, dialogContent.item);
                          closeDialog();
                        }}
                      >
                        Delete
                      </DialogButton>
                    </div>
                  </>
                )}
              </Dialog>
            </DialogRoot>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <SettingsButton onClick={handleSettingsClick} />
          </div>
        </div>
      </motion.div>

      <ControlPanel />
    </>
  );
};
