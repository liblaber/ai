import { useStore } from '@nanostores/react';
import { type HTMLMotionProps, motion, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Popover, Transition } from '@headlessui/react';
import { type Change, diffLines } from 'diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import type { FileHistory } from '~/types/actions';
import { DiffView } from './DiffView';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import { useGitStore } from '~/lib/stores/git';
import { chatId } from '~/lib/persistence';
import type { SendMessageFn } from '~/components/chat/Chat.client';
import {
  MonitorPlay,
  CodeXml,
  FileText,
  Paintbrush,
  Braces,
  Database,
  Box,
  Terminal,
  Loader2,
  Github,
  Search,
  Download,
  GitBranch,
  CheckCircle,
} from 'lucide-react';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  actionRunner: ActionRunner;
  onSyncFiles?: () => Promise<void>;
  sendMessage?: SendMessageFn;
}

const viewTransition = { ease: cubicEasingFn };

const workbenchVariants = {
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

const FileModifiedDropdown = memo(
  ({
    fileHistory,
    onSelectFile,
  }: {
    fileHistory: Record<string, FileHistory>;
    onSelectFile: (filePath: string) => void;
  }) => {
    const modifiedFiles = Object.entries(fileHistory);
    const hasChanges = modifiedFiles.length > 0;
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = useMemo(() => {
      return modifiedFiles.filter(([filePath]) => filePath.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [modifiedFiles, searchQuery]);

    return (
      <div className="flex items-center gap-2">
        <Popover className="relative">
          {({ open }: { open: boolean }) => (
            <>
              <Popover.Button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-depth-2 hover:bg-depth-3 transition-colors text-primary border border-depth-3">
                <span className="font-medium">File Changes</span>
                {hasChanges && (
                  <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 text-xs flex items-center justify-center border border-accent-500/30">
                    {modifiedFiles.length}
                  </span>
                )}
              </Popover.Button>
              <Transition
                show={open}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Popover.Panel className="absolute right-0 z-20 mt-2 w-80 origin-top-right rounded-xl bg-depth-2 shadow-xl border border-depth-3">
                  <div className="p-2">
                    <div className="relative mx-2 mb-2">
                      <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-depth-1 border border-depth-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-tertiary">
                        <Search className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(([filePath, history]) => {
                          const extension = filePath.split('.').pop() || '';
                          const language = getLanguageFromExtension(extension);

                          return (
                            <button
                              key={filePath}
                              onClick={() => onSelectFile(filePath)}
                              className="w-full px-3 py-2 text-left rounded-md hover:bg-depth-1 transition-colors group bg-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <div className="shrink-0 w-5 h-5 text-tertiary">
                                  {['typescript', 'javascript', 'jsx', 'tsx'].includes(language) && (
                                    <FileText className="w-5 h-5" />
                                  )}
                                  {['css', 'scss', 'less'].includes(language) && <Paintbrush className="w-5 h-5" />}
                                  {language === 'html' && <CodeXml className="w-5 h-5" />}
                                  {language === 'json' && <Braces className="w-5 h-5" />}
                                  {language === 'python' && <FileText className="w-5 h-5" />}
                                  {language === 'markdown' && <FileText className="w-5 h-5" />}
                                  {['yaml', 'yml'].includes(language) && <FileText className="w-5 h-5" />}
                                  {language === 'sql' && <Database className="w-5 h-5" />}
                                  {language === 'dockerfile' && <Box className="w-5 h-5" />}
                                  {language === 'shell' && <Terminal className="w-5 h-5" />}
                                  {![
                                    'typescript',
                                    'javascript',
                                    'css',
                                    'html',
                                    'json',
                                    'python',
                                    'markdown',
                                    'yaml',
                                    'yml',
                                    'sql',
                                    'dockerfile',
                                    'shell',
                                    'jsx',
                                    'tsx',
                                    'scss',
                                    'less',
                                  ].includes(language) && <FileText className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate text-sm font-medium text-primary">
                                        {filePath.split('/').pop()}
                                      </span>
                                      <span className="truncate text-xs text-tertiary">{filePath}</span>
                                    </div>
                                    {(() => {
                                      // Calculate diff stats
                                      const { additions, deletions } = (() => {
                                        if (!history.originalContent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
                                        const normalizedCurrent =
                                          history.versions[history.versions.length - 1]?.content.replace(
                                            /\r\n/g,
                                            '\n',
                                          ) || '';

                                        if (normalizedOriginal === normalizedCurrent) {
                                          return { additions: 0, deletions: 0 };
                                        }

                                        const changes = diffLines(normalizedOriginal, normalizedCurrent, {
                                          newlineIsToken: false,
                                          ignoreWhitespace: true,
                                          ignoreCase: false,
                                        });

                                        return changes.reduce(
                                          (acc: { additions: number; deletions: number }, change: Change) => {
                                            if (change.added) {
                                              acc.additions += change.value.split('\n').length;
                                            }

                                            if (change.removed) {
                                              acc.deletions += change.value.split('\n').length;
                                            }

                                            return acc;
                                          },
                                          { additions: 0, deletions: 0 },
                                        );
                                      })();

                                      const showStats = additions > 0 || deletions > 0;

                                      return (
                                        showStats && (
                                          <div className="flex items-center gap-1 text-xs shrink-0">
                                            {additions > 0 && <span className="text-green-500">+{additions}</span>}
                                            {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
                                          </div>
                                        )
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-12 h-12 mb-2 text-tertiary">
                            <FileText className="w-12 h-12" />
                          </div>
                          <p className="text-sm font-medium text-primary">
                            {searchQuery ? 'No matching files' : 'No modified files'}
                          </p>
                          <p className="text-xs text-tertiary mt-1">
                            {searchQuery ? 'Try another search' : 'Changes will appear here as you edit'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="border-t border-depth-3 p-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(filteredFiles.map(([filePath]) => filePath).join('\n'));
                          toast('File list copied to clipboard', {
                            icon: <CheckCircle className="w-4 h-4 text-accent-500" />,
                          });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-depth-1 hover:bg-depth-3 transition-colors text-tertiary hover:text-primary"
                      >
                        Copy File List
                      </button>
                    </div>
                  )}
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  },
);

// WorkbenchProvider component to ensure workbench store is initialized
export const WorkbenchProvider = ({ children }: { children: React.ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workbenchStore
      .initialize()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error('Failed to initialize workbench store:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    toast.error(`Failed to initialize workbench store. If this error persists, please contact support.`);
    console.error(JSON.stringify(error, null, 2));

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Failed to initialize workbench: {error}</div>
      </div>
    );
  }

  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
};

export const Workbench = memo(
  ({ chatStarted, isStreaming, actionRunner, onSyncFiles, sendMessage }: WorkspaceProps) => {
    renderLogger.trace('Workbench');

    const [isSyncing, setIsSyncing] = useState(false);
    const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
    const [fileHistory, setFileHistory] = useState<Record<string, FileHistory>>({});
    const currentChatId = chatId.get();
    const gitMetadata = useGitStore((state) => (currentChatId ? state.getGitMetadata(currentChatId) : null));

    const isGitConnected = gitMetadata?.gitUrl && !gitMetadata.isDisconnected;

    const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
    const devMode = useStore(workbenchStore.devMode);
    const selectedFile = useStore(workbenchStore.selectedFile);
    const currentDocument = useStore(workbenchStore.currentDocument);
    const unsavedFiles = useStore(workbenchStore.unsavedFiles);
    const files = useStore(workbenchStore.files);
    const selectedView = useStore(workbenchStore.currentView);

    const isSmallViewport = useViewport(1024);

    const setSelectedView = (view: WorkbenchViewType) => {
      workbenchStore.currentView.set(view);
    };

    useEffect(() => {
      if (hasPreview) {
        setSelectedView('preview');
      }
    }, [hasPreview]);

    useEffect(() => {
      workbenchStore.setDocuments(files);
    }, [files]);

    const onEditorChange = useCallback<OnEditorChange>((update) => {
      workbenchStore.setCurrentDocumentContent(update.content);
    }, []);

    const onEditorScroll = useCallback<OnEditorScroll>((position) => {
      workbenchStore.setCurrentDocumentScrollPosition(position);
    }, []);

    const onFileSelect = useCallback((filePath: string | undefined) => {
      workbenchStore.setSelectedFile(filePath);
    }, []);

    const onFileSave = useCallback(() => {
      workbenchStore.saveCurrentDocument().catch(() => {
        toast.error('Failed to update file content');
      });
    }, []);

    const onFileReset = useCallback(() => {
      workbenchStore.resetCurrentDocument();
    }, []);

    const handleSyncFiles = useCallback(async () => {
      if (!onSyncFiles) {
        return;
      }

      setIsSyncing(true);

      try {
        await onSyncFiles();
        toast.success('Files synced successfully');
      } catch (error) {
        console.error('Error syncing files:', error);
        toast.error('Failed to sync files');
      } finally {
        setIsSyncing(false);
      }
    }, []);

    const handleSelectFile = useCallback((filePath: string) => {
      workbenchStore.setSelectedFile(filePath);
      workbenchStore.currentView.set('diff');
    }, []);

    const diffViewX = useMemo(() => {
      if (!devMode) {
        return '-100%';
      }

      switch (selectedView) {
        case 'diff':
          return '0%';
        case 'code':
          return '100%';
        default:
          return '-100%';
      }
    }, [devMode, selectedView]);

    return (
      chatStarted && (
        <motion.div animate={'open'} variants={workbenchVariants} className="z-workbench">
          <div
            className={classNames(
              'fixed top-[calc(var(--header-height)+1rem)] bottom-6 w-[var(--workbench-inner-width)] mr-4 z-0 transition-[left,width] duration-200 liblab-ease-cubic-bezier left-[var(--workbench-left)]',
              {
                'w-full': isSmallViewport,
                'left-0': isSmallViewport,
              },
            )}
          >
            <div className="absolute inset-0 pl-2 pr-4">
              <div className="h-full flex flex-col bg-depth-2 border border-depth-3 shadow-sm rounded-xl overflow-hidden">
                <div className="flex items-center px-3 py-1 h-12 border-b border-depth-3">
                  <Slider selected={selectedView} setSelected={setSelectedView} />
                  <div className="ml-auto" />
                  {devMode && selectedView === 'code' && (
                    <div className="flex overflow-y-auto">
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        title="Show/hide terminal panel"
                        onClick={() => {
                          workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                        }}
                      >
                        <Terminal className="w-4 h-4" />
                        Toggle Terminal
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        title="Download project as ZIP file"
                        onClick={() => {
                          workbenchStore.downloadZip();
                        }}
                      >
                        <Download className="w-4 h-4" />
                        Download Code
                      </PanelHeaderButton>
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        title={!isGitConnected ? 'Connect to GitHub repository' : 'Manage GitHub repository'}
                        onClick={() => setIsPushDialogOpen(true)}
                      >
                        <GitBranch className="w-4 h-4" />
                        {(() => {
                          if (!isGitConnected) {
                            return 'Connect GitHub';
                          }

                          const repoName = gitMetadata.gitUrl.split('/').pop()?.replace('.git', '');

                          return repoName || 'GitHub';
                        })()}
                      </PanelHeaderButton>
                      {isGitConnected && (
                        <PanelHeaderButton
                          className="mr-1 text-sm"
                          title="Sync local changes with GitHub repository"
                          onClick={handleSyncFiles}
                          disabled={isSyncing}
                        >
                          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                          {isSyncing ? 'Syncing...' : 'Sync Files'}
                        </PanelHeaderButton>
                      )}
                    </div>
                  )}
                  {devMode && selectedView === 'diff' && (
                    <FileModifiedDropdown fileHistory={fileHistory} onSelectFile={handleSelectFile} />
                  )}
                  <PanelHeaderButton
                    className="mr-1 text-sm"
                    title={devMode ? 'Switch to preview mode' : 'Switch to code editor'}
                    onClick={() => {
                      workbenchStore.devMode.set(!devMode);
                      workbenchStore.currentView.set(devMode ? 'preview' : 'code');
                    }}
                  >
                    {devMode ? <MonitorPlay className="w-4 h-4" /> : <CodeXml className="w-4 h-4" />}
                    {devMode ? 'Exit Code View' : 'Enter Code View'}
                  </PanelHeaderButton>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <View initial={{ x: '0%' }} animate={{ x: devMode && selectedView === 'code' ? '0%' : '-100%' }}>
                    <EditorPanel
                      editorDocument={currentDocument}
                      isStreaming={isStreaming}
                      selectedFile={selectedFile}
                      files={files}
                      unsavedFiles={unsavedFiles}
                      fileHistory={fileHistory}
                      onFileSelect={onFileSelect}
                      onEditorScroll={onEditorScroll}
                      onEditorChange={onEditorChange}
                      onFileSave={onFileSave}
                      onFileReset={onFileReset}
                    />
                  </View>
                  <View initial={{ x: '100%' }} animate={{ x: diffViewX }}>
                    <DiffView fileHistory={fileHistory} setFileHistory={setFileHistory} actionRunner={actionRunner} />
                  </View>
                  <View initial={{ x: '100%' }} animate={{ x: selectedView === 'preview' ? '0%' : '100%' }}>
                    <Preview sendMessage={sendMessage} />
                  </View>
                </div>
              </div>
            </div>
          </div>
          <PushToGitHubDialog
            isOpen={isPushDialogOpen}
            onClose={() => setIsPushDialogOpen(false)}
            onPush={async (repoName, username, token, isPrivate) => {
              try {
                await workbenchStore.pushToGitHub(repoName, username, token, isPrivate);

                const repoUrl = `https://github.com/${username}/${repoName}`;
                toast.success(`Your code is pushed to: ${repoUrl}`);

                if (currentChatId) {
                  const existingMetadata = useGitStore.getState().getGitMetadata(currentChatId);

                  if (existingMetadata?.isDisconnected) {
                    useGitStore.getState().reconnectRepository(currentChatId);
                  }
                }

                return repoUrl;
              } catch (error) {
                console.error('Error pushing to GitHub:', error);
                toast.error('Failed to push to GitHub');
                throw error;
              }
            }}
          />
        </motion.div>
      )
    );
  },
);

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
