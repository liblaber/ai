import { Anthropic } from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import dotenv from 'dotenv';
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const model = 'claude-3-5-sonnet-20241022'; // TODO: Make this configurable

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export interface McpChatMessage {
  role: 'user' | 'assistant';
  content: string | any[];
}

export interface McpChatResponse {
  message: string;
  conversation: McpChatMessage[];
  toolCalls?: Array<{
    name: string;
    input: any;
    result: any;
  }>;
}

class MCPClientSingleton {
  private static _instance: MCPClientSingleton;
  private _mcp: Client;
  private _anthropic: Anthropic;
  private _transport: StreamableHTTPClientTransport | null = null;
  private _tools: any[] = [];
  private _isConnected = false;
  private _isCleaningUp = false;
  private _isInitializing = false;

  private constructor() {
    this._anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this._mcp = new Client({ name: 'mcp-client', version: '1.0.0' });
  }

  static getInstance(): MCPClientSingleton {
    if (!MCPClientSingleton._instance) {
      MCPClientSingleton._instance = new MCPClientSingleton();
    }

    return MCPClientSingleton._instance;
  }

  async initialize(): Promise<void> {
    if (this._isConnected || this._isInitializing) {
      return; // Already connected or connecting
    }

    this._isInitializing = true;

    try {
      console.log('Initializing MCP client...');

      const url = new URL('https://mcp.liblab.io/liblab-dev'); // TODO: MOVE THIS OUT OF HERE
      this._transport = new StreamableHTTPClientTransport(url);
      await this._mcp.connect(this._transport);

      // Set up error handlers with cleanup protection
      this._transport.onclose = async () => {
        console.log('MCP Transport closed');

        if (!this._isCleaningUp) {
          this._isConnected = false;
          this._transport = null;
        }
      };

      this._transport.onerror = async (error: any) => {
        console.log('MCP Transport error', error);

        if (!this._isCleaningUp) {
          this._isConnected = false;
          this._transport = null;
        }
      };

      const toolsResult = await this._mcp.listTools();
      this._tools = toolsResult.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description ?? '',
        input_schema: tool.inputSchema,
      }));

      this._isConnected = true;
      console.log(
        'MCP client initialized. Available tools:',
        this._tools.map((t) => t.name),
      );
    } catch (error) {
      console.log('Failed to initialize MCP client:', error);
      this._isConnected = false;
      this._transport = null;
      throw error;
    } finally {
      this._isInitializing = false;
    }
  }

  async ensureConnected(): Promise<void> {
    if (!this._isConnected) {
      await this.initialize();
    }
  }

  getTools(): any[] {
    return this._tools;
  }

  isClientConnected(): boolean {
    return this._isConnected;
  }

  async chat(conversation: McpChatMessage[]): Promise<McpChatResponse> {
    await this.ensureConnected();

    if (!this._isConnected) {
      throw new Error('Failed to connect to MCP server');
    }

    console.log('Sending MCP query to Anthropic...');

    let response = await this._anthropic.messages.create({
      model,
      max_tokens: 1000,
      messages: conversation,
      tools: this._tools,
    });

    const conversationMessages = [...conversation];
    const toolCalls: Array<{ name: string; input: any; result: any }> = [];
    let finalMessage = '';

    // Process the response and handle tool calls
    while (true) {
      let hasToolCalls = false;
      const assistantMessage: McpChatMessage = { role: 'assistant', content: [] };
      const toolResults: any[] = [];

      // First pass: collect all content and execute tool calls
      for (const content of response.content) {
        if (content.type === 'text') {
          finalMessage = content.text; // Keep track of the final text response
          (assistantMessage.content as any[]).push({ type: 'text', text: content.text });
        } else if (content.type === 'tool_use') {
          hasToolCalls = true;
          (assistantMessage.content as any[]).push(content);

          console.log(`MCP Tools requested: ${content.name}`);

          try {
            const toolResult = await this._mcp.callTool({
              name: content.name,
              arguments: content.input as { [x: string]: unknown },
            });

            console.log(`MCP Tool response received for: ${content.name}`);

            toolCalls.push({
              name: content.name,
              input: content.input,
              result: toolResult.content,
            });

            // Store tool result for later use
            toolResults.push({
              tool_use_id: content.id,
              content: Array.isArray(toolResult.content)
                ? toolResult.content.map((c) => c.text || JSON.stringify(c)).join('\n')
                : toolResult.content,
            });
          } catch (error) {
            console.log(`MCP Tool call failed for ${content.name}:`, error);
            toolResults.push({
              tool_use_id: content.id,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }

      // Add assistant message to conversation
      conversationMessages.push(assistantMessage);

      if (!hasToolCalls) {
        // No more tool calls, we're done
        break;
      }

      // Add tool result messages
      for (const toolResult of toolResults) {
        conversationMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolResult.tool_use_id,
              content: toolResult.content,
            },
          ],
        });
      }

      console.log('MCP sending follow-up message to Anthropic...');

      // Continue the conversation with tool results
      response = await this._anthropic.messages.create({
        model,
        max_tokens: 1000,
        messages: conversationMessages,
        tools: this._tools,
      });
    }

    return {
      message: finalMessage,
      conversation: conversationMessages,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  async cleanup(): Promise<void> {
    if (this._isCleaningUp || !this._isConnected) {
      return;
    }

    this._isCleaningUp = true;
    console.log('Cleaning up MCP client...');

    try {
      if (this._transport) {
        this._transport.onclose = undefined;
        this._transport.onerror = undefined;
      }

      await this._mcp.close();
    } catch (error) {
      console.log('Error closing MCP client:', error);
    } finally {
      this._isConnected = false;
      this._transport = null;
      this._isCleaningUp = false;
      console.log('MCP client cleaned up.');
    }
  }
}

// Export the singleton instance
export const mcpClient = MCPClientSingleton.getInstance();

// Simplified function for your existing code
export async function runServerStyleClient(
  query: string,
  previousConversation: McpChatMessage[] = [],
): Promise<McpChatResponse> {
  try {
    // Build the conversation array
    const conversation: McpChatMessage[] = [...previousConversation, { role: 'user', content: query }];

    const result = await mcpClient.chat(conversation);

    console.log('MCP chat completed successfully');

    return result;
  } catch (error) {
    console.log('MCP error in chat:', error);
    throw error;
  }
}

// Helper function to get available tools
export async function getAvailableTools(): Promise<any[]> {
  await mcpClient.ensureConnected();
  return mcpClient.getTools();
}

// Helper function to check connection status
export function isConnected(): boolean {
  return mcpClient.isClientConnected();
}
