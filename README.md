# liblab.ai

Build internal apps using AI.

Securely connect your database, build an app, and deploy in seconds.

![Alt text](/assets/videos/liblab-ai-preview.gif 'liblab ai builder - revenue dashboard')

### Key features

- Securely connect your database (or use a Sample database)
- Build internal apps that can communicate with your database
- AI builds the whole full-stack app and auto-fixes any issues
- Preview your built app live and make edits
- Download the built app code or connect directly to GitHub
- Deploy your built app

### Use cases

- **Sales Dashboard**
  - Generate a live dashboard from your CRM database to track leads, conversions, and rep performance.
- **Finance Tracker**
  - Build a financial report viewer that pulls expense and revenue data from your finance DB.
- **Inventory Management**
  - Build a tool to view, update, and restock inventory directly from your product database.
- **Customer Support Tool**
  - Create an internal app to search, view, and manage customer tickets pulled from your support database.
- **Admin Portal**
  - Create a secure interface for non-technical staff to input and edit structured data in your DB.

---

## 🚀 Quick Start

### Prerequisites

Before starting, ensure you have:

- [pnpm](https://pnpm.io/installation) - Package manager
- [ngrok account](https://ngrok.com/signup) - Free account for local tunneling (one time setup)
  - create an account with ngrok
  - run `brew install ngrok`
  - run `ngrok config add-authtoken <your-ngrok-auth-token>`
- [Anthropic's API key](https://docs.anthropic.com/en/api/overview) - API key to access LLM models

### Setup

Run the setup:

```bash
pnpm run setup
```

If you lack permissions to run `scripts/setup.sh` fix it with:

```bash
chmod +x scripts/setup.sh
```

**That's it! 🎉**

The script automatically handles:

- Setup ngrok tunnel (macOS/Linux)
- Configure `.env` file
- Install all dependencies
- Setup SQLite database

### Start the app

Start the development server with:

```bash
pnpm run dev
```

---

## 🚀 Deployment

### Deploy Generated Apps to Netlify

You can deploy your generated apps directly to Netlify. To enable this:

1. Create a [Netlify account](https://app.netlify.com/signup)
2. Generate an auth token from User Settings > Applications > New access token
3. Add the token to your `.env` file:
   ```
   NETLIFY_AUTH_TOKEN=your-token-here
   ```

Once configured, you can deploy any app you generate through liblab.ai to Netlify using the deploy option in the UI.

---

## 📚 Documentation

- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project
- **[Governance Model](GOVERNANCE.md)** - Our decision-making process and community structure
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards and expectations

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **📖 Read our [Contributing Guidelines](CONTRIBUTING.md)** - Complete setup and development guide
2. **🐛 Browse [Issues](https://github.com/liblaber/liblab.ai/issues)** - Find something to work on
3. **🏛️ Check our [Governance Model](GOVERNANCE.md)** - Understand how we work

**New to the project?** Look for [`good first issue`](https://github.com/liblaber/liblab.ai/labels/good%20first%20issue) labels.

---

## 🏛️ Governance

liblab.ai follows a **Modified Open Governance** model that balances community input with efficient decision-making.

Read our complete [Governance Model](GOVERNANCE.md) for details on decision-making processes, roles, and how to become a Core Maintainer.

---

## 📞 Community & Support

- **🐛 [GitHub Issues](https://github.com/liblaber/liblab.ai/issues)** - Report bugs, request features, or discuss project-related topics
- **📧 [General Inquiries](mailto:contact@liblab.ai)** - Contact us directly for questions or concerns

### Project Resources

- **📊 [Roadmap](https://github.com/liblaber/liblab.ai/milestones)** - View upcoming features

---

## 📊 Project Status

- **🔄 Version**: 0.0.1 (Early Development)
- **📈 Status**: Active development with regular releases

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Liblab, Inc. and liblab.ai contributors

---

**Ready to contribute?** Check out our [Contributing Guidelines](CONTRIBUTING.md) and join our community! 🚀
