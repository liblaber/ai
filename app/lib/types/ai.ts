export type Message = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text: string }>;
  isFirstUserMessage?: boolean;
  annotations?: string[];
};

export type Messages = Message[];

export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

export type LanguageModelV1 = {
  generateText: (params: { prompt: string; maxTokens?: number; temperature?: number; stop?: string[] }) => Promise<{
    text: string;
    finishReason: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
};

export type CoreTool = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};

export type GenerateTextResult = {
  text: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type StreamingOptions = {
  onFinish?: (result: { text: string; finishReason: string; usage?: any }) => void;
  toolChoice?: string;
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
