import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { conversationService } from '~/lib/services/conversationService';

export async function action({ request }: LoaderFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as {
      dataSourceId: string;
    };

    if (!body?.dataSourceId) {
      return Response.json({ error: 'Datasource id is required' }, { status: 400 });
    }

    const conversation = await conversationService.createConversation(body.dataSourceId);

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
