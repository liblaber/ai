'use client';

/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMessageParser, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { chatId, description, updateNavigationChat, useConversationHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { FIX_ANNOTATION, MessageRole, PROMPT_COOKIE_KEY } from '~/utils/constants';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import { createSampler } from '~/utils/sampler';
import { getStarterTemplateFiles, getStarterTemplateMessages } from '~/utils/selectStarterTemplate';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { type Message, useChat } from '@ai-sdk/react';
import { generateId } from 'ai';
import { useGitPullSync } from '~/lib/stores/git';
import { createConversation, getMessageSnapshotId } from '~/lib/persistence/conversations';
import { extractArtifactTitleFromMessageContent } from '~/utils/artifactMapper';
import { createCommandsMessage, detectProjectCommands } from '~/utils/projectCommands';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { createId } from '@paralleldrive/cuid2';
import { getLatestSnapshotOrNull, saveSnapshot } from '~/lib/persistence/snapshots';
import { loadPreviousFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';
import type { FileMap } from '~/lib/stores/files';
import { useTrackStreamProgress } from '~/components/chat/useTrackStreamProgress';
import type { ProgressAnnotation } from '~/types/context';
import { trackTelemetryEvent } from '~/lib/telemetry/telemetry-client';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import type { DataSourcePropertyType } from '~/lib/datasource';
import type { DataSourceType } from '@liblab/data-access/utils/types';

export type DataSourcePropertyResponse = {
  type: DataSourcePropertyType;
  value: string;
};

export type DataSourcePropertiesResponse = {
  properties: DataSourcePropertyResponse[];
  dataSourceType: DataSourceType;
};

interface ChatProps {
  id?: string;
  initialMessages: Message[];
  commandMessage?: Message;
  setCommandMessage?: (message: Message) => void;
  storeConversationHistoryAction: (
    latestMessageId: string,
    onSnapshotCreated?: (snapshotId: string, messageId: string) => void,
    artifactTitle?: string,
  ) => Promise<void>;
  exportChatAction: () => void;
  description?: string;
}

export type SendMessageFn = (
  event: React.UIEvent,
  messageInput?: string,
  isFixMessage?: boolean,
  pendingUploadedFiles?: File[],
  pendingImageDataList?: string[],
) => Promise<void>;

const logger = createScopedLogger('Chat');

export function Chat({ id }: { id?: string }) {
  renderLogger.trace('Chat');

  const { ready, initialMessages, commandMessage, setCommandMessage, storeConversationHistory, exportChat } =
    useConversationHistory(id);
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          commandMessage={commandMessage}
          setCommandMessage={setCommandMessage}
          exportChatAction={exportChat}
          storeConversationHistoryAction={storeConversationHistory}
        />
      )}
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
  }) => {
    const { messages, isLoading, parseMessages } = options;
    parseMessages(messages, isLoading);
  },
  50,
);

