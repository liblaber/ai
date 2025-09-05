import { generateObject } from 'ai';
import { z } from 'zod';
import { createScopedLogger } from '~/utils/logger';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';
import type { StarterPluginId } from '~/lib/plugins/types';
import { shouldCreateImplementationPlan } from '~/lib/.server/llm/implementation-plan-decision';

const logger = createScopedLogger('create-implementation-plan');

const implementationPlanSchema = z.object({
  implementationPlan: z
    .string()
    .describe(
      'A short, concise, step-by-step implementation plan that will be used to guide the application code generation',
    ),
  requiresAdditionalDataSourceContext: z
    .boolean()
    .describe('Whether the implementation requires additional context from the data source'),
});

export type ImplementationPlan = z.infer<typeof implementationPlanSchema>;

export async function createImplementationPlan(props: {
  userPrompt: string;
  isFirstUserMessage: boolean;
  schema?: string;
  summary?: string;
  starterId?: StarterPluginId;
  onFinish?: (response: Awaited<ReturnType<typeof generateObject>>) => void;
}): Promise<ImplementationPlan | undefined> {
  const llm = await getLlm();
  const { isFirstUserMessage, summary, userPrompt, schema, starterId, onFinish } = props;

  if (!isFirstUserMessage && !(await shouldCreateImplementationPlan(userPrompt, llm))) {
    return undefined;
  }

  const starterInstructions = StarterPluginManager.getStarterInstructionsPrompt(starterId);

  try {
    const response = await generateObject({
      schema: implementationPlanSchema,
      system: `
You are an expert software engineer capable of generating an short and concise implementation plan for an internal web application. Given the following:

- User Request: {userPrompt}
- Conversation Summary: {summary}
- Data Source Schema: {schema} (Optional)
- Repository instructions: {repositoryInstructions}

Your task is to:
1. Create a concise, step-by-step implementation plan that will be used to guide the application code generation
2. Determine whether the implementation requires additional context from the data source
 - Implementation plan should never suggest data mocking, instead it should suggest using real data from the data source

For the implementation plan:
- Make it clear, simple, actionable, and focused on the main tasks required
- If the user prompt is very broad, expand the plan in accordance with the conversation summary and data source schema
- The plan should not be expanded beyond the scope of the user's request and should not overcomplicate the solution
- E.g. If user requests a dashboard, the plan should not suggest creating more than 6 different components
- If the user prompt is very specific, do not expand the plan, but make sure to include all the steps required to fulfill the user's request
- Briefly describe what the UI components should look like and how they should be connected to the data source
- The plan should not include verification steps or any other steps that are not related to the main tasks required
- The plan should not include complex optimization techniques or any other steps that are not related to the main tasks required

For the datasource requirement:
- Additional context includes things like specific API endpoints, database queries, or other data source interactions that are necessary to fulfill the user's request
- For external services, additional context provides API endpoints that will be used to generate the application code
- Most of the time, the additional context is required to enrich the implementation plan with specific details about how the application will interact with the data source
- Only for simple requests, such as bug fixes or UI changes, additional context is not required, since the implementation plan can be generated based on the user request and conversation summary alone

Think carefully about the user's request and the conversation context before generating the implementation plan and deciding on the datasource requirement.
      `,
      prompt: `
<userRequest>
${userPrompt}
</userRequest>

<summary>
${summary}
</summary>

${schema ? `<schema>${schema}</schema>` : ''}

<repositoryInstructions>
${starterInstructions}
</repositoryInstructions>
`,
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
    });

    onFinish?.(response);

    if (!response?.object) {
      throw new Error('No result object received from LLM for implementation plan');
    }

    return {
      ...response.object,
      requiresAdditionalDataSourceContext: isFirstUserMessage || response.object.requiresAdditionalDataSourceContext,
    };
  } catch (error) {
    logger.error(`Error occurred while creating implementation plan`, error);
    throw error;
  }
}
