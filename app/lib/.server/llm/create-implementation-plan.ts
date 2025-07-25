import { generateText } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';
import type { StarterPluginId } from '~/lib/plugins/types';

const logger = createScopedLogger('create-implementation-plan');

export async function createImplementationPlan(props: {
  summary?: string;
  userPrompt: string;
  schema: string;
  starterId?: StarterPluginId;
  onFinish?: (response: Awaited<ReturnType<typeof generateText>>) => void;
}): Promise<string> {
  const { summary, userPrompt, schema, starterId, onFinish } = props;
  const llm = await getLlm();

  const starterInstructions = StarterPluginManager.getStarterInstructionsPrompt(starterId);

  try {
    const response = await generateText({
      system: `
You are an expert software engineer capable of generating an implementation plan for an internal web application. Given the following:

- User Request: {userPrompt}
- Conversation Summary: {summary}
- Data Source Schema: {schema}
- Repository instructions: {repositoryInstructions}

Create a concise, step-by-step implementation plan that will be used to guide the SQL query generation and application code generation.
The plan should be clear, simple, actionable, and focused on the main tasks required.
If the user prompt is very broad, expand the plan in accordance with the conversation summary and data source schema.
The plan should not be expanded beyond the scope of the user's request and should not overcomplicate the solution.
 - E.g. If user requests a dashboard, the plan should not suggest creating more than 6 different components.
If the user prompt is very specific, do not expand the plan, but make sure to include all the steps required to fulfill the user's request.
Briefly describe what the UI components should look like and how they should be connected to the data source.
The plan should not include verification steps or any other steps that are not related to the main tasks required.
The plan should not include complex optimization techniques or any other steps that are not related to the main tasks required.

This plan will be used to guide both SQL query generation and application code generation.

Respond ONLY with the implementation plan, without any code snippets and queries.
      `,
      prompt: `
<userRequest>
${userPrompt}
</userRequest>

<summary>
${summary}
</summary>

<schema>
${schema}
</schema>

<repositoryInstructions>
${starterInstructions}
</repositoryInstructions>
`,
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
    });

    onFinish?.(response);

    return response.text;
  } catch (error) {
    logger.error(`Error occurred while creating implementation plan`, error);
    throw error;
  }
}