export const ChatImpl = ({
  description,
  initialMessages,
  commandMessage,
  setCommandMessage,
  storeConversationHistoryAction,
  exportChatAction,
}: ChatProps) => {
  useShortcuts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const [fakeLoading, setFakeLoading] = useState(false);
  const files = useStore(workbenchStore.files);
  const { contextOptimizationEnabled } = useSettings();
  const [dataSourceProperties, setDataSourceProperties] = useState<DataSourcePropertiesResponse>();
  const [shouldUpdateUrl, setShouldUpdateUrl] = useState(false);

  useEffect(() => {
    chatStore.setKey('started', chatStarted);
  }, [chatStarted]);

  const { selectedEnvironmentDataSource } = useEnvironmentDataSourcesStore();

  const { showChat } = useStore(chatStore);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const messagesRef = useRef<Message[]>([]);

  // Update URL when component unmounts or page unloads
  useEffect(() => {
    const updateUrlOnExit = () => updateNavigationChat(chatId.get());

    // Update URL when page is about to unload (user refreshing/leaving)
    window.addEventListener('beforeunload', updateUrlOnExit);

    // Update URL when component unmounts
    return () => {
      window.removeEventListener('beforeunload', updateUrlOnExit);
      updateUrlOnExit();
    };
  }, []);

  // Update URL when shouldUpdateUrl becomes true (after streaming and async operations complete)
  useEffect(() => {
    if (shouldUpdateUrl) {
      updateNavigationChat(chatId.get());
      setShouldUpdateUrl(false);
    }
  }, [shouldUpdateUrl]);

  const {
    messages,
    input,
    handleInputChange,
    setInput,
    stop,
    append,
    setMessages,
    reload,
    error,
    data: chatData,
    status,
    setData,
  } = useChat({
    api: '/api/chat',
    body: {
      apiKeys,
      files,
      promptId: 'apps',
      contextOptimization: contextOptimizationEnabled,
    },
    sendExtraMessageFields: true,
    onError: (e) => {
      logger.error('Request failed', e);
      setFakeLoading(false); // Reset loading state on error
      workbenchStore.previewsStore.isGenerationErrors.set(true);
      toast.error(
        'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
      );

      // Handle error recovery asynchronously to avoid Suspense issues
      setTimeout(async () => {
        try {
          const latestSnapshot = await getLatestSnapshotOrNull(chatId.get()!);
          let fileMapToRevertTo: FileMap;

          if (latestSnapshot) {
            fileMapToRevertTo = latestSnapshot.fileMap;
          } else {
            // For new conversations, try to get starter template but don't fail if it doesn't work
            try {
              fileMapToRevertTo = await getStarterTemplateFiles(dataSourceProperties);
            } catch (starterError) {
              logger.warn('Could not load starter template during error recovery, using empty file map:', starterError);
              fileMapToRevertTo = {};
            }
          }

          await loadPreviousFileMapIntoContainer(fileMapToRevertTo);
        } catch (error) {
          logger.error('Error during error recovery:', error);
        }
      }, 0);
    },
    onFinish: async ({ id, content }) => {
      setData(undefined);
      setFakeLoading(false);

      logger.debug('Finished streaming');

      const artifactTitle = extractArtifactTitleFromMessageContent(content);

      setTimeout(async () => {
        await storeConversationHistoryAction(id, updateMessageWithSnapshot, artifactTitle);

        const isAppRunning = await ActionRunner.isAppRunning();

        if (!isAppRunning) {
          const packageJsonFile = await workbenchStore.syncPackageJsonFile();

          if (packageJsonFile) {
            const projectCommands = detectProjectCommands(packageJsonFile);

            if (projectCommands) {
              setCommandMessage?.(createCommandsMessage(projectCommands));
            }
          }
        }

        // Set flag to update URL after all async operations are complete
        setShouldUpdateUrl(true);
      }, 2000);
    },
    initialMessages,
    initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
  });

  useEffect(() => {
    if (!commandMessage || messagesRef.current.some((message) => message.id === commandMessage.id)) {
      return;
    }

    setTimeout(() => {
      setMessages([...messagesRef.current, commandMessage]);
    }, 2000);
  }, [commandMessage]);

  const isLoading = status === 'streaming';

  useTrackStreamProgress(chatData as ProgressAnnotation[], isLoading);

  const { parsedMessages, parseMessages } = useMessageParser();

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  const { syncLatestChanges } = useGitPullSync({ setMessages, messagesRef });

  useEffect(() => {
    messagesRef.current = messages;

    processSampledMessages({
      messages,
      isLoading,
      parseMessages,
    });
  }, [messages, isLoading, parseMessages]);

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const sendMessage = async (
    _event: React.UIEvent,
    messageInput?: string,
    isFixMessage: boolean = false,
    pendingUploadedFiles?: File[],
    pendingImageDataList?: string[],
  ) => {
    const messageContent = messageInput || input;
    const files = pendingUploadedFiles || uploadedFiles;
    const dataList = pendingImageDataList || imageDataList;

    if (!messageContent?.trim()) {
      return;
    }

    if (isLoading) {
      abort();
      return;
    }

    if (!chatStarted) {
      setChatStarted(true);
      await workbenchStore.initialize();
      await startChatWithInitialMessage(
        messageContent,
        {
          dataSourceId: selectedEnvironmentDataSource.dataSourceId!,
          environmentId: selectedEnvironmentDataSource.environmentId!,
        },
        files,
        dataList,
      );

      return;
    }

    if (error != null) {
      setMessages(messages.slice(0, -1));
    }

    const modifiedFiles = workbenchStore.getModifiedFiles();

    chatStore.setKey('aborted', false);
    setInput('');

    if (modifiedFiles !== undefined) {
      const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
      await append(
        {
          role: 'user',
          content: formatMessageWithModelInfo({
            messageContent: userUpdateArtifact + messageContent,
            environmentDataSource: {
              dataSourceId: selectedEnvironmentDataSource.dataSourceId!,
              environmentId: selectedEnvironmentDataSource.environmentId!,
            },
            dataList,
          }),
          annotations: isFixMessage ? [FIX_ANNOTATION] : undefined,
          experimental_attachments: createExperimentalAttachments(dataList, files),
        },
        {
          body: {
            conversationId: chatId.get(),
          },
        },
      );

      workbenchStore.resetAllFileModifications();
    } else {
      await append(
        {
          role: 'user',
          content: formatMessageWithModelInfo({
            messageContent,
            environmentDataSource: {
              dataSourceId: selectedEnvironmentDataSource.dataSourceId!,
              environmentId: selectedEnvironmentDataSource.environmentId!,
            },
            dataList,
          }),
          annotations: isFixMessage ? [FIX_ANNOTATION] : undefined,
          experimental_attachments: createExperimentalAttachments(dataList, files),
        },
        {
          body: {
            conversationId: chatId.get(),
          },
        },
      );
    }

    Cookies.remove(PROMPT_COOKIE_KEY);

    setUploadedFiles([]);
    setImageDataList([]);

    workbenchStore.previewsStore.startLoading();

    textareaRef.current?.blur();
  };

  const updateMessageWithSnapshot = (snapshotId: string, messageId: string) => {
    // Update the message annotations to include the snapshot ID
    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.id === messageId) {
          const existingSnapshotId = getMessageSnapshotId(message);

          if (!existingSnapshotId) {
            const existingAnnotations = message.annotations || [];
            return {
              ...message,
              annotations: [...existingAnnotations, `snapshotId:${snapshotId}`],
            };
          }
        }

        return message;
      }),
    );
  };

  const sendAutofixMessage = async (message: string) => {
    if (isLoading) {
      abort();
      return;
    }

    chatStore.setKey('aborted', false);

    const modifiedFiles = workbenchStore.getModifiedFiles();
    const userUpdateArtifact = modifiedFiles !== undefined ? filesToArtifacts(modifiedFiles, `${Date.now()}`) : '';

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: generateId(),
        role: 'assistant',
        content: 'There seems to be a small issue with the output. Let me try to fix it real quick.',
      },
      {
        id: generateId(),
        role: 'user',
        annotations: ['hidden', FIX_ANNOTATION],
        content: formatMessageWithModelInfo({
          messageContent: `${userUpdateArtifact}${message}`,
          environmentDataSource: {
            dataSourceId: selectedEnvironmentDataSource.dataSourceId!,
            environmentId: selectedEnvironmentDataSource.environmentId!,
          },
        }),
      },
    ]);

    workbenchStore.previewsStore.fixingIssues();

    await reload({
      body: {
        conversationId: chatId.get(),
      },
    });

    setInput('');
    Cookies.remove(PROMPT_COOKIE_KEY);

    setUploadedFiles([]);
    setImageDataList([]);

    textareaRef.current?.blur();
  };

  async function startChatWithInitialMessage(
    messageContent: string,
    environmentDataSource: { dataSourceId: string; environmentId: string },
    files: File[],
    dataList: string[],
  ) {
    setFakeLoading(true);

    // Generate a new chat ID right away to use in the request
    let conversationId = chatId.get();

    if (!conversationId) {
      conversationId = await createConversation(
        environmentDataSource.dataSourceId,
        environmentDataSource.environmentId,
      );
      chatId.set(conversationId);

      // Don't update URL during active chat - causes component unmounting
      // Store the conversation ID for potential future navigation
    }

    logger.info('Environment data source for new chat:', JSON.stringify(environmentDataSource));

    const dataSourceUrlResponse = await fetch(
      `/api/data-sources/${environmentDataSource.dataSourceId}/properties?environmentId=${environmentDataSource.environmentId}`,
    );

    if (!dataSourceUrlResponse.ok) {
      console.error('Failed to fetch database URL:', dataSourceUrlResponse.status);
      toast.error('Failed to fetch database URL');

      return;
    }

    const dataSourceProperties = await dataSourceUrlResponse.json<DataSourcePropertiesResponse>();

    setDataSourceProperties(dataSourceProperties);

    const starterTemplateMessages = await getStarterTemplateMessages(messageContent, dataSourceProperties).catch(
      (e) => {
        if (e.message.includes('rate limit')) {
          toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
        } else {
          console.error('Failed to import starter template:', e);
          toast.warning('Failed to import starter template\n Continuing with blank template');
        }

        return [];
      },
    );

    const userMessage = {
      id: createId(),
      role: 'user' as const,
      content: formatMessageWithModelInfo({
        messageContent,
        firstUserMessage: true,
        environmentDataSource: {
          dataSourceId: selectedEnvironmentDataSource.dataSourceId!,
          environmentId: selectedEnvironmentDataSource.environmentId!,
        },
        dataList,
      }),
      experimental_attachments: createExperimentalAttachments(dataList, files),
    };

    if (starterTemplateMessages && starterTemplateMessages.length > 0) {
      setMessages([...starterTemplateMessages, userMessage]);

      await reload({
        body: {
          conversationId,
        },
      });

      await saveSnapshot(conversationId);

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      textareaRef.current?.blur();

      return;
    }

    // If template selection failed, proceed with normal conversation without a template
    setMessages([userMessage]);
    await reload({
      body: {
        conversationId: chatId.get(),
      },
    });
    setInput('');
    Cookies.remove(PROMPT_COOKIE_KEY);

    setUploadedFiles([]);
    setImageDataList([]);

    textareaRef.current?.blur();

    return;
  }

  /**
   * Handles the change event for the textarea and updates the input state.
   * @param event - The change event from the textarea.
   */
  const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(event);
  };

  /**
   * Debounced function to cache the prompt in cookies.
   * Caches the trimmed value of the textarea input after a delay to optimize performance.
   */
  const debouncedCachePrompt = useCallback(
    debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const trimmedValue = event.target.value.trim();
      Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
    }, 1000),
    [],
  );

  const [messageRef, scrollRef] = useSnapScroll();

  useEffect(() => {
    const storedApiKeys = Cookies.get('apiKeys');

    if (storedApiKeys) {
      setApiKeys(JSON.parse(storedApiKeys));
    }
  }, []);

  const handleRetry = async (errorMessage: string) => {
    const messagesWithoutLastAssistant = messages.filter(
      (message, index) => !(message.role === 'assistant' && index === messages.length - 1),
    );

    setData(undefined);
    setMessages(messagesWithoutLastAssistant);

    const currentChatId = chatId.get();

    if (currentChatId) {
      await trackTelemetryEvent({
        eventType: TelemetryEventType.USER_CHAT_RETRY,
        properties: { conversationId: currentChatId, errorMessage },
      });
    }

    workbenchStore.previewsStore.startLoading();

    // Reload the chat to retry the request
    await reload({
      body: {
        conversationId: chatId.get(),
      },
    });
  };

  return (
    <>
      <BaseChat
        textareaRef={textareaRef}
        input={input}
        showChat={showChat}
        chatStarted={chatStarted}
        isStreaming={isLoading || fakeLoading}
        onStreamingChange={(streaming) => {
          streamingState.set(streaming);
        }}
        sendMessage={sendMessage}
        sendAutofixMessage={sendAutofixMessage}
        messageRef={messageRef}
        scrollRef={scrollRef}
        handleInputChange={(e) => {
          onTextareaChange(e);
          debouncedCachePrompt(e);
        }}
        handleStop={abort}
        description={description}
        exportChat={exportChatAction}
        messages={messages.map((message) => {
          if (message.role === MessageRole.User) {
            return message;
          }

          return {
            ...message,
            content: parsedMessages[message.id] || '',
          };
        })}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        imageDataList={imageDataList}
        setImageDataList={setImageDataList}
        data={chatData}
        error={error}
        onSyncFiles={syncLatestChanges}
        setMessages={setMessages}
        onRetry={handleRetry}
      />
    </>
  );
};

interface MessageWithModelInfo {
  messageContent: string;
  environmentDataSource: { dataSourceId: string; environmentId: string };
  firstUserMessage?: boolean;
  dataList?: string[];
}

const createExperimentalAttachments = (dataList: string[], files: File[]) =>
  dataList.map((imageData, index) => ({
    name: files[index]?.name || `image-${index}`,
    contentType: files[index]?.type || 'image/png',
    url: imageData,
  }));

const formatMessageWithModelInfo = ({
  messageContent,
  environmentDataSource,
  firstUserMessage,
  dataList,
}: MessageWithModelInfo) => {
  let formattedMessage = '';

  if (firstUserMessage) {
    formattedMessage += `\n\n[FirstUserMessage: true]`;
  }

  formattedMessage += `\n\n[DataSourceId: ${environmentDataSource.dataSourceId}]`;
  formattedMessage += `\n\n[EnvironmentId: ${environmentDataSource.environmentId}]`;

  if (dataList) {
    formattedMessage += `\n\n[Files: ${dataList.join('## ')}]`;
  }

  formattedMessage += `\n\n${messageContent}`;

  return formattedMessage;
};
