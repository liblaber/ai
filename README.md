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

Node.js is a program that helps your computer run certain types of applications. You'll need it to set up this project, but don't worry - it's free and easy to install!

<strong>📱 macOS (Mac computers)</strong>

**Option 1: Simple download (Recommended for beginners)**

1. Open your web browser and go to [nodejs.org](https://nodejs.org/)
2. You'll see two download buttons - click the one that says "LTS" (it's the safer, more stable version)
3. The file will download automatically
4. Double-click the downloaded file (it will end in .pkg)
5. Follow the installation wizard - just click "Continue" and "Install" when prompted
6. Enter your computer password when asked

**Option 2: Using Homebrew**

1. Open Terminal
2. Copy and paste this command: `brew install node`
3. Press Enter and wait for it to finish

<strong>🪟 Windows</strong>

**Option 1: Simple download (Recommended for beginners)**

1. Open your web browser and go to [nodejs.org](https://nodejs.org/)
2. You'll see two download buttons - click the one that says "LTS" (it's the safer, more stable version)
3. The file will download automatically
4. Find the downloaded file (usually in your Downloads folder) and double-click it
5. Follow the installation wizard - just click "Next" and "Install" when prompted
6. Click "Finish" when done

<strong>🐧 Linux</strong>

**Ubuntu/Debian (most common Linux versions)**

1. Open Terminal (press Ctrl + Alt + T)
2. Copy and paste this command: `sudo apt update && sudo apt install nodejs npm`
3. Press Enter and type your password when asked
4. Type "Y" and press Enter to confirm

**Other Linux versions**

1. Open Terminal
2. Copy and paste this command: `sudo snap install node --classic`
3. Press Enter and type your password when asked

<strong>✅ How to check if it worked</strong>

After installation, you can verify it worked:

1. Open Terminal (Mac/Linux) or Command Prompt (Windows)
2. Type: `node --version` and press Enter
3. You should see something like "v22.0.0" or higher
4. Type: `npm --version` and press Enter
5. You should see a version number like "9.6.7"

<strong>❓ Need help?</strong>

- **Windows users:** If you get an error about "node is not recognized", restart your computer after installation or refer to the [official Windows guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows)
- **Mac users:** If you get a security warning, go to System Preferences > Security & Privacy and click "Allow"
- **Linux users:** If you get a permission error, make sure to type `sudo` before the commands

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

**That's it! 🎉** The app will be available at [http://localhost:3000](http://localhost:3000/)

### **Quickstart Behavior**

The `pnpm run quickstart` command now **always pulls the latest code and Docker images** to ensure you're running the most up-to-date version. Here's what happens:

- ✅ **Always rebuilds** Docker images with latest code
- ✅ **Preserves your database** by default (keeps existing data)
- ✅ **Interactive prompts** if you have existing data
- ✅ **Migration support** for database schema changes

**Additional quickstart options:**

```bash
# Standard quickstart (preserves database)
pnpm run quickstart

# Fresh start (removes all existing data)
pnpm run quickstart:fresh

# Explicitly preserve database
pnpm run quickstart:preserve
```

**Database Migration**

If you encounter database issues after updating, use the migration tool:

```bash
pnpm run docker:migrate
```

This provides options to:

- Auto-migrate database schema
- Create backups before migrating
- Reset database (⚠️ **loses all data**)

### How Quickstart Handles Your Data

**Your data is PRESERVED when:**

- You run `pnpm run quickstart:preserve`
- You run the standard `pnpm run quickstart` and choose to preserve data when prompted (this is the default)

**Your data is REMOVED (fresh start) when:**

- You run `pnpm run quickstart:fresh`
- You run the standard `pnpm run quickstart` and choose to reset the database when prompted
- No existing data is found (e.g., on first-time setup)

**Important Notes:**

- 🔄 **Code is always updated** - Docker images are rebuilt with latest code
- 💾 **Database behavior is configurable** - You control whether to keep or reset data
- ⚠️ **Schema changes may require migration** - Use `pnpm run docker:migrate` if needed

### **Option 2: Manual Installation**

**For developers who prefer full control over their environment or need to run without Docker.**

> 💡 Note: We recommend using Docker (Option 1) for the best experience, as it handles all dependencies and provides a consistent environment.

**Prerequisites**

Before starting, ensure you have all the following installed and configured:

<details>
  <summary><b>Node.js</b> (22 or higher) <em>(Required for running the application)</em></summary>

Node.js is a program that helps your computer run certain types of applications. You'll need it to run this project on your computer.

<strong>📱 macOS (Mac computers)</strong>

**Option 1: Simple download (Recommended for beginners)**

1. Open your web browser and go to [nodejs.org](https://nodejs.org/)
2. You'll see two download buttons - click the one that says "LTS" (it's the safer, more stable version)
3. The file will download automatically
4. Double-click the downloaded file (it will end in .pkg)
5. Follow the installation wizard - just click "Continue" and "Install" when prompted
6. Enter your computer password when asked

**Option 2: Using Homebrew (if you're comfortable with Terminal)**

1. Open Terminal (press Cmd + Space, type "Terminal", press Enter)
2. Copy and paste this command: `brew install node`
3. Press Enter and wait for it to finish

<strong>🪟 Windows</strong>

**Option 1: Simple download (Recommended for beginners)**

1. Open your web browser and go to [nodejs.org](https://nodejs.org/)
2. You'll see two download buttons - click the one that says "LTS" (it's the safer, more stable version)
3. The file will download automatically
4. Find the downloaded file (usually in your Downloads folder) and double-click it
5. Follow the installation wizard - just click "Next" and "Install" when prompted
6. Click "Finish" when done

**Option 2: Using Windows Store (Windows 10/11)**

1. Open the Microsoft Store app
2. Search for "Node.js"
3. Click "Install" on the official Node.js app
4. Wait for it to finish installing

<strong>🐧 Linux</strong>

**Ubuntu/Debian (most common Linux versions)**

1. Open Terminal (press Ctrl + Alt + T)
2. Copy and paste this command: `sudo apt update && sudo apt install nodejs npm`
3. Press Enter and type your password when asked
4. Type "Y" and press Enter to confirm

**Other Linux versions**

1. Open Terminal
2. Copy and paste this command: `sudo snap install node --classic`
3. Press Enter and type your password when asked

<strong>✅ How to check if it worked</strong>

After installation, you can verify it worked:

1. Open Terminal (Mac/Linux) or Command Prompt (Windows)
2. Type: `node --version` and press Enter
3. You should see something like "v22.0.0" or higher
4. Type: `npm --version` and press Enter
5. You should see a version number like "9.6.7"

<strong>❓ Need help?</strong>

- **Windows users:** If you get an error about "node is not recognized", restart your computer after installation or refer to the [official Windows guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
- **Mac users:** If you get a security warning, go to System Preferences > Security & Privacy and click "Allow"
- **Linux users:** If you get a permission error, make sure to type `sudo` before the commands

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
