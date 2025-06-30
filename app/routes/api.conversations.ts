import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { conversationService } from '~/lib/services/conversationService';
import type { Message } from '@prisma/client';
import { snapshotService } from '~/lib/services/snapshotService';
import { messageService } from '~/lib/services/messageService';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

export async function action({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as {
      dataSourceId: string;
      description?: string;
      messages?: Message[];
    };

    if (!body?.dataSourceId) {
      return Response.json({ error: 'Datasource id is required' }, { status: 400 });
    }

    const conversation = await prisma.$transaction(async (tx) => {
      logger.info('Creating a new conversation...');

      const conversation = await conversationService.createConversation(
        body.dataSourceId,
        userId,
        body.description,
        tx,
      );

      if (!body?.messages?.length) {
        logger.info(`No messages to duplicate for conversation ${conversation.id}`);

        return conversation;
      }

      const messageIds = body.messages.map((message) => message.id);
      logger.info(`Found ${messageIds.length} messages to duplicate for conversation ${conversation.id}`);

      logger.info(`Getting latest snapshot for messages ${messageIds.join(', ')}`);

      const snapshot = await snapshotService.getLatestSnapshotForMessages(messageIds);

      if (snapshot) {
        logger.info(`Found latest snapshot ${snapshot.id} for messages, messageId: ${snapshot.messageId}`);

        const saveMessageModels = body.messages.map((message) => ({
          ...message,
          id: createId(),
          conversationId: conversation.id,
        }));

        await messageService.saveMessages(saveMessageModels, tx);

        const newSnapshot = {
          ...snapshot,
          conversation,
          messageId: saveMessageModels.at(-1)?.id ?? null,
          conversationId: conversation.id,
          createdAt: undefined,
          id: undefined,
        };
        logger.info(`Creating new snapshot db entry for conversation ${conversation.id}`);

        const createdSnapshot = await snapshotService.createSnapshot(newSnapshot, tx);
        logger.info(`New snapshot ${createdSnapshot.id} created for conversation ${conversation.id}`);
      } else {
        logger.info(`No snapshot found for messages ${messageIds.join(', ')}`);
      }

      return conversation;
    });

    return Response.json({
      id: conversation.id,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);

    return Response.json(
      {
        error: 'Failed to create conversation',
      },
      { status: 500 },
    );
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const userId = await requireUserId(request);

  try {
    const conversations = await conversationService.getAllConversations(userId);
    return Response.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return Response.json(
      {
        error: 'Failed to fetch conversations',
      },
      { status: 500 },
    );
  }
}
