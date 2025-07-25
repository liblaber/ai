import { logger } from '~/utils/logger';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Llm } from './get-llm';

const implementationPlanDecisionSchema = z.object({
  shouldCreateImplementationPlan: z.boolean(),
  explanation: z.string(),
});

/**
 * Determines whether a user prompt requires a detailed implementation plan
 * or if it's a simple, straightforward change that doesn't need elaboration.
 *
 * @param userPrompt - The user's request/prompt
 * @param llm - The LLM instance to use for decision making
 * @returns Promise<boolean> - true if implementation plan is needed, false if simple change
 */
export async function shouldCreateImplementationPlan(userPrompt: string, llm: Llm): Promise<boolean> {
  logger.info(`Deciding if implementation plan needed...`);

  const systemPrompt = `You are an experienced software engineer tasked with determining whether a user's request requires a detailed implementation plan or if it's a simple, straightforward change that can be implemented directly.

Your goal is to analyze the user's intent and decide if the request needs:
1. A detailed implementation plan with multiple steps, architectural decisions, and careful planning
2. A simple, direct implementation that can be done immediately

Consider the user's prompt:

<user_prompt>
${userPrompt}
</user_prompt>
}

Analyze the user's prompt carefully. Consider the following factors:

**Simple/Straightforward Changes (shouldCreateImplementationPlan: false):**
- Minor UI tweaks (colors, spacing, text changes)
- Simple bug fixes with clear solutions
- Adding basic features that follow existing patterns
- Small refactoring tasks
- Documentation updates
- Simple configuration changes

**Complex Changes Requiring Plans (shouldCreateImplementationPlan: true):**
- New pages, features or components
- Complex business logic implementations
- Security implementations
- Vague user requests that require clarification

Be concise in your explanation (one sentence).

Based on your analysis, make a decision on whether an implementation plan is needed. Output your decision in the following JSON format:
{
  "shouldCreateImplementationPlan": true/false,
  "explanation": "Your concise explanation here"
}

Remember, your task is to determine if the user's request requires careful planning and multiple steps, or if it can be implemented directly.`;

  try {
    const result = await generateObject({
      schema: implementationPlanDecisionSchema,
      model: llm.instance,
      maxTokens: llm.maxOutputTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!result?.object) {
      logger.error('No result object received from LLM for implementation plan decision, returning true...');
      return true; // Default to creating plan if decision fails
    }

    const { shouldCreateImplementationPlan, explanation } = result.object;

    logger.info(`Determining if implementation plan needed for prompt: ${userPrompt}`);
    logger.info(`Should create implementation plan: ${shouldCreateImplementationPlan}, explanation: ${explanation}`);

    return shouldCreateImplementationPlan;
  } catch (error) {
    logger.error('Error determining if implementation plan is needed:', error);
    return true; // Default to creating plan if decision fails
  }
}
