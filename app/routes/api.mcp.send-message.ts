import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { runServerStyleClient } from '~/lib/.server/llm/mcp-client';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { query } = (await request.json()) as { query?: string };

    if (!query || typeof query !== 'string') {
      return json({ success: false, error: 'Invalid query provided.' }, { status: 400 });
    }

    const result = await runServerStyleClient(query);

    return json({
      success: true,
      data: {
        message: result.message,
        conversation: result.conversation,
        toolCalls: result.toolCalls,
      },
    });
  } catch (error) {
    console.error('Error processing MCP request:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 },
    );
  }
}
