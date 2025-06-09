import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  MessageRole,
  MODIFICATIONS_TAG_NAME,
  PROVIDER_LIST,
  WORK_DIR,
} from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';
import { generateSqlQueries, shouldGenerateSqlQueries } from '~/lib/.server/llm/database-source';
import { getDatabaseSchema } from '~/lib/schema';
import { mapSqlQueriesToPrompt } from '~/lib/common/prompts/sql';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { requireUserId } from '~/session';
import type { DataStreamWriter, Message } from 'ai';
import { env } from '~/lib/config/env';
import { randomUUID } from 'crypto';

const logger = createScopedLogger('stream-text');

// type MessageContent = string | Array<{ type: string; text: string }>;

function convertMessageToAnthropicFormat(message: Omit<Message, 'id'>) {
  const role = message.role === 'system' ? 'assistant' : message.role === 'data' ? 'user' : message.role;
  let content = '';

  if (typeof message.content === 'string') {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    const contentArray = message.content as Array<{ type: string; text: string }>;
    content = contentArray
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join(' ');
  }

  return { role, content };
}

type StreamTextOptions = {
  onFinish?: (result: { text: string; finishReason: string; usage?: any }) => void;
  toolChoice?: string;
  systemPrompt?: string;
};

type TrimmedMessage = Omit<Message, 'id'>;

export async function streamText(props: {
  messages: TrimmedMessage[];
  env?: Env;
  options?: StreamTextOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  messageSliceId?: number;
  request: Request;
}): Promise<{
  fullStream: ReadableStream<string>;
  mergeIntoDataStream: (writer: DataStreamWriter) => Promise<void>;
  onError: (error: any) => void;
  onFinish: (result: { text: string; finishReason: string; usage?: any }) => void;
  now: () => string;
  usage: () => { completionTokens: number; promptTokens: number; totalTokens: number };
}> {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    providerSettings,
    promptId,
    contextOptimization,
    contextFiles,
    summary,
    request,
  } = props;
  const currentModel = DEFAULT_MODEL;
  const currentProvider = DEFAULT_PROVIDER.name;
  let currentDataSourceId: string | undefined = '';

  let processedMessages = messages.map((message) => {
    if (message.role === MessageRole.User) {
      const { content, isFirstUserMessage, dataSourceId } = extractPropertiesFromMessage(message);
      currentDataSourceId = dataSourceId;

      return { ...message, content, isFirstUserMessage };
    } else if (message.role == MessageRole.Assistant) {
      let content = message.content;

      if (typeof content === 'string') {
        content = content.replace(/<div class=\\"__liblabThought__\\">.*?<\/div>/s, '');
        content = content.replace(/<think>.*?<\/think>/s, '');
      }

      return { ...message, content, isFirstUserMessage: false };
    }

    return message;
  });

  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;

  const llm = await getLlm({
    modelName: currentModel,
    provider,
    apiKeys,
    providerSettings,
    serverEnv,
  });

  const lastUserMessage = getLastUserMessageContent(processedMessages);

  if (!lastUserMessage) {
    throw new Error('No user message');
  }

  let systemPrompt =
    (options?.systemPrompt ||
      (await PromptLibrary.getPromptFromLibrary(promptId || 'default', {
        cwd: WORK_DIR,
        allowedHtmlElements: allowedHTMLElements,
        modificationTagName: MODIFICATIONS_TAG_NAME,
      }))) ??
    (await getSystemPrompt());

  let codeContext = '';

  if (files && contextFiles && contextOptimization) {
    codeContext = createFilesContext(contextFiles, true);

    const filePaths = getFilePaths(files);

    systemPrompt = `${systemPrompt}
Below are all the files present in the project:
---
${filePaths.join('\n')}
---

Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fulfill current user request.
CONTEXT BUFFER:
---
${codeContext}
---
`;

    if (summary) {
      systemPrompt = `${systemPrompt}
      below is the chat history till now
CHAT SUMMARY:
---
${props.summary}
---
`;

      if (props.messageSliceId) {
        processedMessages = processedMessages.slice(props.messageSliceId);
      } else {
        const lastMessage = processedMessages.pop();

        if (lastMessage) {
          processedMessages = [lastMessage];
        }
      }
    }
  }

  const existingQueries = extractSqlQueries(codeContext);

  if (
    isFirstUserMessage(processedMessages) ||
    (await shouldGenerateSqlQueries(lastUserMessage, llm.instance, llm.maxTokens, existingQueries))
  ) {
    const userId = await requireUserId(request);
    const schema = await getDatabaseSchema(currentDataSourceId, userId);
    const sqlQueries = await generateSqlQueries(schema, lastUserMessage, llm.instance, llm.maxTokens, existingQueries);

    if (sqlQueries?.length) {
      logger.debug(`Adding SQL queries as the hidden user message`);
      processedMessages.push({
        role: 'user',
        content: mapSqlQueriesToPrompt(sqlQueries),
        annotations: ['hidden'],
      });
    }
  }

  logger.info(`Sending llm call to ${provider.name} with model ${llm.details.name}`);

  const useGemini = provider.name === 'Google' && llm.details.name.startsWith('gemini-');

  if (useGemini) {
    return geminiStreamResult(llm, processedMessages, systemPrompt, options);
  } else {
    return anthropicStreamResult(llm, processedMessages, systemPrompt, options);
  }
}

function getLastUserMessageContent(messages: Omit<Message, 'id'>[]): string | undefined {
  const userMessages = messages.filter((message) => message.role === 'user');

  const lastUserMessage = userMessages[userMessages.length - 1];

  if (!lastUserMessage) {
    return undefined;
  }

  const { content } = lastUserMessage;

  // Message content can be an array of objects as well
  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join(' ');
  }

  return content;
}

