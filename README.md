# liblab.ai

Build internal apps using AI.

Securely connect your database, build an app, and deploy in seconds.

**🚀 [Jump to Quick Start](#-quick-start)** - Get up and running in minutes!

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

## 🔒 Security & Privacy

**Your data stays yours.** We've designed liblab.ai with security and privacy as core principles.

### How Your Database Connection Works

When you connect your database to liblab.ai, here's exactly what happens:

1. **🏠 Local Connection**: Your database credentials are stored locally on your machine and never sent to external servers
2. **🔧 App Generation**: When you build an app, it runs in a secure web container that displays live dashboards with your data
3. **🌐 Secure Tunneling**: Since the web container can't directly access your local database, we use localtunnel to create a secure tunnel
4. **🔐 End-to-End Encryption**: Every database request, response, query, and data output is encrypted using AES-256 encryption

### Your Encryption Key

- **🔑 Locally Generated**: A unique encryption key is generated on your machine during setup
- **🔒 Never Shared**: This key stays on your local machine and is never transmitted anywhere
- **🎯 User-Specific**: Each user gets their own unique encryption key
- **💾 Secure Storage**: Keys are stored securely in your local environment

### Data Flow Security

```
Your Database → Encrypted Request → Secure Tunnel → Web Container
     ↑                                                    ↓
Local Machine ← Encrypted Response ← Secure Tunnel ← Preview Dashboard
```

**What this means for you:**

- ✅ Database credentials never leave your machine
- ✅ All data transmission is encrypted with your unique key
- ✅ Even if network traffic is intercepted, data remains unreadable
- ✅ No data is stored on external servers
- ✅ You maintain complete control over your data access

---

## 📈 Telemetry

To help us improve liblab.ai, we collect anonymous usage events by default. This includes:

- Whether the setup script completed successfully or with an error (including the actual error message)
- Whether the development server started successfully or with an error (including the actual error message)
- A unique, anonymous machine identifier (generated from hardware and OS info, never your name or email)

**No sensitive data, database credentials, or personal information is ever collected.**

Events are sent to [PostHog](https://posthog.com/) for analytics. This helps us understand how the open source project is used and where users encounter issues, so we can improve the experience.

### How to Disable Telemetry

Telemetry is enabled by default. To disable it, set the following in your `.env` file:

```
DISABLE_TELEMETRY=true
```

If you do not provide a `POSTHOG_API_KEY` in your `.env`, telemetry will also be disabled automatically.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

**The easiest way to get started!** Just need Docker installed.

#### Prerequisites

<details>
<summary><strong>Docker</strong> - Required for containerized setup</summary>

Install Docker Desktop from [docker.com/get-started](https://www.docker.com/get-started/)

#### Verify Installation

```bash
docker --version
docker-compose --version
```

</details>

<details>
<summary><strong>Anthropic API Key</strong> - Required for AI model access</summary>

#### Step 1: Create Anthropic Account

1. Go to [console.anthropic.com/signup](https://console.anthropic.com/signup)
2. Create an account
3. Verify your email

#### Step 2: Generate API Key

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Click "Create Key"
3. Give it a name (e.g., "liblab-ai")
4. Copy the API key (starts with `sk-ant-`)

#### Step 3: Save Your API Key

You'll add this to your `.env` file during setup, but keep it handy:

```
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

> **💡 Pro Tip:** The setup script will prompt you for this API key, so you don't need to manually edit files.

</details>

#### Setup

First, run the setup script to configure your environment:

```bash
pnpm run setup
```

If you lack permissions to run `scripts/setup.sh` fix it with:

```bash
chmod +x scripts/setup.sh
```

#### Start with Docker

After setup is complete, start the app with Docker:

```bash
pnpm run dockerstart
```

**That's it! 🎉** The app will be available at http://localhost:3000

---

### Option 2: Manual Installation

**For developers who prefer full control over their environment.**

#### Prerequisites

Before starting, ensure you have all the following installed and configured:

<details>
<summary><strong>Node.js (18 or higher)</strong> - Required for running the application</summary>

#### Option A: Single version of Node, using Homebrew (Recommended for most users)

**Best for:** Simple setup, single Node.js version, macOS users

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

#### Option B: Using Node Version Manager (Recommended for developers)

**Best for:** Developers who work with multiple projects requiring switching different Node.js versions

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

#### Verify Installation

```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show version number
```

</details>

<details>
<summary><strong> pnpm</strong> - Package manager (faster than npm)</summary>

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

</details>

<details>
<summary><strong>localtunnel</strong> - Local tunneling for development (automatic setup)</summary>

#### Step 1: Install localtunnel

Localtunnel is automatically installed as a dependency when you run the setup script. No manual configuration required!

If you need to install it manually:

```bash
npm install -g localtunnel
```

#### Step 2: Verify Installation

```bash
lt --version
```

> **💡 Note:** The setup script handles localtunnel installation automatically, so you don't need to do anything manually.

</details>

<details>
<summary><strong>Anthropic API Key</strong> - Required for AI model access</summary>

#### Step 1: Create Anthropic Account

1. Go to [console.anthropic.com/signup](https://console.anthropic.com/signup)
2. Create an account
3. Verify your email

#### Step 2: Generate API Key

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Click "Create Key"
3. Give it a name (e.g., "liblab-ai")
4. Copy the API key (starts with `sk-ant-`)

#### Step 3: Save Your API Key

You'll add this to your `.env` file during setup, but keep it handy:

```
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

> **💡 Pro Tip:** The setup script will prompt you for this API key, so you don't need to manually edit files.

</details>

#### Setup

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

- Setup localtunnel tunnel (macOS/Linux)
- Configure `.env` file
- Install all dependencies
- Setup SQLite database

#### Start the app

Start the development server with:

```bash
pnpm run dev
```

### LLM Configuration

> **💡 Recommended Providers**  
> For optimal performance with liblab.ai, we recommend:
>
> - **Anthropic Claude-3 Sonnet** (Default) - Best overall performance with excellent code understanding and large context handling
> - **Google Gemini Pro** - Strong alternative with robust code generation capabilities
>
> These providers consistently deliver the best results for our use cases, handling large system prompts, code modifications, and complex app generation tasks.

By default, liblab.ai uses Anthropic's Claude (claude-3-5-sonnet-latest). Configure your preferred provider:

```bash
DEFAULT_LLM_PROVIDER=<provider_name>  # Default: 'Anthropic'
DEFAULT_LLM_MODEL=<model_name>        # Default: 'claude-3-5-sonnet-latest'
```

#### Cloud Providers

| Provider       | API Key Variable               | Get API Key                                                  |
| -------------- | ------------------------------ | ------------------------------------------------------------ |
| Anthropic      | `ANTHROPIC_API_KEY`            | [Console](https://console.anthropic.com/settings/keys)       |
| Google         | `GOOGLE_GENERATIVE_AI_API_KEY` | [Console](https://console.cloud.google.com/apis/credentials) |
| OpenAI         | `OPENAI_API_KEY`               | [Console](https://platform.openai.com/api-keys)              |
| Groq           | `GROQ_API_KEY`                 | [Console](https://console.groq.com/keys)                     |
| HuggingFace    | `HuggingFace_API_KEY`          | [Console](https://huggingface.co/settings/tokens)            |
| Mistral        | `MISTRAL_API_KEY`              | [Console](https://console.mistral.ai/api-keys/)              |
| Cohere         | `COHERE_API_KEY`               | [Console](https://dashboard.cohere.com/api-keys)             |
| xAI            | `XAI_API_KEY`                  | [Docs](https://x.ai/api)                                     |
| Perplexity     | `PERPLEXITY_API_KEY`           | [Settings](https://www.perplexity.ai/settings/api)           |
| DeepSeek       | `DEEPSEEK_API_KEY`             | Contact DeepSeek                                             |
| OpenRouter     | `OPEN_ROUTER_API_KEY`          | [Settings](https://openrouter.ai/settings/keys)              |
| Together       | `TOGETHER_API_KEY`             | [Console](https://api.together.xyz/settings/api-keys)        |
| Amazon Bedrock | `AWS_BEDROCK_CONFIG`           | [AWS Console](https://aws.amazon.com/bedrock/)               |
| GitHub         | `GITHUB_API_KEY`               | [Settings](https://github.com/settings/tokens)               |

#### Alternative Services

**Local Models**

```bash
# Ollama - Local open-source models
OLLAMA_API_BASE_URL=

# LMStudio - Local model runner with GUI
LMSTUDIO_API_BASE_URL=

# OpenAI-compatible services
OPENAI_LIKE_API_BASE_URL=
OPENAI_LIKE_API_KEY=
```

---

## 🎬 Starter Template

liblab.ai supports multiple starter templates for generating apps. You can control which starter is used by setting the `STARTER` environment variable in your `.env` file or at runtime.

### How to Set the Starter

Add the following to your `.env` file (or set as an environment variable):

```
# Name of the starter project
STARTER=
```

- Supported values: `next`, `remix`
- If not set, the default is `next`.

### How Starters Work

Each starter lives in its own directory under [`starters/`](starters/). For example, the default Next.js starter is in [`starters/next-starter/`](starters/next-starter/).

Each starter must include a `.liblab` directory with the following files:

- [`prompt`](starters/next-starter/.liblab/prompt): The main system prompt and instructions for code generation
- [`technologies`](starters/next-starter/.liblab/technologies): List of technologies used by the starter (one per line)
- [`examples`](starters/next-starter/.liblab/examples): Example user prompts and responses for this starter
- [`ignore`](starters/next-starter/.liblab/ignore): Patterns for files/folders to exclude from importing into the builder.

These files are dynamically imported and used in the [`getAppsPrompt`](app/lib/common/prompts/apps.ts) logic to generate apps and instructions.

### Adding a New Starter

1. Create a new directory under [`starters/`](starters/) named `<your-starter>-starter` (e.g., `my-starter-starter`).
2. Add a `.liblab` directory inside your starter with the files that will improve the quality of generated code: `prompt`, `technologies`, `examples` and `ignore`.
3. Update the plugin types in [`app/lib/plugins/types.ts`](app/lib/plugins/types.ts) to include your new starter in `StarterPluginId` and `PluginAccessMap`.
4. Set `STARTER=<your-starter>` in your `.env` file to use your new starter.

> **Tip:** See the [default Next.js starter prompt](starters/next-starter/.liblab/prompt) for a comprehensive example of how to structure your starter's instructions.

---

## 🔧 Custom User Management

liblab.ai supports custom user management implementations through a plugin system. You can override the default single-user behavior with your own multi-user or custom organization management logic.

### How to Create a Custom Implementation

1. Create a file at `app/lib/plugins/user-management/custom-user-management.ts`
2. Export a class that implements the `UserManagementPlugin` interface:

```typescript
import type { UserManagementPlugin } from './user-management-plugin-manager';

export default class CustomUserManagement implements UserManagementPlugin {
  async createOrganizationFromEmail(email: string, userId: string): Promise<void> {
    // Your custom logic here
    // Example: Create multi-user organizations, domain-based grouping, etc.
    // You can use the provided userService and organizationService to access database resources.
  }
}
```

**Note:** You can use the provided `userService` and `organizationService` classes to access and manage users and organizations in the database.

### Built-in Implementations

liblab.ai includes two built-in user management implementations:

- **Single-User Management**: Default implementation for single-user + single-organization setups
- **Multi-User Management**: Supports multiple users per organization with domain-based grouping

### Use Cases

- **Multi-User Organizations**: Support teams with multiple members and roles
- **Domain-Based Grouping**: Automatically group users by email domain (e.g., company.com users join same org)
- **Advanced Permissions**: Implement custom role-based access control
- **Organization Management**: Custom logic for creating, managing, and organizing user groups

---

## 📦 Shared Code and Data Accessors

### Adding Shared Code

The `@shared` directory contains reusable code that can be used across different parts of the application. When adding shared code:

1. Place your code in the appropriate subdirectory under `shared/src/`
2. Keep shared code independent of the main project's dependencies
3. Use TypeScript for type safety and better maintainability
4. Include proper documentation and type definitions
5. Write unit tests for shared functionality

Example structure:

```
shared/
  src/
    types/         # TypeScript type definitions
    utils/         # Utility functions
    constants/     # Shared constants
    data-access/   # Database accessors
```

### Creating Data Accessors

Data accessors provide a standardized way to interact with different database types. To add a new data accessor:

1. Create a new file in `shared/src/data-access/accessors/` (e.g., `mysql.ts`)
2. Implement the `BaseAccessor` interface by creating a class that implements it:

   ```typescript
   import type { BaseAccessor } from '../baseAccessor';
   import type { MySqlColumn, MySqlTable } from '../../types';
   import type { Connection } from 'mysql2/promise';
   import mysql from 'mysql2/promise';

   // Configure type casting for numeric values
   const typesToParse = ['INT', 'BIGINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'NEWDECIMAL'];

   export class MySQLAccessor implements BaseAccessor {
     readonly label = 'MySQL';
     private _connection: Connection | null = null;

     static isAccessor(databaseUrl: string): boolean {
       return databaseUrl.startsWith('mysql://');
     }

     async testConnection(databaseUrl: string): Promise<boolean> {
       try {
         const connection = await mysql.createConnection(databaseUrl);
         await connection.query('SELECT 1');
         await connection.end();
         return true;
       } catch (error: any) {
         return false;
       }
     }

     async executeQuery(query: string, params?: string[]): Promise<any[]> {
       if (!this._connection) {
         throw new Error('Database connection not initialized. Please call initialize() first.');
       }

       try {
         const [rows] = await this._connection.query(query, params);
         return rows as any[];
       } catch (error) {
         console.error('Error executing query:', JSON.stringify(error));
         throw new Error((error as Error)?.message);
       }
     }

     guardAgainstMaliciousQuery(query: string): void {
       if (!query) {
         throw new Error('No SQL query provided. Please provide a valid SQL query to execute.');
       }

       const normalizedQuery = query.trim().toUpperCase();

       if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
         throw new Error('SQL query must start with SELECT or WITH');
       }

       const forbiddenKeywords = [
         'INSERT ',
         'UPDATE ',
         'DELETE ',
         'DROP ',
         'TRUNCATE ',
         'ALTER ',
         'CREATE ',
         'GRANT ',
         'REVOKE ',
       ];

       if (forbiddenKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
         throw new Error('SQL query contains forbidden keywords');
       }
     }

     async getSchema(): Promise<MySqlTable[]> {
       if (!this._connection) {
         throw new Error('Database connection not initialized. Please call initialize() first.');
       }

       // Query to get all tables with their comments
       const tablesQuery = `
         SELECT
           TABLE_NAME,
           TABLE_COMMENT
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME;
       `;

       // Query to get all columns with their details
       const columnsQuery = `
         SELECT
           c.TABLE_NAME,
           c.COLUMN_NAME,
           c.DATA_TYPE,
           c.COLUMN_TYPE,
           c.IS_NULLABLE,
           c.COLUMN_DEFAULT,
           c.COLUMN_COMMENT,
           c.COLUMN_KEY,
           c.EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS c
         WHERE c.TABLE_SCHEMA = DATABASE()
         ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
       `;

       try {
         // Execute both queries
         const [tablesResult] = await this._connection.execute(tablesQuery);
         const [columnsResult] = await this._connection.execute(columnsQuery);

         const tables = tablesResult as any[];
         const columns = columnsResult as any[];

         // Group columns by table
         const columnsByTable = new Map<string, any[]>();
         columns.forEach((column) => {
           if (!columnsByTable.has(column.TABLE_NAME)) {
             columnsByTable.set(column.TABLE_NAME, []);
           }
           columnsByTable.get(column.TABLE_NAME)!.push(column);
         });

         // Build the result
         const result: MySqlTable[] = tables.map((table) => ({
           tableName: table.TABLE_NAME,
           tableComment: table.TABLE_COMMENT || '',
           columns: (columnsByTable.get(table.TABLE_NAME) || []).map((col) => {
             const column: MySqlColumn = {
               name: col.COLUMN_NAME,
               type: col.DATA_TYPE,
               fullType: col.COLUMN_TYPE,
               nullable: col.IS_NULLABLE,
               defaultValue: col.COLUMN_DEFAULT,
               comment: col.COLUMN_COMMENT || '',
               isPrimary: col.COLUMN_KEY === 'PRI',
               extra: col.EXTRA || '',
             };

             // Extract enum values if the column type is ENUM
             if (col.DATA_TYPE === 'enum') {
               const enumMatch = col.COLUMN_TYPE.match(/enum\((.+)\)/i);
               if (enumMatch) {
                 const enumString = enumMatch[1];
                 const enumValues = enumString.split(',').map((val: string) => val.trim().replace(/^'|'$/g, ''));
                 column.enumValues = enumValues;
               }
             }

             return column;
           }),
         }));

         return result;
       } catch (error) {
         console.error('Error fetching database schema:', error);
         throw error;
       }
     }

     async initialize(databaseUrl: string): Promise<void> {
       if (this._connection) {
         await this.close();
       }

       this._connection = await mysql.createConnection({
         uri: databaseUrl,
         typeCast: (field, next) => {
           if (typesToParse.includes(field.type)) {
             const value = field.string();
             return value !== null ? parseFloat(value) : null;
           }
           return next();
         },
       });
     }

     async close(): Promise<void> {
       if (this._connection) {
         await this._connection.end();
         this._connection = null;
       }
     }
   }
   ```

3. Register your accessor in `dataAccessor.ts`:

   ```typescript
   import type { BaseAccessor, BaseAccessorConstructor } from './baseAccessor';
   import { PostgresAccessor } from './accessors/postgres';
   import { MySQLAccessor } from './accessors/mysql';

   export class DataAccessor {
     static getAccessor(databaseUrl: string): BaseAccessor {
       const allAccessors: BaseAccessorConstructor[] = [PostgresAccessor, MySQLAccessor];

       const AccessorClass = allAccessors.find((Acc) => Acc.isAccessor(databaseUrl));

       if (!AccessorClass) {
         throw new Error(`No accessor found for database URL: ${databaseUrl}`);
       }

       return new AccessorClass();
     }
   }
   ```

Each accessor should:

- Handle database-specific connection logic
- Implement security measures (e.g., query validation)
- Provide schema information
- Support parameterized queries
- Handle errors appropriately
- Implement connection testing
- Properly manage database connections (initialize/close)
- Support type casting for numeric values
- Handle enum types and their values
- Include table and column comments in schema information

The accessor interface ensures consistent behavior across different database types while allowing for database-specific optimizations and features.

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
