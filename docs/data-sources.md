# Data Sources

Connect your data to start building AI applications instantly. Choose from databases, spreadsheets, and cloud services to get up and running in minutes.

## Table of Contents

- [What Are Data Sources?](#what-are-data-sources)
- [Step-By-Step Data Source Management](#step-by-step-data-source-management)
- [Supported Data Sources](#supported-data-sources)
- [Choosing the Right Data Source](#choosing-the-right-data-source)
- [Security & Best Practices](#security--best-practices)
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

| Data Source   | Type                      | Required Properties / Flow | Format                                                                                     |
| ------------- | ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| PostgreSQL    | SQL Database              | Connection URL             | `postgres(ql)://username:password@host:port/database`                                      |
| MySQL         | SQL Database              | Connection URL             | `mysql://username:password@host:port/database`                                             |
| SQLite        | SQL Database (file-based) | Connection URL             | `sqlite://path/to/database.db`                                                             |
| MongoDB       | NoSQL Database            | Connection URL             | `mongodb://username:password@host:port/database`                                           |
| Google Sheets | Spreadsheet (API)         | OAuth / Apps Script        | `sheets://SPREADSHEET_ID/` or `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit` |
| HubSpot       | API                       | Access Token               | `pat-xxx-xxxxxxxx-xxxx-xxxxxxxxxxxx`                                                       |

> **Note:** When adding a new data source, the connection must be valid. liblab.ai performs validation to ensure that credentials, tokens, and URLs are correct before the data source can be saved.

## Choosing the Right Data Source

### Decision Matrix

#### By Use Case

**📊 Business Intelligence & Reporting**

- **Primary**: PostgreSQL, MySQL
- **Alternative**: Google Sheets (for spreadsheet users)
- **Why**: Complex queries, aggregations, historical data

**🚀 Rapid Prototyping & Testing**

- **Primary**: SQLite, Sample Database
- **Alternative**: Google Sheets
- **Why**: Quick setup, no infrastructure required

**👥 Team Collaboration**

- **Primary**: Google Sheets
- **Alternative**: MongoDB (for technical teams)
- **Why**: Real-time updates, familiar interface

**🏢 Enterprise Applications**

- **Primary**: PostgreSQL
- **Alternative**: MySQL, MongoDB
- **Why**: Scalability, security, performance

**📱 Modern Web Applications**

- **Primary**: MongoDB
- **Alternative**: PostgreSQL
- **Why**: Flexible schema, JSON support

#### By Technical Requirements

**High Performance & Scale**

1. PostgreSQL (with connection pooling)
2. MySQL (optimized configuration)
3. MongoDB (proper indexing)

**Simplicity & Quick Setup**

1. SQLite (local files)
2. Google Sheets (sharable links)
3. Sample Database (instant)

**Advanced Features**

1. PostgreSQL (advanced SQL, JSON, arrays)
2. MongoDB (aggregation pipelines)
3. Google Sheets (collaborative features)

**Security & Compliance**

1. PostgreSQL (enterprise-grade)
2. MySQL (proven track record)
3. Google Sheets (OAuth, enterprise controls)

### Architecture Considerations

#### Single User / Small Team

- **SQLite**: Local development, prototyping
- **Google Sheets**: Collaborative spreadsheets
- **Sample Database**: Learning and testing

#### Medium Applications

- **MySQL**: Web applications, content management
- **MongoDB**: APIs, microservices
- **PostgreSQL**: Data analytics, reporting

#### Enterprise / Large Scale

- **PostgreSQL**: Mission-critical applications
- **MongoDB**: High-volume, flexible data
- **Google Sheets**: Business user empowerment

---

## Security & Best Practices

### Connection Security

#### Database Connections

```bash
# ✅ Always use SSL in production
postgresql://user:pass@host:5432/db?sslmode=require

# ✅ Use environment variables for credentials
DB_CONNECTION_STRING=mysql://user:${DB_PASSWORD}@host/db

# ❌ Never hardcode passwords
mysql://user:password123@host/db
```

#### API Authentication

```bash
# ✅ Store tokens securely
GOOGLE_CLIENT_SECRET=your_secret_here
HUBSPOT_ACCESS_TOKEN=pat-xxx-xxx

# ✅ Use OAuth when possible
# ✅ Rotate tokens regularly
# ✅ Minimum required scopes only
```

### Data Protection

#### Access Control

- **Principle of Least Privilege**: Grant only necessary permissions
- **Read-Only Access**: Use read-only database users when possible
- **Network Isolation**: Restrict database access to application servers
- **Regular Auditing**: Monitor and log data access patterns

#### Credential Management

- **Environment Variables**: Store sensitive data in environment variables
- **Encryption**: Encrypt credentials at rest
- **Rotation**: Regularly rotate passwords and tokens
- **Monitoring**: Alert on unusual access patterns

### Compliance Considerations

#### Data Residency

- **Cloud Sources**: Data remains in respective cloud provider
- **Database Sources**: Data location controlled by your infrastructure
- **Local Sources**: Data remains on local systems

#### Privacy & GDPR

- **Google Workspace**: GDPR-compliant, user consent required
- **Database Sources**: Your responsibility for compliance
- **Audit Trails**: Maintain logs of data access and modifications

#### Business Continuity

- **Backup Strategies**: Regular backups for critical data sources
- **Disaster Recovery**: Plan for data source unavailability
- **Monitoring**: Implement health checks and alerting

---

## Troubleshooting

### Connection Problems

**Can't connect to database?**

- Double-check your username and password
- Make sure your database is running
- Verify the database name is correct

**Google Sheets not working?**

- Check that your sheet is shared with "Anyone with the link can view"
- Make sure you're using the correct sheet URL

**HubSpot connection failed?**

- Verify your access token is correct
- Check that your token hasn't expired

### Need Help?

If you're still having trouble:

1. Try the sample database first to test the platform
2. Check your connection details are exactly right
3. Contact support with your specific error message

---

## Next Steps

### Getting Started

1. **[Choose your data source](#choosing-the-right-data-source)** based on your needs
2. **Follow the setup guide** for your selected source
3. **Test the connection** with simple queries
4. **Explore AI capabilities** with natural language questions
5. **Build dashboards** and visualizations

### Advanced Usage

- **[Google Sheets Integration Guide](./getting-started/google-sheets-integration.md)** - Complete setup instructions
- **[Configuration Guide](./configuration.md)** - Advanced settings and customization
- **[Security Guide](./security-and-privacy.md)** - Best practices for production deployments

### Need Help?

- 📖 Check our **[troubleshooting section](#troubleshooting)**
- 💡 Review **[best practices](#security--best-practices)**
- 🔍 Search existing documentation
- 🚀 Start with the **[sample database](#sqlite-sample-database)** to learn the platform

### Stay Updated

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