function isFirstUserMessage(processedMessages: Omit<Message & { isFirstUserMessage?: boolean }, 'id'>[]) {
  return processedMessages[processedMessages.length - 1].isFirstUserMessage || false;
}

/**
 * Extracts all SQL query strings defined using `export const query =` from the given code context.
 *
 * This function searches for SQL queries written as template literals or string literals
 * and returns an array of the raw SQL strings found.
 *
 * Example of a supported query format:
 * ```
 * export const userQuery = `
 *   SELECT id, name FROM users WHERE is_active = true;
 * `;
 * ```
 *
 * @param codeContext - A string containing the code to search through.
 * @returns An array of extracted SQL query strings.
 */
function extractSqlQueries(codeContext: string): string[] {
  if (!codeContext) {
    return [];
  }

  const regex = /export\s+const\s+\w*query\s*=\s*(["'`])([\s\S]*?)\1;/gi;

  return [...codeContext.matchAll(regex)].map((m) => m[2].trim());
}

async function geminiStreamResult(
  llm: any,
  messages: TrimmedMessage[],
  systemPrompt: string,
  options?: StreamTextOptions,
) {
  const genAI = new GoogleGenAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
  const chat = genAI.chats.create({
    model: llm.details.name,
    config: {
      maxOutputTokens: llm.maxTokens,
      temperature: llm.temperature || 0,
    },
    history: messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
    })),
  });

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
  };

  const stream = await chat.sendMessageStream({ message: systemPrompt });
  const messageId = randomUUID();
  let fullText = '';

  // Create a single ReadableStream that handles both streaming and usage tracking
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let firstMessage = true;

        for await (const chunk of stream) {
          // Track message ID and usage
          if (firstMessage) {
            controller.enqueue(`f:{"messageId": "${messageId}"}\n`);
            firstMessage = false;
          }

          if (chunk.text) {
            const text = JSON.stringify(chunk.text).slice(1, -1);
            fullText += chunk.text;
            controller.enqueue(`g:"${text}"\n`);
          }

          // Update usage counts
          if (chunk.usageMetadata) {
            cumulativeUsage.promptTokens = chunk.usageMetadata.promptTokenCount || 0;
            cumulativeUsage.completionTokens = chunk.usageMetadata.candidatesTokenCount || 0;
          }
        }

        if (options?.onFinish) {
          options.onFinish({
            text: fullText,
            finishReason: 'stop',
            usage: {
              completionTokens: cumulativeUsage.completionTokens,
              promptTokens: cumulativeUsage.promptTokens,
              totalTokens: cumulativeUsage.completionTokens + cumulativeUsage.promptTokens,
            },
          });
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return {
    fullStream: readableStream,
    mergeIntoDataStream: async (writer: DataStreamWriter) => {
      try {
        const reader = readableStream.getReader();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          writer.write(value);
        }
      } catch (error) {
        logger.error('Error processing stream:', error);
        throw error;
      }
    },
    onError: (error: any) => {
      logger.error('Error in stream:', error);
      throw error;
    },
    onFinish: (result: { text: string; finishReason: string; usage?: any }) => {
      if (options?.onFinish) {
        options.onFinish(result);
      }
    },
    now: () => new Date().toISOString(),
    usage(): { completionTokens: number; promptTokens: number; totalTokens: number } {
      return {
        completionTokens: cumulativeUsage.completionTokens,
        promptTokens: cumulativeUsage.promptTokens,
        totalTokens: cumulativeUsage.completionTokens + cumulativeUsage.promptTokens,
      };
    },
  };
}

function anthropicStreamResult(
  llm: any,
  messages: TrimmedMessage[],
  systemPrompt: string,
  options?: StreamTextOptions,
) {
  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
  };

  const stream = anthropic.messages.stream({
    model: llm.details.name,
    system: systemPrompt,
    messages: messages.map(convertMessageToAnthropicFormat),
    max_tokens: llm.maxTokens,
  });

  return {
    fullStream: stream.toReadableStream(),
    mergeIntoDataStream: async (writer: DataStreamWriter) => {
      let fullText = '';

      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
            const text = JSON.stringify(chunk.delta.text).slice(1, -1);
            fullText += chunk.delta.text;
            writer.write(`g:"${text}"\n`);
          } else if (chunk.type === 'message_start') {
            writer.write(`f:{"messageId": "${chunk.message.id}"}\n`);
            cumulativeUsage.promptTokens = chunk.message.usage.input_tokens;
          } else if (chunk.type === 'message_delta') {
            cumulativeUsage.completionTokens += chunk.usage.output_tokens;
          }
        }

        if (options?.onFinish) {
          options.onFinish({
            text: fullText,
            finishReason: 'stop',
            usage: {
              completionTokens: cumulativeUsage.completionTokens,
              promptTokens: cumulativeUsage.promptTokens,
              totalTokens: cumulativeUsage.completionTokens + cumulativeUsage.promptTokens,
            },
          });
        }
      } catch (error) {
        logger.error('Error processing stream:', error);
        throw error;
      }
    },

    onError: (error: any) => {
      logger.error('Error in stream:', error);
      throw error;
    },
    onFinish: (result: { text: string; finishReason: string; usage?: any }) => {
      if (options?.onFinish) {
        options.onFinish(result);
      }
    },

    now: () => new Date().toISOString(),
    usage(): { completionTokens: number; promptTokens: number; totalTokens: number } {
      return {
        completionTokens: cumulativeUsage.completionTokens,
        promptTokens: cumulativeUsage.promptTokens,
        totalTokens: cumulativeUsage.completionTokens + cumulativeUsage.promptTokens,
      };
    },
  };
}
