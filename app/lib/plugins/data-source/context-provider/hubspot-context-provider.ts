import { z } from 'zod';
import type {
  AdditionalContextInput,
  AdditionalContextOutput,
  DataSourceContextProvider,
} from '~/lib/plugins/data-source/context-provider/data-source-context-provider';
import { generateObject } from 'ai';
import { getLlm } from '~/lib/.server/llm/get-llm';
import { logger } from '~/utils/logger';

const parameter = z.object({
  name: z.string().describe('Name of the parameter'),
  type: z
    .union([z.literal('query'), z.literal('path'), z.literal('header'), z.literal('body')])
    .describe('Type of the parameter'),
  required: z.boolean().describe('Whether the parameter is required'),
});

const hubspotEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method for the endpoint'),
  url: z.string().url().describe('Full HubSpot API endpoint URL'),
  parameters: z.array(parameter).describe('List of parameters required for the endpoint'),
  response: z.string().describe('Expected response schema in JSON format'),
  desc: z.string().min(10).describe('Brief description of what the endpoint does'),
});

const hubspotEndpointsSchema = z.object({
  endpoints: z.array(hubspotEndpointSchema).min(1).describe('Array of HubSpot API endpoints needed'),
});

type HubspotEndpoints = z.infer<typeof hubspotEndpointsSchema>;

export class HubspotContextProvider implements DataSourceContextProvider {
  async getContext(input: AdditionalContextInput): Promise<AdditionalContextOutput> {
    try {
      const systemPrompt = this._getSystemPrompt(input);
      const llm = await getLlm();

      const result = await generateObject({
        schema: hubspotEndpointsSchema,
        model: llm.instance,
        maxTokens: llm.maxOutputTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: input.userPrompt }],
      });

      logger.debug(`Generated endpoints: \n\n${JSON.stringify(result.object, null, 2)}`);

      if (!result || !result.object || !Array.isArray(result.object.endpoints)) {
        logger.error(`Invalid response format from LLM: ${JSON.stringify(result)}`);
        return {
          additionalContext: null,
          llmUsage: result?.usage,
        };
      }

      return { additionalContext: this._mapEndpointsToPrompt(result.object), llmUsage: result?.usage };
    } catch (error) {
      logger.error('Error generating HubSpot API context:', error);
      return {
        additionalContext: null,
      };
    }
  }

  private _getSystemPrompt({ userPrompt, conversationSummary, implementationPlan }: AdditionalContextInput): string {
    return `
You are a HubSpot API specialist that analyzes requirements and maps them to specific API endpoints.
Given user requirements, conversation context, and implementation plan, determine the exact
HubSpot API endpoints needed.

<userPrompt>
${userPrompt}
</userPrompt>

${conversationSummary ? `<conversationSummary>${conversationSummary}</conversationSummary>` : ''}
${implementationPlan ? `Use the following implementation plan for context, to inform your endpoint selection: <implementationPlan>${implementationPlan}</implementationPlan>` : ''}

Your task is to analyze the inputs and return a structured response with required HubSpot API endpoints.

Use the following Hubspot API knowledge for more accurate endpoint selection:

<hubspotApiKnowledge>
  Base URL: https://api.hubapi.com
  Authentication: Bearer
  Common Objects: contacts, companies, deals, tickets, products, quotes
  Key Endpoints:

  Single object: /crm/v3/objects/{objectType}/{objectId}
  List objects: /crm/v3/objects/{objectType}
  Search: /crm/v3/objects/{objectType}/search
  Batch: /crm/v3/objects/{objectType}/batch/read
  Properties: /crm/v3/properties/{objectType}
  Associations: /crm/v4/associations/{fromObjectType}/{toObjectType}
</hubspotApiKnowledge>

1. Analyze the user requirements carefully
2. Identify which HubSpot objects/data are needed
3. Determine if search, filtering, or associations are required
4. Map to specific API endpoints with exact parameters
5. Return only endpoints that are necessary to fulfill the requirements, do not include unnecessary endpoints
6. Provide clear and concise description of what each endpoint does
7. Include appropriate HTTP method, headers, and parameters for each endpoint
`;
  }

  private _mapEndpointsToPrompt(endpoints: HubspotEndpoints): string {
    return `<hubspotEndpoints>
  ${endpoints.endpoints
    .map((endpoint) => {
      const pathParams = endpoint.parameters
        .filter((p) => p.type === 'path')
        .map((p) => p.name)
        .join(', ');
      const queryParams = endpoint.parameters
        .filter((p) => p.type === 'query')
        .map((p) => p.name)
        .join(', ');
      const bodyParams = endpoint.parameters
        .filter((p) => p.type === 'body')
        .map((p) => p.name)
        .join(', ');
      const headerParams = endpoint.parameters
        .filter((p) => p.type === 'header')
        .map((p) => p.name)
        .join(', ');

      return `  <endpoint method="${endpoint.method}" url="${endpoint.url}">
    <params${pathParams ? ` path="${pathParams}"` : ''}${queryParams ? ` query="${queryParams}?"` : ''}${bodyParams ? ` body="${bodyParams}"` : ''}${headerParams ? ` headers="${headerParams}"` : ''}/>
    <response>${endpoint.response}</response>
    <desc>${endpoint.desc}</desc>
  </endpoint>`;
    })
    .join('\n  \n')}
</hubspotEndpoints>

VERY IMPORTANT: Always use process.env.ACCESS_TOKEN for Bearer authentication in generated code.`;
  }
}
