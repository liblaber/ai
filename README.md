# liblab.ai

Build internal apps using AI.

Securely connect your database, build an app, and deploy in seconds.

**🚀 [Jump to Quick Start](#-quick-start)** - Get up and running in minutes!

![Alt text](https://github.com/liblaber/ai/raw/main/assets/videos/liblab-ai-preview.gif)

## **✨ Key features**

- Securely connect your database (or use a Sample database)
- Build internal apps that can communicate with your database
- AI builds the whole full-stack app and auto-fixes any issues
- Preview your built app live and make edits
- Download the built app code or connect directly to GitHub
- Deploy your built app

## **🚀 Quick Start**

### **Option 1: Deploy with Docker (Recommended) ⭐**

**Prerequisites**

<details>
  <summary><b>Node.js</b> <em>(Only required for configuration, not for running the app)</em></summary>

Node.js (version 18 or higher) is needed to run setup/configuration scripts before starting the Docker containers. The application itself will run inside Docker and does not use your local Node.js.

```bash
# Install Node.js using Homebrew
brew install node

# Or use Node Version Manager (nvm)
brew install nvm
nvm install --lts

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version
```

</details>

<details>
  <summary><b>pnpm</b> <em>(Package manager, faster than npm)</em></summary>

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

</details>

<details>
  <summary><b>Docker</b> <em>(Required for containerized setup)</em></summary>

Install Docker Desktop from [docker.com/get-started](https://www.docker.com/get-started/)

**Verify the Installation**

```bash
docker --version
docker-compose --version
```

</details>

<details>
  <summary><b>Anthropic API Key </b><em>(Required for AI model access)</em></summary>

<strong>Step 1: Create an Anthropic Account</strong>

1. Go to [console.anthropic.com/signup](https://console.anthropic.com/signup)
2. Create an account
3. Verify your email

<strong>Step 2: Generate an API Key</strong> 4. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) 5. Click "Create Key" 6. Give it a name (e.g., "liblab-ai") 7. Copy the API key (starts with `sk-ant-`)

<strong>Step 3: Save your API Key</strong>
Add this to your `.env` file during setup, but keep it handy:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

</details>

<details>
  <summary><b>Ngrok Auth Token</b> <em>(Required for external tunnel access)</em></summary>

<strong>Step 1: Create Ngrok Account</strong>

1. Go to [ngrok.com](https://ngrok.com/)
2. Sign up for a free account
3. Verify your email

<strong>Step 2: Get Your Auth Token</strong> 4. After logging in, go to [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) 5. Copy your authtoken (long alphanumeric string)

<strong>Step 3: Save Your Auth Token</strong>
Add this to your `.env` file during setup, but keep it handy:

```bash
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

</details>

<details>
  <summary><b>Netlify Key</b> <em>(Optional to run the builder. Required to deploy completed apps)</em></summary>

<strong>Step 1: Create a Netlify account</strong>

1. Go to [netlify.com](https://netlify.com/)
2. Sign up for a free account

<strong>Step 2: Generate an auth token</strong> 3. Go to User Settings &gt; Applications &gt; New access token 4. Generate and copy your token

<strong>Step 3: Add the token to your .env file</strong>

```bash
NETLIFY_AUTH_TOKEN=your-token-here
```

Once configured, you can deploy any app you generate through liblab.ai to Netlify using the deploy option in the UI.

</details>

[liblab.ai](http://liblab.ai/) runs best on Chrome or Chromium browsers when using a desktop. Mobile browsers don't have full support right now.

Some browser add-ons like ad blockers or VPNs might cause problems. If things aren't working right, try disabling them and reload the page.

**Clone the repo**

```bash
git clone https://github.com/liblaber/ai.git
cd ai
```

**Run the setup**

```bash
pnpm run quickstart
```

**Start with Docker**

After setup is complete, start the app with Docker:

```bash
pnpm run docker:start
```

**That's it! 🎉** The app will be available at [http://localhost:3000](http://localhost:3000/)

### **Option 2: Manual Installation**

**For developers who prefer full control over their environment or need to run without Docker.**

> 💡 Note: We recommend using Docker (Option 1) for the best experience, as it handles all dependencies and provides a consistent environment.

**Prerequisites**

Before starting, ensure you have all the following installed and configured:

<details>
  <summary><b>Node.js</b> (18 or higher) <em>(Required for running the application)</em></summary>

<strong>Option A: Single version of Node, using Homebrew (Recommended for most users)</strong>

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

<strong>Option B: Using Node Version Manager (Recommended for developers)</strong>

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install NVM
brew install nvm

# To make the nvm command available, restart your terminal or run:
source ~/.zshrc  # or source ~/.bashrc

  # Install latest stable Node.js
  nvm install --lts
```

Verify Installation
Verify Installation

```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show version number
```

</details>

<details>
  <summary><b>pnpm</b> <em>(Package manager, faster than npm)</em></summary>

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

</details>

<details>
  <summary><b>Anthropic API Key</b> <em>(Required for AI model access)</em></summary>

<strong>Step 1: Create an Anthropic Account</strong>

1. Go to [console.anthropic.com/signup](https://console.anthropic.com/signup)
2. Create an account
3. Verify your email

<strong>Step 2: Generate an API Key</strong> 4. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) 5. Click "Create Key" 6. Give it a name (e.g., "liblab-ai") 7. Copy the API key (starts with `sk-ant-`)

<strong>Step 3: Save your API Key</strong>
Add this to your `.env` file during setup, but keep it handy:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

</details>

<details>
  <summary><b>Ngrok Auth Token</b> <em>(Required for external tunnel access)</em></summary>

<strong>Step 1: Create Ngrok Account</strong>

1. Go to [ngrok.com](https://ngrok.com/)
2. Sign up for a free account
3. Verify your email

<strong>Step 2: Get Your Auth Token</strong> 4. After logging in, go to [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) 5. Copy your authtoken (long alphanumeric string)

<strong>Step 3: Save Your Auth Token</strong>
Add this to your `.env` file during setup, but keep it handy:

```bash
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

</details>

<details>
  <summary><b>Netlify Key</b> <em>(Optional to run the builder. Required to deploy completed apps)</em></summary>

<strong>Step 1: Create a Netlify account</strong>

1. Go to [netlify.com](https://netlify.com/)
2. Sign up for a free account

<strong>Step 2: Generate an auth token</strong> 3. Go to User Settings &gt; Applications &gt; New access token 4. Generate and copy your token

<strong>Step 3: Add the token to your .env file</strong>

```bash
NETLIFY_AUTH_TOKEN=your-token-here
```

</details>

[liblab.ai](http://liblab.ai/) runs best on Chrome or Chromium browsers when using a desktop. Mobile browsers don't have full support right now.

Some browser add-ons like ad blockers or VPNs might cause problems. If things aren't working right, try disabling them and reload the page.

**Setup**

**Clone the repo**

```bash
git clone https://github.com/liblaber/ai.git
cd ai
```

**Run the setup**

```bash
pnpm run setup
```

**Start the app**

Start the development server with:

```bash
pnpm run dev
```

**That's it! 🎉**

## **📚 Resources**

- [**Contributing Guidelines**](https://github.com/liblaber/ai/blob/main/CONTRIBUTING.md) - How to contribute to the project
- [Security & Privacy](docs/security-and-privacy.md)
- [Configuration](docs/configuration.md)
- [Getting Started](docs/getting-started.md)
- [Features](docs/features.md)
- [Tips](docs/tips.md)
- [Governance](docs/governance.md)
- [License](LICENSE)

## **🤝 Contributing**

We welcome contributions! Here's how to get started:

1. **📖 Read our [Contributing Guidelines](https://github.com/liblaber/ai/blob/main/CONTRIBUTING.md)** - Complete setup and development guide
2. **🐛 Browse [Issues](https://github.com/liblaber/ai/issues)** - Find something to work on
3. **🏛️ Check our [Governance Model](docs/governance.md)** - Understand how we work

**New to the project?** Look for [`good first issue`](https://github.com/liblaber/ai/labels/good%20first%20issue) labels.

## **📞 Community & Support**

- **🐛 [GitHub Issues](https://github.com/liblaber/ai/issues)** - Report bugs, request features, or discuss project-related topics
- **📧 [General Inquiries](mailto:contact@liblab.ai)** - Contact us directly for questions or concerns

## **📄 License**

This project is currently licensed under the MIT License. Please note that future versions may transition to a different license to support the introduction of Pro features. We remain committed to keeping the core open source, but certain advanced capabilities may be subject to commercial terms.

MIT License - see the [LICENSE](https://github.com/liblaber/ai/blob/main/LICENSE) file for details.

Copyright (c) 2025 Liblab, Inc. and liblab.ai contributors

**Ready to contribute?** Check out our [Contributing Guidelines](https://github.com/liblaber/ai/blob/main/CONTRIBUTING.md) and join our community! 🚀
