# Configuration

## LLM Configuration

By default, liblab.ai uses Anthropic Claude 4 Sonnet (`claude-4-sonnet-20250514`).

Set your provider and model with environment variables:

```bash
DEFAULT_LLM_PROVIDER=<provider_name>
DEFAULT_LLM_MODEL=<model_name>
```

Supported providers and key names:

| Provider       | API Key                        |
| -------------- | ------------------------------ |
| Anthropic      | `ANTHROPIC_API_KEY`            |
| Google         | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenAI         | `OPENAI_API_KEY`               |
| Groq           | `GROQ_API_KEY`                 |
| HuggingFace    | `HUGGINGFACE_API_KEY`          |
| Mistral        | `MISTRAL_API_KEY`              |
| Cohere         | `COHERE_API_KEY`               |
| xAI            | `XAI_API_KEY`                  |
| Perplexity     | `PERPLEXITY_API_KEY`           |
| DeepSeek       | `DEEPSEEK_API_KEY`             |
| OpenRouter     | `OPEN_ROUTER_API_KEY`          |
| Together       | `TOGETHER_API_KEY`             |
| Amazon Bedrock | `AWS_BEDROCK_CONFIG`           |
| GitHub         | `GITHUB_API_KEY`               |

## Local/Alternative Services

```bash
# Ollama - local models
OLLAMA_API_BASE_URL=

# LMStudio
LMSTUDIO_API_BASE_URL=

# OpenAI-compatible services
OPENAI_LIKE_API_BASE_URL=
OPENAI_LIKE_API_KEY=
```

## Starter Template

Choose a starter via `STARTER` in your `.env` (`next` or `remix`):

```bash
STARTER=
```

Starters live in `starters/`. Each starter must include a `.liblab` directory with: `prompt`, `technologies`, `examples`, and `ignore`.

## Custom User Management

Override default behavior by implementing a plugin at `app/lib/plugins/user-management/custom-user-management.ts` that implements the `UserManagementPlugin` interface. You can use provided services like `userService` and `organizationService`.

## Shared Code and Data Accessors

Use `shared/src/` for reusable code. Data accessors live in `shared/src/data-access/accessors/` and implement the `BaseAccessor` interface (see `shared/src/data-access/baseAccessor.ts`).
