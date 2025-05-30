import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { conversationService } from '~/lib/services/conversationService';

export async function action({ request }: LoaderFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const conversation = await conversationService.createConversation();

    return json({
      id: conversation.id,
      success: true,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);

    return json(
      {
        error: 'Failed to create conversation',
        success: false,
      },
      { status: 500 },
    );
  }
}
