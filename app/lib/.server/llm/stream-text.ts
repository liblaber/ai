import { convertToCoreMessages, generateId, type Message, streamText as _streamText } from 'ai';
import { type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { DEFAULT_PROVIDER } from '~/utils/constants/server';
import { MessageRole, MODIFICATIONS_TAG_NAME, WORK_DIR } from '~/utils/constants';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';
import { getLlm } from '~/lib/.server/llm/get-llm';
import type { StarterPluginId } from '~/lib/plugins/types';
import type { ImplementationPlan } from '~/lib/.server/llm/create-implementation-plan';
import { type Conversation } from '@prisma/client';

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

const logger = createScopedLogger('stream-text');

export async function streamText(props: {
  messages: Message[];
  options?: StreamingOptions;
  files?: FileMap;
  promptId?: string;
  conversation: Conversation;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  implementationPlan?: ImplementationPlan;
  additionalDataSourceContext?: string | null;
  messageSliceId?: number;
  request: Request;
}) {
  const {
    messages,
    options,
    files,
    promptId,
    conversation,
    implementationPlan,
    contextOptimization,
    contextFiles,
    summary,
    additionalDataSourceContext,
  } = props;

  let processedMessages = messages.map((message) => {
    if (message.role === MessageRole.User) {
      const { content, isFirstUserMessage } = extractPropertiesFromMessage(message);

      return { ...message, content, isFirstUserMessage };
    } else if (message.role == MessageRole.Assistant) {
      let content = message.content;
      content = content.replace(/<div class=\\"__liblabThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');

      return { ...message, content, isFirstUserMessage: false };
    }

    return message;
  });

  const lastUserMessage = getLastUserMessageContent(processedMessages);

  if (!lastUserMessage) {
    throw new Error('No user message');
  }

  let systemPrompt =
    (await PromptLibrary.getPromptFromLibrary(promptId || 'default', {
      cwd: WORK_DIR,
      starterId: conversation.starterId as StarterPluginId,
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

  if (implementationPlan) {
    systemPrompt = `${systemPrompt}
    Below is the implementation plan that you should follow:\n
    ${implementationPlan.implementationPlan}\n`;
  }

  if (additionalDataSourceContext) {
    logger.debug(`Adding additional context queries as the hidden user message`);
    processedMessages.push({
      id: generateId(),
      role: 'user',
      content: additionalDataSourceContext,
      annotations: ['hidden'],
    });
  }

  const provider = DEFAULT_PROVIDER;
  const llm = await getLlm();

  logger.info(`Sending llm call to ${provider.name} with model ${llm.instance.modelId}`);

  return _streamText({
    model: llm.instance,
    system: systemPrompt,
    maxTokens: llm.maxOutputTokens,
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
