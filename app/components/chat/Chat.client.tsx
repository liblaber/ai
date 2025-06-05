/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { chatId, description, navigateChat, useChatHistory } from '~/lib/persistence';
import { getNextId } from '~/lib/persistence/db';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { MessageRole, PROMPT_COOKIE_KEY } from '~/utils/constants';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { createSampler } from '~/utils/sampler';
import { getStarterTemplateMessages } from '~/utils/selectStarterTemplate';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { type OutputAppEvent, OutputAppEventType } from '~/utils/output-app';
import { QueryModal } from '~/components/chat/query-modal/QueryModal';
import { LLMManager } from '~/lib/modules/llm/manager';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { type Message, useChat } from '@ai-sdk/react';
import { generateId } from 'ai';

type DatabaseUrlResponse = {
  url: string;
};

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
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
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
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

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [fakeLoading, setFakeLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const { contextOptimizationEnabled } = useSettings();

    useEffect(() => {
      chatStore.setKey('started', chatStarted);
    }, [chatStarted]);

    const { selectedDataSourceId } = useDataSourcesStore();

    const llmManager = LLMManager.getInstance();
    const [model] = useState(() => llmManager.defaultModel);
    const [provider] = useState(() => {
      const provider = llmManager.getProvider();
      return {
        name: provider.name,
        staticModels: provider.staticModels,
        getApiKeyLink: provider.getApiKeyLink,
        labelForGetApiKey: provider.labelForGetApiKey,
        icon: provider.icon,
      } as ProviderInfo;
    });

    const [sqlLlmModel] = useState(() => llmManager.defaultModel);
    const [sqlLlmProvider] = useState(() => {
      const provider = llmManager.getProvider();
      return {
        name: provider.name,
        staticModels: provider.staticModels,
        getApiKeyLink: provider.getApiKeyLink,
        labelForGetApiKey: provider.labelForGetApiKey,
        icon: provider.icon,
      } as ProviderInfo;
    });
    const [useDifferentSqlModel] = useState(false);

    const { showChat } = useStore(chatStore);

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const messagesRef = useRef<Message[]>([]);

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
        promptId: 'dashboards',
        contextOptimization: contextOptimizationEnabled,
      },
      sendExtraMessageFields: true,
      onError: (e) => {
        logger.error('Request failed\n\n', e, error);
        toast.error(
          'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
        );
      },
      onFinish: async () => {
        setData(undefined);

        logger.debug('Finished streaming');

        await storeMessageHistory(messagesRef.current);
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });
    const isLoading = status === 'streaming';

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      messagesRef.current = messages;

      processSampledMessages({
        messages,
        isLoading,
        parseMessages,
      });
    }, [messages, isLoading, parseMessages]);

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

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

    const sendMessage = async (_event: React.UIEvent, messageInput?: string, askLiblab: boolean = false) => {
      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      if (!chatStarted) {
        setChatStarted(true);
        await startChatWithInitialMessage(messageContent, selectedDataSourceId!);

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        append(
          {
            role: 'user',
            content: formatMessageWithModelInfo({
              model,
              provider,
              messageContent: userUpdateArtifact + messageContent,
              useDifferentSqlModel,
              sqlLlmModel,
              sqlLlmProvider,
              dataSourceId: selectedDataSourceId!,
              askLiblab,
            }),
          },
          {
            body: {
              conversationId: chatId.get(),
            },
          },
        );

        workbenchStore.resetAllFileModifications();
      } else {
        append(
          {
            role: 'user',
            content: formatMessageWithModelInfo({
              model,
              provider,
              messageContent,
              useDifferentSqlModel,
              sqlLlmModel,
              sqlLlmProvider,
              dataSourceId: selectedDataSourceId!,
              askLiblab,
            }),
          },
          {
            body: {
              conversationId: chatId.get(),
            },
          },
        );
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

      workbenchStore.previewsStore.makingChanges();

      textareaRef.current?.blur();
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
          annotations: ['hidden'],
          content: formatMessageWithModelInfo({
            model,
            provider,
            messageContent: `${userUpdateArtifact}${message}`,
            useDifferentSqlModel,
            sqlLlmModel,
            sqlLlmProvider,
            dataSourceId: selectedDataSourceId!,
            askLiblab: true,
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

      resetEnhancer();

      textareaRef.current?.blur();
    };

    async function startChatWithInitialMessage(messageContent: string, datasourceId: string) {
      setFakeLoading(true);

      // Generate a new chat ID right away to use in the request
      if (!chatId.get()) {
        const nextId = await getNextId();
        chatId.set(nextId);
        navigateChat(nextId);
      }

      const dataSourceUrlResponse = await fetch(`/api/data-sources/${datasourceId}/url`);

      if (!dataSourceUrlResponse.ok) {
        console.error('Failed to fetch database URL:', dataSourceUrlResponse.status);
        toast.error('Failed to fetch database URL');

        return;
      }

      const dataSourceUrlJson = await dataSourceUrlResponse.json<DatabaseUrlResponse>();

      const databaseUrl = dataSourceUrlJson.url;

      const starterTemplateMessages = await getStarterTemplateMessages(messageContent, databaseUrl).catch((e) => {
        if (e.message.includes('rate limit')) {
          toast.warning('Rate limit exceeded. Skipping starter template\n Continuing with blank template');
        } else {
          console.error('Failed to import starter template:', e);
          toast.warning('Failed to import starter template\n Continuing with blank template');
        }

        return null;
      });

      if (starterTemplateMessages) {
        setMessages([
          ...starterTemplateMessages,
          {
            id: `3-${new Date().getTime()}`,
            role: 'user',
            content: formatMessageWithModelInfo({
              model,
              provider,
              messageContent,
              useDifferentSqlModel,
              sqlLlmModel,
              sqlLlmProvider,
              firstUserMessage: true,
              dataSourceId: selectedDataSourceId!,
            }),
          },
        ]);
        reload({
          body: {
            conversationId: chatId.get(),
          },
        });
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setUploadedFiles([]);
        setImageDataList([]);

        resetEnhancer();

        textareaRef.current?.blur();
        setFakeLoading(false);

        return;
      }

      // If template selection failed, proceed with normal conversation without a template
      setMessages([
        {
          id: `${new Date().getTime()}`,
          role: 'user',
          content: formatMessageWithModelInfo({
            model,
            provider,
            messageContent,
            useDifferentSqlModel,
            sqlLlmModel,
            sqlLlmProvider,
            dataSourceId: selectedDataSourceId!,
          }),
        },
      ]);
      reload({
        body: {
          conversationId: chatId.get(),
        },
      });
      setFakeLoading(false);
      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      resetEnhancer();

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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQueryId, setSelectedQueryId] = useState<string | number | null>(null);

    useEffect(() => {
      const handleIframeMessage = (event: MessageEvent<OutputAppEvent>) => {
        try {
          const data = event.data;

          if (data.eventType === OutputAppEventType.EDIT_QUERY) {
            setSelectedQueryId(data.queryId);
            setIsModalOpen(true);
          }
        } catch (error) {
          console.error('Error handling iframe message:', error);
        }
      };

      window.addEventListener('message', handleIframeMessage);

      return () => window.removeEventListener('message', handleIframeMessage);
    }, []);

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
          enhancingPrompt={enhancingPrompt}
          promptEnhanced={promptEnhanced}
          sendMessage={sendMessage}
          sendAutofixMessage={sendAutofixMessage}
          model={model}
          provider={provider}
          providerList={[provider]}
          messageRef={messageRef}
          scrollRef={scrollRef}
          handleInputChange={(e) => {
            onTextareaChange(e);
            debouncedCachePrompt(e);
          }}
          handleStop={abort}
          description={description}
          importChat={importChat}
          exportChat={exportChat}
          messages={messages.map((message, i) => {
            if (message.role === MessageRole.User) {
              return message;
            }

            return {
              ...message,
              content: parsedMessages[i] || '',
            };
          })}
          enhancePrompt={() => {
            enhancePrompt(
              input,
              (input) => {
                setInput(input);
                scrollTextArea();
              },
              model,
              provider,
              apiKeys,
            );
          }}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          imageDataList={imageDataList}
          setImageDataList={setImageDataList}
          actionAlert={actionAlert}
          clearAlert={() => workbenchStore.clearAlert()}
          data={chatData}
        />
        {selectedQueryId && <QueryModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} queryId={selectedQueryId} />}
      </>
    );
  },
);

