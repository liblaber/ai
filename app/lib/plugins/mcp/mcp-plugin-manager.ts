import type { McpChatMessage, McpChatResponse } from '~/lib/.server/llm/mcp-client';

export class McpPluginManager {
  static async sendRequest(query: string, conversation: McpChatMessage[]): Promise<McpChatResponse> {
    try {
      const response = await fetch('/api/mcp/send-message', {
        method: 'POST',
        body: JSON.stringify({ query, conversation }),
      });

      if (!response.ok) {
        throw new Error(`MCP HTTP error! status: ${response.status}`);
      }

      const body: { success: boolean; error?: string; data?: unknown } = await response.json();

      if (!body.success) {
        throw new Error(body.error || 'Unknown error from MCP');
      }

      return body.data as McpChatResponse;
    } catch (error) {
      console.error('Error sending request to MCP:', error);
      throw error;
    }
  }
}
