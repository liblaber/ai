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
import { useDataSourcesStore } from '~/lib/stores/dataSources';

import type { CodeError } from '~/types/actions';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { ChatTextarea } from './ChatTextarea';
import { AUTOFIX_ATTEMPT_EVENT } from '~/lib/error-handler';
import { useSession } from '~/auth/auth-client';
import type { SendMessageFn } from './Chat.client';
import { workbenchStore } from '~/lib/stores/workbench';
import { detectBrowser } from '~/lib/utils/browser-detection';

export interface PendingPrompt {
  input: string;
  files: string[];
  images: string[];
  dataSourceId: string | null;
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
  const { dataSources } = useDataSourcesStore();
  const { data: session } = useSession();
  const [browserInfo] = useState(() => detectBrowser());

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

    if (!dataSources.length) {
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
  }, [dataSources]);

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
    <div className={classNames('BaseChat relative flex h-full w-full overflow-hidden')} data-chat-visible={showChat}>
      {/* Universal Browser Compatibility Notice */}
      {!browserInfo.supportsWebContainers && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-3 z-50">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center">
              <div className="text-blue-600 mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Limited Browser Support</h4>
                <p className="text-xs text-blue-800">
                  This browser has limited WebContainer functionality. For the best experience, use Chrome or Edge.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const currentUrl = window.location.href;

                if (confirm('Would you like to copy the URL to open in Chrome for full functionality?')) {
                  navigator.clipboard
                    .writeText(currentUrl)
                    .then(() => {
                      alert('URL copied to clipboard! Paste it in Chrome for full functionality.');
                    })
                    .catch(() => {
                      prompt('Copy this URL to open in Chrome:', currentUrl);
                    });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center flex-shrink-0"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000-16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Open in Chrome
            </button>
          </div>
        </div>
      )}
      {session?.user && <Menu />}
      <div
        ref={scrollRef}
        className={classNames('flex flex-col lg:flex-row overflow-y-auto w-full h-full', {
          '!h-90vh': !chatStarted,
          'pt-16': !browserInfo.supportsWebContainers, // Add padding when banner is visible
        })}
      >
        <div className={classNames('Chat flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
          <div
            className={classNames('pt-6 px-2 sm:px-4', {
              'h-full flex flex-col': chatStarted,
            })}
            ref={scrollRef}
          >
            {chatStarted && (
              <ClientOnly>
                {() => (
                  <Messages
                    ref={messageRef}
                    className="flex flex-col w-full flex-1 max-w-chat mx-auto rounded-xl overflow-y-scroll z-1"
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
                'sticky bottom-2 max-w-chat': chatStarted,
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
                    (e.currentTarget as HTMLTextAreaElement).style.border =
                      '1px solid var(--liblab-elements-borderColor)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLTextAreaElement).style.border =
                      '1px solid var(--liblab-elements-borderColor)';

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
    </div>
  );

  return <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>;
};
