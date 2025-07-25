import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream } from 'ai';
import { type Messages, type StreamingOptions, streamText } from '~/lib/.server/llm/stream-text';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { DEFAULT_MODEL, WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import { messageService } from '~/lib/services/messageService';
import { MESSAGE_ROLE } from '~/types/database';
import { createId } from '@paralleldrive/cuid2';
import { conversationService } from '~/lib/services/conversationService';
import type { StarterPluginId } from '~/lib/plugins/types';
import type { FileMap } from '~/lib/stores/files';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

const logger = createScopedLogger('api.chat');

async function chatAction({ request }: ActionFunctionArgs) {
  const body = await request.json<{
    messages: Messages;
    files: any;
    conversationId: string;
    promptId?: string;
    contextOptimization: boolean;
  }>();
  const { messages, files, conversationId, promptId, contextOptimization } = body;

  const userMessage = messages.at(-1);

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
              message: 'Analysing Request',
            };
            dataStream.writeData(currentProgressAnnotation);

            // Create a summary of the chat
            console.log(`Messages count: ${messages.length}`);

            summary = await createSummary({
              messages: [...messages],
              contextOptimization,
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
              message: 'Analysis Complete',
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
              message: 'Determining Files to Read',
            };
            dataStream.writeData(currentProgressAnnotation);

            // throw new Error('This is some sort of unexpected error');

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

              currentProgressAnnotation = {
                type: 'progress',
                label: 'context',
                status: 'complete',
                order: progressCounter++,
                message: 'Code Files Selected',
              };
            } else {
              currentProgressAnnotation = {
                type: 'progress',
                label: 'context',
                status: 'complete',
                order: progressCounter++,
                message: 'No Code Files Selected',
              };
            }

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
                const messageProperties = extractPropertiesFromMessage(userMessage);
                const userMessageContent = Array.isArray(messageProperties.content)
                  ? messageProperties.content.find((item) => item.type === 'text')?.text || ''
                  : messageProperties.content;

                await messageService.saveMessage({
                  conversationId,
                  content: userMessageContent,
                  model: DEFAULT_MODEL,
                  annotations: userMessage.annotations,
                  id: userMessage?.id,
                });

                await messageService.saveMessage({
                  conversationId,
                  content: assistantMessageContent,
                  model: DEFAULT_MODEL,
                  inputTokens: usage?.promptTokens,
                  outputTokens: usage?.completionTokens,
                  finishReason,
                  role: MESSAGE_ROLE.ASSISTANT,
                  id: assistantMessage?.id,
                });

                logger.debug('Prompt saved');
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
                message: 'Response Generated',
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
            message: 'Generating Response',
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
            errorMessage: error?.message || 'Unable to generate response.',
          });

          throw error;
        }
      },
      onError: (error: any) => {
        console.log('Error happened!', error);
        return error.message;
      },
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
