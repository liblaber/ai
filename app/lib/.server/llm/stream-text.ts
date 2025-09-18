import { generateId, type Message } from 'ai';
import { type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { MessageRole, MODIFICATIONS_TAG_NAME, WORK_DIR } from '~/utils/constants';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';
import type { StarterPluginId } from '~/lib/plugins/types';
import type { ImplementationPlan } from '~/lib/.server/llm/create-implementation-plan';
import { type Conversation } from '@prisma/client';
import { spawn } from 'child_process';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export type Messages = Message[];

export type StreamingOptions = {
  experimental_generateMessageId?: () => string;
  toolChoice?: 'none';
  onFinish?: (params: {
    text: string;
    finishReason: string;
    usage: any;
    response: { messages: any[] };
  }) => Promise<void>;
};

const logger = createScopedLogger('stream-text');

// Helper function to recursively copy files and directories
async function copyDirectory(src: string, dest: string): Promise<void> {
  const srcStat = await stat(src);

  if (srcStat.isDirectory()) {
    // Create destination directory
    await mkdir(dest, { recursive: true });

    // Read all items in source directory
    const items = await readdir(src);

    // Copy each item recursively
    for (const item of items) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);
      await copyDirectory(srcPath, destPath);
    }
  } else {
    // Copy file
    await copyFile(src, dest);
  }
}

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
    (await PromptLibrary.getPromptFromLibrary('coding-agent', {
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

  // Prepare the user message for Claude Code CLI (remove newlines)
  const cleanUserMessage = lastUserMessage.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  // Create temporary directory for Claude Code execution
  const tempDir = join(tmpdir(), `claude-code-${conversation.id}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  logger.info(`Created temporary directory for Claude Code: ${tempDir}`);

  // Copy next-starter directory to temp directory
  const nextStarterPath = join(process.cwd(), 'starters', 'next-starter');

  try {
    await copyDirectory(nextStarterPath, tempDir);
    logger.info(`Copied next-starter directory to temp directory: ${tempDir}`);
  } catch (copyError) {
    logger.error('Error copying next-starter directory:', copyError);
    // Continue execution even if copy fails
  }

  // Create CLAUDE.md file with the system prompt
  try {
    const claudeMdPath = join(tempDir, 'CLAUDE.md');
    await writeFile(
      claudeMdPath,
      systemPrompt +
        `
 ${additionalDataSourceContext}`,
      'utf-8',
    );
    logger.info(`Created CLAUDE.md file with system prompt: ${claudeMdPath}`);
  } catch (writeError) {
    logger.error('Error creating CLAUDE.md file:', writeError);
    // Continue execution even if file creation fails
  }

  // Create a custom stream implementation that mimics the AI SDK's streamText return type
  let fullOutput = '';
  const createdFiles: { [key: string]: string } = {};
  let isComplete = false;
  let hasError = false;
  let claudeProcess: any = null;

  // Store all chunks for replay capability
  const chunks: any[] = [];

  // Create a readable stream for the full stream
  const fullStream = new ReadableStream({
    start(controller) {
      // Spawn Claude Code CLI process (system prompt is in CLAUDE.md file)
      logger.info(
        `all messages: ${processedMessages.map((message, i) => `counter: ${i}, content: ${message.content}`).join('\n---\n')}`,
      );
      claudeProcess = spawn('claude', ['--dangerously-skip-permissions', '-p', cleanUserMessage], {
        cwd: tempDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
      });

      // Handle stdout (Claude Code output)
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        fullOutput += output;

        const chunk = {
          type: 'text-delta',
          textDelta: output,
        };

        // Store chunk for replay
        chunks.push(chunk);

        // Enqueue text chunks to the stream
        controller.enqueue(chunk);
      });

      // Handle stderr (errors)
      claudeProcess.stderr.on('data', (data: Buffer) => {
        const errorOutput = data.toString();
        logger.error(`Claude Code stderr: ${errorOutput}`);

        const chunk = {
          type: 'text-delta',
          textDelta: `[ERROR] ${errorOutput}`,
        };

        // Store chunk for replay
        chunks.push(chunk);

        // Enqueue error chunks to the stream
        controller.enqueue(chunk);
      });

      // Handle process completion
      claudeProcess.on('close', async (code: number) => {
        try {
          logger.info(`Claude Code process completed with code: ${code}`);

          // Read all files created in the temp directory
          try {
            const files = await readdir(tempDir, { withFileTypes: true });

            for (const file of files) {
              if (file.isFile()) {
                const filePath = join(tempDir, file.name);
                const content = await readFile(filePath, 'utf-8');
                createdFiles[file.name] = content;

                // Create file creation chunks
                const fileChunks = [
                  {
                    type: 'text-delta',
                    textDelta: `\n[FILE CREATED] ${file.name}\n`,
                  },
                  {
                    type: 'text-delta',
                    textDelta: `\`\`\`\n${content}\n\`\`\`\n`,
                  },
                ];

                // Store chunks for replay
                chunks.push(...fileChunks);

                // Enqueue file creation information
                for (const fileChunk of fileChunks) {
                  controller.enqueue(fileChunk);
                }
              }
            }
          } catch (fileError) {
            logger.error('Error reading created files:', fileError);
          }

          // Call onFinish callback if provided
          if (options?.onFinish) {
            await options.onFinish({
              text: fullOutput,
              finishReason: code === 0 ? 'stop' : 'error',
              usage: { totalTokens: 0 }, // Claude Code doesn't provide token usage
              response: { messages: [] },
            });
          }

          // Clean up temporary directory
          try {
            // await rm(tempDir, { recursive: true, force: true });
            logger.info(`Cleaned up temporary directory: ${tempDir}`);
          } catch (cleanupError) {
            logger.error('Error cleaning up temporary directory:', cleanupError);
          }

          isComplete = true;
          controller.close();
        } catch (err) {
          logger.error('Error in Claude Code completion handler:', err);
          hasError = true;
          controller.error(err);
        }
      });

      // Handle process errors
      claudeProcess.on('error', (err: Error) => {
        logger.error(`Claude Code process error: ${err.message}`);
        hasError = true;
        controller.error(err);
      });

      // Set up timeout (optional)
      const timeout = setTimeout(() => {
        if (claudeProcess) {
          claudeProcess.kill();
        }

        const timeoutError = new Error('Claude Code process timed out');
        hasError = true;
        controller.error(timeoutError);
      }, 300000); // 5 minutes timeout

      claudeProcess.on('close', () => {
        clearTimeout(timeout);
      });
    },
  });

  // Create a function that creates a new readable stream from stored chunks
  const createReplayStream = () => {
    return new ReadableStream({
      start(controller) {
        // If we have stored chunks, replay them
        if (chunks.length > 0) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }

          if (isComplete) {
            controller.close();
          }
        } else {
          // If no chunks yet, wait for them
          const checkForChunks = () => {
            if (chunks.length > 0) {
              for (const chunk of chunks) {
                controller.enqueue(chunk);
              }

              if (isComplete) {
                controller.close();
              }
            } else if (!isComplete && !hasError) {
              // Check again in a bit
              setTimeout(checkForChunks, 10);
            } else {
              controller.close();
            }
          };
          checkForChunks();
        }
      },
    });
  };

  // Return an object that mimics the AI SDK's streamText return type
  return {
    fullStream,
    mergeIntoDataStream: (targetStream: any) => {
      // Create a new readable stream that forwards data to the target stream
      const mergedStream = new ReadableStream({
        start(controller) {
          const replayStream = createReplayStream();
          const reader = replayStream.getReader();

          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              // Forward the chunk to both the controller and target stream
              controller.enqueue(value);

              // If targetStream has a write method, use it
              if (targetStream && typeof targetStream.write === 'function') {
                if (value.type === 'text-delta') {
                  targetStream.write(value.textDelta);
                }
              }

              // eslint-disable-next-line consistent-return
              return pump();
            });
          }

          return pump();
        },
      });

      return mergedStream;
    },

    pipeTo: (destination: any) => {
      // Simple pipe implementation using replay stream
      const replayStream = createReplayStream();
      const reader = replayStream.getReader();

      function pump(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) {
            if (destination && typeof destination.close === 'function') {
              destination.close();
            }

            return;
          }

          if (destination && typeof destination.write === 'function') {
            if (value.type === 'text-delta') {
              destination.write(value.textDelta);
            }
          }

          // eslint-disable-next-line consistent-return
          return pump();
        });
      }

      return pump();
    },
  };
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
