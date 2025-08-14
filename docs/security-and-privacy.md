# Security & Privacy

**Your data stays yours.** We've designed liblab.ai with security and privacy as core principles.

## How Your Database Connection Works

1. **Local Connection**: Your database credentials are stored locally on your machine and never sent to external servers
2. **App Generation**: When you build an app, it runs in a secure web container that displays live dashboards with your data
3. **Secure Tunneling**: Since the web container can't directly access your local database, we use cloudflared to create a secure tunnel
4. **End-to-End Encryption**: Every database request, response, query, and data output is encrypted using AES-256 encryption

## Your Encryption Key

- **Locally Generated**: A unique encryption key is generated on your machine during setup
- **Never Shared**: This key stays on your local machine and is never transmitted anywhere
- **User-Specific**: Each user gets their own unique encryption key
- **Secure Storage**: Keys are stored securely in your local environment

## Data Flow Security

```
Your Database → Encrypted Request → Secure Tunnel → Web Container
     ↑                                                    ↓
Local Machine ← Encrypted Response ← Secure Tunnel ← Preview Dashboard
```

## What this means for you

- Database credentials never leave your machine
- All data transmission is encrypted with your unique key
- Even if network traffic is intercepted, data remains unreadable
- No data is stored on external servers
- You maintain complete control over your data access

## Telemetry

### Basic Telemetry

To help us improve liblab.ai, we collect anonymous usage events by default. This includes:

- Whether the setup script completed successfully or with an error (including the actual error message)
- Whether the development server started successfully or with an error (including the actual error message)
- A unique, anonymous machine identifier (generated from hardware and OS info, never your name or email)

### Additional Telemetry

We collect additional opt-in events to further improve the user experience. This includes:

- Error reports to identify bugs and improve stability
- Usage patterns to understand how features are used
- Performance metrics to optimize speed and responsiveness
- Prompts sent to the LLM to enhance the quality of generated outputs and improve prompt understanding

We do not collect any personal information, built app code, user data, or chat responses from the LLM, only the prompts you send. All data is anonymized and used solely to improve the product.

Events are sent to [PostHog](https://posthog.com/) for analytics. This helps us understand how the open source project is used and where users encounter issues, so we can improve the experience.

### How to Disable Telemetry

Telemetry is enabled by default. To disable it, set the following in your `.env` file:

```bash
NEXT_PUBLIC_DISABLE_TELEMETRY=true
```

If you do not provide a `NEXT_PUBLIC_POSTHOG_KEY` in your `.env`, telemetry will also be disabled automatically.
