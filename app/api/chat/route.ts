import { NextRequest } from 'next/server';
import { createDataStream } from 'ai';
import { type Messages, type StreamingOptions, streamText } from '~/lib/.server/llm/stream-text';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { getChatSummary } from '~/lib/.server/llm/get-chat-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import { messageService } from '~/lib/services/messageService';
import { MESSAGE_ROLE } from '~/types/database';
import { createId } from '@paralleldrive/cuid2';
import { conversationService } from '~/lib/services/conversationService';
import type { StarterPluginId } from '~/lib/plugins/types';
import type { FileMap } from '~/lib/stores/files';
import { getTelemetry } from '~/lib/telemetry/telemetry-manager';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import { LLMManager } from '~/lib/modules/llm/manager';
import { DataSourcePluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { type UserProfile, userService } from '~/lib/services/userService';
import { createImplementationPlan } from '~/lib/.server/llm/create-implementation-plan';
import { getDatabaseSchema } from '~/lib/schema';
import { requireUserId } from '~/auth/session';
import { formatDbSchemaForLLM } from '~/lib/.server/llm/database-source';
import { AI_SDK_INVALID_KEY_ERROR } from '~/utils/constants';

const WORK_DIR = '/home/project';

const logger = createScopedLogger('api.chat');

export async function POST(request: NextRequest) {
  return chatAction(request);
}

async function chatAction(request: NextRequest) {
  const userId = await requireUserId(request);

  const body = await request.json<{
    messages: Messages;
    files: any;
    conversationId: string;
    promptId?: string;
    contextOptimization: boolean;
  }>();
  const { messages, files, conversationId, promptId, contextOptimization } = body;

  const userMessage = messages[messages.length - 1];
  const userMessageProperties = extractPropertiesFromMessage(userMessage);

  if (!userMessage) {
    throw new Response('Message not specified', {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const conversation = await conversationService.getConversation(conversationId);

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  const encoder: TextEncoder = new TextEncoder();
  let progressCounter: number = 0;

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length}, words`);

    let lastChunk: string | undefined = undefined;

    const dataStream = createDataStream({
      async execute(dataStream) {
        let currentProgressAnnotation: ProgressAnnotation = {
          type: 'progress',
          label: 'init',
          status: 'init',
          order: progressCounter++,
          message: 'Initializing Request',
        };

        try {
          const filePaths = getFilePaths(files || {});
          let filteredFiles: FileMap | undefined = undefined;
          let summary: string | undefined = undefined;
          let messageSliceId = 0;

          if (messages.length > 3) {
            messageSliceId = messages.length - 3;
          }

          if (filePaths.length > 0 && contextOptimization) {
            logger.debug('Generating Chat Summary');
            currentProgressAnnotation = {
              type: 'progress',
              label: 'summary',
              status: 'in-progress',
              order: progressCounter++,
              message: 'Analyzing your requirements...',
            };
            dataStream.writeData(currentProgressAnnotation);

            logger.debug(`Messages count: ${messages.length}`);

            summary = await getChatSummary({
              messages: [...messages],
              contextOptimization,
              isFixMessage: userMessageProperties.isFixMessage,
              onFinish(resp) {
                if (resp.usage) {
                  logger.debug('createSummary token usage', JSON.stringify(resp.usage));
                  cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                  cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                  cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
                }
              },
            });
            currentProgressAnnotation = {
              type: 'progress',
              label: 'summary',
              status: 'complete',
              order: progressCounter++,
              message: 'Requirements analyzed',
            };
            dataStream.writeData(currentProgressAnnotation);

            dataStream.writeMessageAnnotation({
              type: 'chatSummary',
              summary,
              chatId: messages.slice(-1)?.[0]?.id,
            } as ContextAnnotation);

            // Update context buffer
            logger.debug('Updating Context Buffer');

            currentProgressAnnotation = {
              type: 'progress',
              label: 'context',
              status: 'in-progress',
              order: progressCounter++,
              message: 'Preparing context...',
            };
            dataStream.writeData(currentProgressAnnotation);

            // Select context files
            logger.debug(`Messages count: ${messages.length}`);
            filteredFiles = await selectContext({
              messages: [...messages],
              files,
              contextOptimization,
              summary,
              onFinish(resp) {
                if (resp.usage) {
                  logger.debug('selectContext token usage', JSON.stringify(resp.usage));
                  cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                  cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                  cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
                }
              },
            });

            if (filteredFiles) {
              logger.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);

              dataStream.writeMessageAnnotation({
                type: 'codeContext',
                files: Object.keys(filteredFiles).map((key) => {
                  let path = key;

                  if (path.startsWith(WORK_DIR)) {
                    path = path.replace(WORK_DIR, '');
                  }

                  return path;
                }),
              } as ContextAnnotation);
            }

            currentProgressAnnotation = {
              type: 'progress',
              label: 'context',
              status: 'complete',
              order: progressCounter++,
              message: 'Context prepared',
            };

            dataStream.writeData(currentProgressAnnotation);
          }

          let implementationPlan;

          if (!userMessageProperties.isFixMessage) {
            logger.debug('Creating Implementation Plan...');
            currentProgressAnnotation = {
              type: 'progress',
              label: 'implementation-plan',
              status: 'in-progress',
              order: progressCounter++,
              message: 'Creating implementation plan...',
            };
            dataStream.writeData(currentProgressAnnotation);

            const environmentDataSource =
              await conversationService.getConversationEnvironmentDataSource(conversationId);
            const databaseSchema = await getDatabaseSchema(
              environmentDataSource.dataSourceId,
              environmentDataSource.environmentId,
              userId,
            );

            implementationPlan = await createImplementationPlan({
              isFirstUserMessage: !!userMessageProperties.isFirstUserMessage,
              summary,
              userPrompt: userMessage.content,
              schema: formatDbSchemaForLLM(databaseSchema),
              onFinish: (response) => {
                if (response.usage) {
                  logger.debug('createImplementationPlan token usage', JSON.stringify(response.usage));
                  cumulativeUsage.completionTokens += response.usage.completionTokens || 0;
                  cumulativeUsage.promptTokens += response.usage.promptTokens || 0;
                  cumulativeUsage.totalTokens += response.usage.totalTokens || 0;
                }
              },
            });
            logger.debug('Created Implementation Plan:', implementationPlan);
            currentProgressAnnotation = {
              type: 'progress',
              label: 'implementation-plan',
              status: 'complete',
              order: progressCounter++,
              message: 'Implementation plan created',
            };
            dataStream.writeData(currentProgressAnnotation);
          }

          // Stream the text
          const options: StreamingOptions = {
            experimental_generateMessageId: createId,
            toolChoice: 'none',
            onFinish: async ({ text: assistantMessageContent, finishReason, usage, response: { messages } }) => {
              logger.debug('usage', JSON.stringify(usage));

              if (finishReason === 'error') {
                currentProgressAnnotation.status = 'error';
                dataStream.writeData(currentProgressAnnotation);
                dataStream.writeMessageAnnotation({
                  ...currentProgressAnnotation,
                  errorMessage: 'Unable to generate response.',
                });

                return;
              }

              const assistantMessage = messages.find((m) => m.role === 'assistant');

              try {
                const userMessageContent = Array.isArray(userMessageProperties.content)
                  ? userMessageProperties.content.find((item) => item.type === 'text')?.text || ''
                  : userMessageProperties.content;

                const llmManager = LLMManager.getInstance();
                const currentModel = llmManager.defaultModel;

                await messageService.saveMessage({
                  conversationId,
                  content: userMessageContent,
                  model: currentModel,
                  annotations: userMessage.annotations,
                  id: userMessage?.id,
                });

                await messageService.saveMessage({
                  conversationId,
                  content: assistantMessageContent,
                  model: currentModel,
                  inputTokens: usage?.promptTokens,
                  outputTokens: usage?.completionTokens,
                  finishReason,
                  role: MESSAGE_ROLE.ASSISTANT,
                  id: assistantMessage?.id,
                });

                logger.debug('Prompt saved');

                const userId = await requireUserId(request);
                const user = await userService.getUser(userId);

                await trackChatPrompt(conversationId, currentModel, user, userMessageProperties.content);
              } catch (error) {
                logger.error('Failed to save prompt', error);
              }

              cumulativeUsage.completionTokens += usage.completionTokens || 0;
              cumulativeUsage.promptTokens += usage.promptTokens || 0;
              cumulativeUsage.totalTokens += usage.totalTokens || 0;

              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                },
              });
              currentProgressAnnotation = {
                type: 'progress',
                label: 'response',
                status: 'complete',
                order: progressCounter++,
                message: 'App code generated',
              };
              dataStream.writeData(currentProgressAnnotation);
              await new Promise((resolve) => setTimeout(resolve, 0));

              return;
            },
          };

          currentProgressAnnotation = {
            type: 'progress',
            label: 'response',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Generating application code...',
          };
          dataStream.writeData(currentProgressAnnotation);

          const result = await streamText({
            messages,
            options,
            files,
            promptId,
            starterId: conversation?.starterId as StarterPluginId,
            contextOptimization,
            contextFiles: filteredFiles,
            summary,
            implementationPlan,
            messageSliceId,
            request,
          });

          (async () => {
            for await (const part of result.fullStream) {
              if (part.type === 'error') {
                const error: any = part.error;
                logger.error(`${error}`);
              }
            }
          })();
          result.mergeIntoDataStream(dataStream);
        } catch (error: any) {
          logger.error(error);
          currentProgressAnnotation.status = 'error';
          dataStream.writeData(currentProgressAnnotation);
          dataStream.writeMessageAnnotation({
            ...currentProgressAnnotation,
            errorMessage: getLlmProviderErrorMessage(error),
          });

          throw error;
        }
      },
      onError: getLlmProviderErrorMessage,
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (!lastChunk) {
            lastChunk = ' ';
          }

          if (typeof chunk === 'string') {
            if (chunk.startsWith('g') && !lastChunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__liblabThought__\\">"\n`));
            }

            if (lastChunk.startsWith('g') && !chunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
            }
          }

          lastChunk = chunk;

          let transformedChunk = chunk;

          if (typeof chunk === 'string' && chunk.startsWith('g')) {
            let content = chunk.split(':').slice(1).join(':');

            if (content.endsWith('\n')) {
              content = content.slice(0, content.length - 1);
            }

            transformedChunk = `0:${content}\n`;
          }

          // Convert the string stream to a byte stream
          const str = typeof transformedChunk === 'string' ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

