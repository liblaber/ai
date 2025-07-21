'use client';

import type { Message } from '@ai-sdk/react';
import { useCallback, useState } from 'react';
import { NO_EXECUTE_ACTION_ANNOTATION, StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');

      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      // we only add shell actions when the close tag got parsed because only then we have the content
      if (data.action.type === 'file') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type === 'commit-message') {
        workbenchStore.setMostRecentCommitMessage(data.action.content);
      } else if (data.action.type !== 'file') {
        workbenchStore.addAction(data);
      }

      workbenchStore.runAction(data);
    },
    onActionStream: (data) => {
      logger.trace('onActionStream', data.action);
      workbenchStore.runAction(data, true);
    },
  },
});

const extractTextContent = (message: Message) =>
  Array.isArray(message.content)
    ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
    : message.content;

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: string]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (process.env.NODE_ENV === 'development' && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    for (const message of messages) {
      if (message.role === 'assistant' || message.role === 'user') {
        const shouldExecuteActions = !message.annotations?.some(
          (annotation) => annotation === NO_EXECUTE_ACTION_ANNOTATION,
        );
        const newParsedContent = messageParser.parse(message.id, extractTextContent(message), shouldExecuteActions);
        setParsedMessages((prevParsed) => ({
          ...prevParsed,
          [message.id]: !reset ? (prevParsed[message.id] || '') + newParsedContent : newParsedContent,
        }));
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
