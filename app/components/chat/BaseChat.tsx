/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState } from 'react';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { Menu } from '~/components/sidebar/Menu.client';
import { Workbench, WorkbenchProvider } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Messages } from './Messages.client';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { DataSourceChangeWarningModal } from './DataSourceChangeWarningModal';
import { toast } from 'sonner';
import { chatId } from '~/lib/persistence/useConversationHistory';
import { updateConversation } from '~/lib/persistence/conversations';

import type { CodeError } from '~/types/actions';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { ChatTextarea } from './ChatTextarea';
import { AUTOFIX_ATTEMPT_EVENT } from '~/lib/error-handler';
import { useSession } from '~/auth/auth-client';
import type { SendMessageFn } from './Chat.client';
import { workbenchStore } from '~/lib/stores/workbench';
import { type BrowserInfo, detectBrowser } from '~/lib/utils/browser-detection';
import { BrowserCompatibilityModal } from '~/components/ui/BrowserCompatibilityModal';
import { getDataSourceProperties } from '~/components/@settings/utils/data-sources';
import { updateLatestSnapshot } from '~/lib/persistence/snapshots';
import { MessageRole } from '~/utils/constants';
import { logger } from '~/utils/logger';

export interface PendingPrompt {
  input: string;
  files: string[];
  images: string[];
  environmentDataSource: { dataSourceId: string | null; environmentId: string | null };
}

const TEXTAREA_MIN_HEIGHT = 100;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  input?: string;
  handleStop?: () => void;
  sendMessage?: SendMessageFn;
  sendAutofixMessage?: (message: string) => Promise<void>;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  data?: JSONValue[] | undefined;
  error?: Error;
  actionRunner?: ActionRunner;
  onSyncFiles?: () => Promise<void>;
  setMessages: (messages: Message[]) => void;
  onRetry: (errorMessage: string) => Promise<void>;
}

