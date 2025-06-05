import { convertToCoreMessages, type Message, streamText as _streamText } from 'ai';
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
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';
import { generateSqlQueries, shouldGenerateSqlQueries } from '~/lib/.server/llm/database-source';
import { getDatabaseSchema } from '~/lib/schema';
import { mapSqlQueriesToPrompt } from '~/lib/common/prompts/sql';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { prisma } from '~/lib/prisma';

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

const logger = createScopedLogger('stream-text');

export async function streamText(props: {
  messages: Omit<Message, 'id'>[];
  env?: Env;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  messageSliceId?: number;
  request: Request;
}) {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    promptId,
    contextOptimization,
    contextFiles,
    summary,
  } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  let currentSqlModel: string | undefined;
  let currentSqlProvider: string | undefined;
  let currentDataSourceId: string | undefined = '';

  let processedMessages = messages.map((message) => {
    if (message.role === MessageRole.User) {
      const {
        model,
        provider,
        sqlModel: extractedSqlModel,
        sqlProvider: extractedSqlProvider,
        content,
        isFirstUserMessage,
        dataSourceId,
      } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;
      currentSqlModel = extractedSqlModel;
      currentSqlProvider = extractedSqlProvider;
      currentDataSourceId = dataSourceId;

      return { ...message, content, isFirstUserMessage };
    } else if (message.role == MessageRole.Assistant) {
      let content = message.content;
      content = content.replace(/<div class=\\"__liblabThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');

      return { ...message, content, isFirstUserMessage: false };
    }

    return message;
  });

  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const sqlProvider = currentSqlProvider
    ? PROVIDER_LIST.find((p) => p.name === currentSqlProvider) || DEFAULT_PROVIDER
    : provider;

  const regularLlm = await getLlm({
    modelName: currentModel,
    provider,
    apiKeys,
    serverEnv,
  });

  const sqlLlm =
    currentSqlModel && currentSqlProvider
      ? await getLlm({
          modelName: currentSqlModel,
          provider: sqlProvider,
          apiKeys,
          serverEnv,
        })
      : regularLlm;

  const lastUserMessage = getLastUserMessageContent(processedMessages);

  if (!lastUserMessage) {
    throw new Error('No user message');
  }

  let systemPrompt =
    (await PromptLibrary.getPromptFromLibrary(promptId || 'default', {
      cwd: WORK_DIR,
      allowedHtmlElements: allowedHTMLElements,
      modificationTagName: MODIFICATIONS_TAG_NAME,
    })) ?? (await getSystemPrompt());

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
    (await shouldGenerateSqlQueries(lastUserMessage, sqlLlm.instance, sqlLlm.maxTokens, existingQueries))
  ) {
    const dataSource = await prisma.dataSource.findUniqueOrThrow({ where: { id: currentDataSourceId } });
    const schema = await getDatabaseSchema(currentDataSourceId);

    const sqlQueries = await generateSqlQueries(
      schema,
      lastUserMessage,
      sqlLlm.instance,
      sqlLlm.maxTokens,
      dataSource.type,
      existingQueries,
    );

    if (sqlQueries?.length) {
      logger.debug(`Adding SQL queries as the hidden user message`);
      processedMessages.push({
        role: 'user',
        content: mapSqlQueriesToPrompt(sqlQueries),
        annotations: ['hidden'],
      });
    }
  }

  logger.info(`Sending llm call to ${provider.name} with model ${regularLlm.details.name}`);

  return _streamText({
    model: regularLlm.instance,
    system: systemPrompt,
    maxTokens: regularLlm.maxTokens,
    messages: convertToCoreMessages(processedMessages as any),
    ...options,
  });
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