interface MessageWithModelInfo {
  model: string;
  provider: ProviderInfo;
  messageContent: string;
  dataSourceId: string;
  useDifferentSqlModel?: boolean;
  sqlLlmModel?: string;
  sqlLlmProvider?: ProviderInfo;
  firstUserMessage?: boolean;
  askLiblab?: boolean;
}

const formatMessageWithModelInfo = ({
  model,
  provider,
  messageContent,
  dataSourceId,
  useDifferentSqlModel,
  sqlLlmModel,
  sqlLlmProvider,
  firstUserMessage,
  askLiblab,
}: MessageWithModelInfo) => {
  let formattedMessage = `[Model: ${model}]\n\n[Provider: ${provider.name}]`;

  if (useDifferentSqlModel && sqlLlmModel && sqlLlmProvider) {
    formattedMessage += `\n\n[SqlModel: ${sqlLlmModel}]\n\n[SqlProvider: ${sqlLlmProvider.name}]`;
  }

  if (firstUserMessage) {
    formattedMessage += `\n\n[FirstUserMessage: true]`;
  }

  if (askLiblab) {
    formattedMessage += `\n\n[AskLiblab: true]`;
  }

  formattedMessage += `\n\n[DataSourceId: ${dataSourceId}]`;

  formattedMessage += `\n\n${messageContent}`;

  return formattedMessage;
};
