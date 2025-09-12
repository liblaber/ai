# Data Sources

Connect your data to start building AI applications instantly. Choose from databases, spreadsheets, and cloud services to get up and running in minutes.

## Table of Contents

- [What Are Data Sources?](#what-are-data-sources)
- [Step-By-Step Data Source Management](#step-by-step-data-source-management)
- [Supported Data Sources](#supported-data-sources)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Advanced Configuration](#advanced-configuration)

## What Are Data Sources?

Data sources are where your information lives - databases, spreadsheets, or cloud services. Connect yours and start building applications with natural language.
liblab.ai supports having multiple environments (e.g., development, staging, production) for each data source, allowing you to switch between them seamlessly.

## Step-By-Step Data Source Management

Managing data sources in **liblab.ai** is straightforward and flexible, allowing you to connect, configure, and switch between multiple environments with ease.

#### 1. Adding your first data source

When the app is opened for the first time, you’ll see a screen prompting you to connect your first data source.  
Choose a **data source type** and an **environment**, then provide the required properties (e.g., connection URL for databases, access token for HubSpot, etc.).

<img src="./assets/1-connect-first-datasource.gif" alt="Add your first data source" height="300px">

#### 2. Adding a new data source in the control panel

You can add as many data sources as you need.  
Open **Settings** (cog icon in the bottom-left corner), navigate to the **Data Sources** tab, and click **+ Add Data Source**.  
The process is the same as adding your first data source.

<img src="./assets/2-add-new-datasource.gif" alt="Add new data source" height="300px">

#### 3. Managing environments for a data source

Each data source can have multiple environments, which can later be switched at runtime in your built applications. This makes it possible to use different test or production data seamlessly.

To manage environments:

- Go to the **Data Sources** tab in the control panel.
- Select a data source, then open the **Environments** tab.
- **Add a new environment** by clicking **+ Add Environment**.
- **Edit** an existing environment by selecting it to open the edit form.
- **Delete** an environment by clicking **Delete Environment**.
  > ⚠️ Note: You cannot delete the only environment of a data source.

<img src="./assets/3-manage-datasource-environments.gif" alt="Manage data source environments" height="300px">

> **Important:** The data source structure (**schema**) must be the same across all environments of a given data source. Otherwise, built applications may not work properly.

#### 4. Switching environments in built applications

When an application is running inside the builder, you can switch environments at runtime through the **Conversation Settings**. This enables quick testing across staging, development, and production environments.

<img src="./assets/4-switch-datasource-environments.gif" alt="Switch data source environments" height="300px">

## Supported Data Sources

Each data source type in **liblab.ai** may require one or more connection properties, or in some cases a slightly more complex flow (e.g., OAuth).

| Data Source                          | Type                      | Required Properties / Flow | Format                                                                                     |
| ------------------------------------ | ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| PostgreSQL                           | SQL Database              | Connection URL             | `postgres(ql)://username:password@host:port/database`                                      |
| MySQL                                | SQL Database              | Connection URL             | `mysql://username:password@host:port/database`                                             |
| SQLite                               | SQL Database (file-based) | Connection URL             | `sqlite://path/to/database.db`                                                             |
| MongoDB                              | NoSQL Database            | Connection URL             | `mongodb://username:password@host:port/database`                                           |
| Google Sheets                        | Spreadsheet (API)         | OAuth / Apps Script        | `sheets://SPREADSHEET_ID/` or `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` |
| [HubSpot](./data-sources/hubspot.md) | API                       | Access Token               | `pat-xxx-xxxxxxxx-xxxx-xxxxxxxxxxxx`                                                       |

> **Note:** When adding a new data source, the connection must be valid. liblab.ai performs validation to ensure that credentials, tokens, and URLs are correct before the data source can be saved.

## Security

All data source properties are **encrypted** and stored in the local database, meaning **nothing gets sent to the internet**.

For more details, see our [Security & Privacy](./security-and-privacy.md) documentation.

### What Gets Sent to the LLM

Your **data is not sent to the LLM**. Only the **schema of the data source** is used as input to the LLM, which generates queries that are then executed locally to retrieve the data.

## Troubleshooting

### Connection Problems

**Can't connect to database?**

- Double-check your connection string
- Make sure your database is running
- Verify the database name is correct

**Google Sheets not working?**

- Check that your sheet is shared with "Anyone with the link can view"
- Make sure you're using the correct sheet URL

**HubSpot connection failed?**

- Verify your access token is correct
- Check that your token hasn't expired

## Stay Updated

- New data sources are added regularly
- Follow our release notes for new features and improvements

### Coming Soon

| Source          | Use Case                    |
| --------------- | --------------------------- |
| **Airtable**    | Database/spreadsheet hybrid |
| **GitHub**      | Code repositories           |
| **Google Docs** | General data                |
| **Jira**        | Project management          |
| **Notion**      | Knowledge bases             |
| **Salesforce**  | Enterprise CRM              |
