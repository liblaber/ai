export const DEFAULT_MAX_OUTPUT_TOKENS = 20000;

// limits the number of model responses that can be returned in a single request
export const MAX_RESPONSE_SEGMENTS = 2;

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
}

export interface Folder {
  type: 'folder';
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yml',
];

/**
 * Get the maximum number of tokens for a given provider and model.
 * @param provider - The provider of the model.
 * @param model - The model to get the maximum number of tokens for.
 * @returns The maximum number of tokens for the given provider and model.
 */
export const getMaxTokens = (provider: string, model: string): number => {
  const providerMap = MAX_OUTPUT_TOKENS_MAP[provider];

  if (providerMap) {
    for (const modelPrefix in providerMap) {
      // To avoid specifying the exact model name, we use the prefix to match the model name.
      // e.g. 'claude-3-5-sonnet' matches 'claude-3-5-sonnet-20240620' or 'claude-3-5-sonnet-latest'
      if (model.startsWith(modelPrefix)) {
        return providerMap[modelPrefix];
      }
    }
  }

  return DEFAULT_MAX_OUTPUT_TOKENS;
};

const MAX_OUTPUT_TOKENS_MAP: Record<string, Record<string, number>> = {
  Anthropic: {
    'claude-3-5-sonnet': 8192,
    'claude-3-7-sonnet': 64000,
    'claude-sonnet-4': 64000,
    'claude-opus': 32000,
  },
  Google: {
    'gemini-2.5-flash': 65000,
    'gemini-2.5-pro': 65000,
  },
};