export const BaseChat = ({
  textareaRef,
  messageRef,
  scrollRef,
  showChat = true,
  chatStarted = false,
  isStreaming = false,
  onStreamingChange,
  input = '',
  handleInputChange,
  sendMessage,
  sendAutofixMessage,
  handleStop,
  uploadedFiles = [],
  setUploadedFiles,
  imageDataList = [],
  setImageDataList,
  messages,
  data,
  actionRunner,
  onSyncFiles,
  setMessages,
  onRetry,
  error,
}: BaseChatProps) => {
  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
  const { environmentDataSources } = useEnvironmentDataSourcesStore();
  const { data: session } = useSession();

  const [showDataSourceChangeModal, setShowDataSourceChangeModal] = useState(false);
  const [pendingDataSourceChange, setPendingDataSourceChange] = useState<{
    dataSourceId: string;
    environmentId: string;
    dataSourceName: string;
    environmentName: string;
  } | null>(null);
  const [isUpdatingDataSource, setIsUpdatingDataSource] = useState(false);

  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() => ({
    name: 'Other',
    version: 'unknown',
    supportsWebContainers: true,
  }));

  useEffect(() => {
    setBrowserInfo(detectBrowser());
  }, []);

  // Data source change handlers
  const handleDataSourceChangeRequest = (
    dataSourceId: string,
    environmentId: string,
    dataSourceName: string,
    environmentName: string,
  ) => {
    setPendingDataSourceChange({
      dataSourceId,
      environmentId,
      dataSourceName,
      environmentName,
    });
    setShowDataSourceChangeModal(true);
  };

  const handleDataSourceChangeConfirm = async () => {
    if (!pendingDataSourceChange) {
      setShowDataSourceChangeModal(false);
      setPendingDataSourceChange(null);

      return;
    }

    setIsUpdatingDataSource(true);

    try {
      const dataSourceProperties = await getDataSourceProperties(
        pendingDataSourceChange.dataSourceId,
        pendingDataSourceChange.environmentId,
      );

      let updatedEnvContent: string = '';

      for (const dataSourceProperty of dataSourceProperties) {
        const encodedPropertyValue = encodeURIComponent(dataSourceProperty.value);
        updatedEnvContent = await ActionRunner.updateEnvironmentVariable(dataSourceProperty.type, encodedPropertyValue);
      }

      const { setSelectedEnvironmentDataSource } = useEnvironmentDataSourcesStore.getState();
      setSelectedEnvironmentDataSource(pendingDataSourceChange.dataSourceId, pendingDataSourceChange.environmentId);

      const currentChatId = chatId.get();

      if (currentChatId) {
        try {
          await updateConversation(currentChatId, {
            environmentId: pendingDataSourceChange.environmentId,
            dataSourceId: pendingDataSourceChange.dataSourceId,
          });

          const lastUserMessage = messages
            ?.slice()
            .reverse()
            .find((msg) => msg.role === MessageRole.User);

          if (lastUserMessage?.id && updatedEnvContent) {
            await updateLatestSnapshot(currentChatId, '.env', updatedEnvContent);
          }
        } catch (error) {
          logger.error(error);
          toast.error("Failed to update the conversation's data source.");
        }
      }

      toast.success('Data source changed successfully. Please restart your application.');
    } catch (error) {
      console.error('Failed to change data source:', error);
      toast.error('Failed to change data source. Please try again.');
    } finally {
      setIsUpdatingDataSource(false);
      setShowDataSourceChangeModal(false);
      setPendingDataSourceChange(null);
    }
  };

  const handleDataSourceChangeCancel = () => {
    setShowDataSourceChangeModal(false);
    setPendingDataSourceChange(null);
  };

  useEffect(() => {
    if (data) {
      const progressList = data.filter(
        (x) => typeof x === 'object' && (x as any).type === 'progress',
      ) as ProgressAnnotation[];

      if (error && progressList.length) {
        progressList[progressList.length - 1] = { ...progressList.at(-1)!, status: 'error' };
      }

      setProgressAnnotations(progressList);
    }
  }, [data, error]);

  useEffect(() => {
    onStreamingChange?.(isStreaming);

    if (isStreaming && input) {
      handleInputChange?.({
        target: { value: '' },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  }, [isStreaming, onStreamingChange]);

  const handleSendMessage = async (
    event: React.UIEvent,
    messageInput?: string,
    pendingUploadedFiles?: File[],
    pendingImageDataList?: string[],
  ) => {
    if (sendMessage) {
      const message = messageInput || input;
      workbenchStore.clearCodeErrors();

      await sendMessage(event, message, false, pendingUploadedFiles, pendingImageDataList);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;

    if (!items) {
      return;
    }

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();

        if (file) {
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;
            setUploadedFiles?.([...uploadedFiles, file]);
            setImageDataList?.([...imageDataList, base64Image]);
          };
          reader.readAsDataURL(file);
        }

        break;
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!environmentDataSources.length) {
      return;
    }

    const pendingPromptStr = sessionStorage.getItem('pendingPrompt');

    if (!pendingPromptStr) {
      return;
    }

    if (chatStarted) {
      return;
    }

    try {
      const pendingPrompt = JSON.parse(pendingPromptStr) as PendingPrompt;

      if (!pendingPrompt.input) {
        sessionStorage.removeItem('pendingPrompt');
        return;
      }

      const syntheticEvent = {
        target: { value: pendingPrompt.input },
      };
      handleInputChange?.(syntheticEvent as React.ChangeEvent<HTMLTextAreaElement>);

      if (pendingPrompt.files && pendingPrompt.images) {
        const files = pendingPrompt.files.map((name: string, index: number) => {
          const base64Data = pendingPrompt.images[index];
          const byteString = atob(base64Data.split(',')[1]);
          const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);

          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }

          return new File([ab], name, { type: mimeString });
        });

        setUploadedFiles?.(files);
        setImageDataList?.(pendingPrompt.images);

        void handleSendMessage({} as React.UIEvent, pendingPrompt.input, files, pendingPrompt.images);
      } else {
        void handleSendMessage({} as React.UIEvent, pendingPrompt.input);
      }
    } catch (e) {
      console.error('Failed to parse pending prompt:', e);
    } finally {
      sessionStorage.removeItem('pendingPrompt');
    }
  }, [environmentDataSources]);

  useEffect(() => {
    const handleAutofixAttempt = ({ detail: { errors } }: CustomEvent<{ errors: CodeError[] }>) => {
      if (isStreaming || !sendAutofixMessage) {
        return;
      }

      void sendAutofixMessage?.(workbenchStore.getFixErrorsMessageText(errors));
    };

    window.addEventListener(AUTOFIX_ATTEMPT_EVENT, handleAutofixAttempt as EventListener);

    return () => {
      window.removeEventListener(AUTOFIX_ATTEMPT_EVENT, handleAutofixAttempt as EventListener);
    };
  }, [sendAutofixMessage]);

  const baseChat = (
    <div
      className={classNames('BaseChat relative flex h-full w-full overflow-hidden')}
      data-chat-visible={showChat.toString()}
    >
      {session?.user && <Menu />}
      <div
        ref={scrollRef}
        className={classNames('flex flex-col lg:flex-row overflow-y-auto w-full h-full', {
          '!h-[90vh]': !chatStarted,
        })}
      >
        <div
          className={classNames('flex flex-col flex-grow max-w-chat-width h-full', {
            'data-[chat-visible=false]:transition-all data-[chat-visible=false]:duration-300 data-[chat-visible=false]:will-change-transform data-[chat-visible=false]:will-change-opacity data-[chat-visible=false]:-translate-x-1/2 data-[chat-visible=false]:opacity-0': true,
            'opacity-100': true,
          })}
        >
          <div
            className={classNames('pt-4 pl-4 pr-1', {
              'h-full flex flex-col': chatStarted,
            })}
            ref={scrollRef}
          >
            {chatStarted && (
              <ClientOnly>
                {() => (
                  <Messages
                    ref={messageRef}
                    className="flex flex-col w-full flex-1 gap-2 max-w-chat-width mx-auto rounded-xl overflow-y-scroll z-1"
                    messages={messages}
                    isStreaming={isStreaming}
                    setMessages={setMessages}
                    error={error}
                    onRetry={onRetry}
                  />
                )}
              </ClientOnly>
            )}

            <div
              className={classNames('flex flex-col gap-4 w-full mx-auto z-prompt mb-6 mt-4', {
                'sticky bottom-2 max-w-chat-width': chatStarted,
                'max-w-homepage-textarea': !chatStarted,
              })}
            >
              {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
              {chatStarted && (
                <ChatTextarea
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  imageDataList={imageDataList}
                  setImageDataList={setImageDataList}
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => handleInputChange?.(e)}
                  onKeyDown={async (event) => {
                    if (event.key === 'Enter') {
                      if (event.shiftKey) {
                        return;
                      }

                      event.preventDefault();

                      if (isStreaming) {
                        handleStop?.();
                        return;
                      }

                      if (event.nativeEvent.isComposing) {
                        return;
                      }

                      await handleSendMessage?.(event);
                    }
                  }}
                  onPaste={handlePaste}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).style.border = '2px solid #1488fc';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).style.border = '2px solid #1488fc';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).style.border = '1px solid rgb(30 33 37)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).style.border = '1px solid rgb(30 33 37)';

                    const files = Array.from(e.dataTransfer.files);
                    files.forEach((file) => {
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();

                        reader.onload = (e) => {
                          const base64Image = e.target?.result as string;
                          setUploadedFiles?.([...uploadedFiles, file]);
                          setImageDataList?.([...imageDataList, base64Image]);
                        };
                        reader.readAsDataURL(file);
                      }
                    });
                  }}
                  minHeight={TEXTAREA_MIN_HEIGHT}
                  maxHeight={TEXTAREA_MAX_HEIGHT}
                  onSend={handleSendMessage}
                  isStreaming={isStreaming}
                  handleStop={handleStop}
                  onDataSourceChange={handleDataSourceChangeRequest}
                />
              )}
            </div>
          </div>
        </div>
        <ClientOnly>
          {() => (
            <WorkbenchProvider>
              <Workbench
                actionRunner={actionRunner ?? ({} as ActionRunner)}
                chatStarted={chatStarted}
                isStreaming={isStreaming}
                onSyncFiles={onSyncFiles}
                sendMessage={sendMessage}
              />
            </WorkbenchProvider>
          )}
        </ClientOnly>
      </div>

      {/* Browser Compatibility Modal */}
      <BrowserCompatibilityModal isOpen={!browserInfo.supportsWebContainers} />

      {/* Data Source Change Warning Modal */}
      <DataSourceChangeWarningModal
        isOpen={showDataSourceChangeModal}
        onClose={handleDataSourceChangeCancel}
        onConfirm={handleDataSourceChangeConfirm}
        newDataSourceName={pendingDataSourceChange?.dataSourceName || ''}
        newEnvironmentName={pendingDataSourceChange?.environmentName || ''}
        isLoading={isUpdatingDataSource}
      />
    </div>
  );

  return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
};
