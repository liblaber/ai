import { getSystemPrompt } from './prompts/prompts';
import optimized from './prompts/optimized';
import { getExperimentalSystemPrompt } from './prompts/experimental';
import { getDashboardsPrompt } from '~/lib/common/prompts/dashboards';
import { getAppsPrompt } from '~/lib/common/prompts/apps';
import { getCodingAgentPrompt } from '~/lib/common/prompts/coding-agent';
import type { StarterPluginId } from '~/lib/plugins/types';

export interface PromptOptions {
  cwd: string;
  starterId?: StarterPluginId;
  allowedHtmlElements: string[];
  modificationTagName: string;
}

export class PromptLibrary {
  static library: Record<
    string,
    {
      label: string;
      description: string;
      get: (options: PromptOptions) => Promise<string>;
    }
  > = {
    default: {
      label: 'Default Prompt',
      description: 'This is the battle tested default system Prompt',
      get: (options) => getSystemPrompt(options.cwd),
    },
    optimized: {
      label: 'Optimized Prompt (experimental)',
      description: 'an Experimental version of the prompt for lower token usage',
      get: (options) => optimized(options),
    },
    experimental: {
      label: 'Experimental Prompt (experimental)',
      description: 'an Experimental version of the prompt for lower token usage',
      get: (options) => getExperimentalSystemPrompt(options.cwd),
    },
    dashboards: {
      label: 'Dashboards Prompt',
      description: 'This is remix starter bespoke system prompt for internal apps with data dashboards',
      get: (options) => getDashboardsPrompt(options.cwd),
    },
    apps: {
      label: 'Apps Prompt',
      description: 'This is a system prompt for general purpose applications',
      get: (options) => getAppsPrompt(options.cwd, options.starterId),
    },
    'coding-agent': {
      label: 'Coding Agent Prompt',
      description:
        'A specialized prompt for Claude Code CLI that focuses on code generation without liblabArtifact or WebContainer concepts',
      get: () => getCodingAgentPrompt(),
    },
  };
  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description,
      };
    });
  }
  static async getPromptFromLibrary(promptId: string, options: PromptOptions) {
    const prompt = this.library[promptId];

    if (!prompt) {
      throw 'Prompt Now Found';
    }

    return this.library[promptId]?.get(options);
  }
}
