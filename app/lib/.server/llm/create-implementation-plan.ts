import { generateText } from 'ai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('create-implementation-plan');

export async function createImplementationPlan(props: {
  summary?: string;
  userPrompt: string;
  databaseSchema: string;
  examples: string;
  env?: Env;
  apiKeys?: Record<string, string>;
  onFinish?: (resp: any) => void;
}): Promise<string> {
  const { summary, userPrompt, databaseSchema, examples, env: serverEnv, apiKeys, onFinish } = props;
  const currentModel = DEFAULT_MODEL;
  const provider = DEFAULT_PROVIDER;

  try {
    const resp = await generateText({
      system: `
You are an expert software architect. Given the following:

- User Request: {userPrompt}
- Conversation Summary: {summary}
- Database Schema: {databaseSchema}

Examples for Inspiration:
---
${examples}
---

Create a concise, step-by-step implementation plan for fulfilling the user's request. The plan should be clear, actionable, and focused on the main tasks required. Limit the plan to max 5 steps, and avoid unnecessary details. This plan will be used to guide both SQL query generation and application code generation.

Respond ONLY with the implementation plan, without any code snippets.
      `,
      prompt: `
<userRequest>
${userPrompt}
</userRequest>

<summary>
${summary}
</summary>

<databaseSchema>
${databaseSchema}
</databaseSchema>
`,
      model: provider.getModelInstance({
        model: currentModel,
        serverEnv,
        apiKeys,
      }),
    });

    const response = resp.text;

    console.log('Response text:', response);

    if (onFinish) {
      onFinish(resp);
    }

    return response;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}
