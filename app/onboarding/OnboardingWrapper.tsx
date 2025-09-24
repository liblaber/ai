import { env } from '~/env';
import OnboardingClient from './OnboardingClient';

export default function OnboardingWrapper() {
  // Only pass existence flags and non-sensitive values to client
  const envVars = {
    // Non-sensitive configuration
    defaultLlmProvider: env.server.DEFAULT_LLM_PROVIDER,
    defaultLlmModel: env.server.DEFAULT_LLM_MODEL,
    ollamaApiBaseUrl: env.server.OLLAMA_API_BASE_URL,
    disableTelemetry: env.client.NEXT_PUBLIC_DISABLE_TELEMETRY,

    // Existence flags only (no actual values)
    hasGoogleOAuth: !!(env.server.GOOGLE_CLIENT_ID && env.server.GOOGLE_CLIENT_SECRET),
    hasOidcSso: !!(env.server.OIDC_ISSUER && env.server.OIDC_CLIENT_ID && env.server.OIDC_CLIENT_SECRET),
    hasOidcDomain: !!env.server.OIDC_DOMAIN,

    // API Key existence flags (no actual keys)
    hasAnthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
    hasOpenaiApiKey: !!process.env.OPENAI_API_KEY,
    hasGoogleGenerativeAiApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    hasOpenRouterApiKey: !!process.env.OPEN_ROUTER_API_KEY,
    hasGroqApiKey: !!process.env.GROQ_API_KEY,
    hasMistralApiKey: !!process.env.MISTRAL_API_KEY,
    hasCohereApiKey: !!process.env.COHERE_API_KEY,
    hasPerplexityApiKey: !!process.env.PERPLEXITY_API_KEY,
    hasTogetherApiKey: !!process.env.TOGETHER_API_KEY,
    hasDeepseekApiKey: !!process.env.DEEPSEEK_API_KEY,
    hasXaiApiKey: !!process.env.XAI_API_KEY,
    hasGithubApiKey: !!process.env.GITHUB_API_KEY,
    hasHyperbolicApiKey: !!process.env.HYPERBOLIC_API_KEY,
    hasHuggingfaceApiKey: !!process.env.HUGGINGFACE_API_KEY,
    hasOpenaiLikeApiKey: !!process.env.OPENAI_LIKE_API_KEY,
  };

  return <OnboardingClient envVars={envVars} />;
}