/**
 * Tracks telemetry for chat prompts
 */
async function trackChatPrompt(
  conversationId: string,
  llmModel: string,
  user: UserProfile,
  userMessage: string,
): Promise<void> {
  try {
    // TODO: @skos find the environment data source connection string and pass the pluginId (db type) to telemetry
    const pluginId = DataSourcePluginManager.getAccessorPluginId('the current conversation datasource url');

    const telemetry = await getTelemetry();
    await telemetry.trackTelemetryEvent(
      {
        eventType: TelemetryEventType.USER_CHAT_PROMPT,
        properties: {
          conversationId,
          dataSourceType: pluginId,
          llmModel,
          userMessage,
        },
      },
      user,
    );
  } catch (telemetryError) {
    logger.error('Failed to track telemetry event', telemetryError);
  }
}

function getLlmProviderErrorMessage(error: any): string {
  logger.error('LLM provider error:', error);

  if (isAuthorizationError(error)) {
    return 'LLM provider responded with authorization error. Please check that your LLM provider API key is valid and has sufficient permissions.';
  }

  return error?.message || 'Unable to generate response.';
}

function isAuthorizationError(error: any) {
  if (error?.statusCode === 401) {
    return true;
  }

  const errorMessage = error?.message;

  if (
    errorMessage &&
    typeof errorMessage === 'string' &&
    // There is an error handling issue inside the ai sdk for the invalid keys that contain special characters.
    // This is the first part of the error message that gets returned.
    errorMessage.includes(AI_SDK_INVALID_KEY_ERROR)
  ) {
    return true;
  }

  return false;
}
