# Data Sources

Connect your data to start building AI applications instantly. Choose from databases, spreadsheets, and cloud services to get up and running in minutes.

## Table of Contents

- [What Are Data Sources?](#what-are-data-sources)
- [Quick Start Guide](#quick-start-guide)
- [Supported Data Sources](#supported-data-sources)
- [Database Sources](#database-sources)
- [Cloud & API Sources](#cloud--api-sources)
- [Choosing the Right Data Source](#choosing-the-right-data-source)
- [Security & Best Practices](#security--best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Advanced Configuration](#advanced-configuration)

## What Are Data Sources?

Data sources are where your information lives - databases, spreadsheets, or cloud services. Connect yours and start asking questions in plain English.

### How It Works

1. **Connect** - Add your data in seconds
2. **Ask** - Use natural language to explore your data
3. **Get Results** - See instant charts and insights

---

## Quick Start Guide

### For Non-Technical Users

**Start here if you want to get up and running quickly:**

| If you have...                | Recommended option                         | Setup time | Capabilities           |
| ----------------------------- | ------------------------------------------ | ---------- | ---------------------- |
| **Excel/Google Sheets**       | [Google Sheets](#google-sheets)            | 2 minutes  | Full read/write access |
| **CSV files**                 | [SQLite](#sqlite-sample-database)          | 30 seconds | Upload and analyze     |
| **Need to test the platform** | [Sample Database](#sqlite-sample-database) | Instant    | Pre-loaded demo data   |
| **CRM system (HubSpot)**      | [HubSpot](#hubspot)                        | 5 minutes  | Customer data analysis |

### For Technical Users

**Popular database options:**

| Database                      | Setup   |
| ----------------------------- | ------- |
| [**PostgreSQL**](#postgresql) | Quick   |
| [**MySQL**](#mysql)           | Quick   |
| [**MongoDB**](#mongodb)       | Quick   |
| [**SQLite**](#sqlite)         | Instant |

---

## Supported Data Sources

### Database Sources

| Source                    | Status       | Authentication    | Query Language |
| ------------------------- | ------------ | ----------------- | -------------- |
| [PostgreSQL](#postgresql) | ✅ Available | Username/Password | SQL            |
| [MySQL](#mysql)           | ✅ Available | Username/Password | SQL            |
| [SQLite](#sqlite)         | ✅ Available | File-based        | SQL            |
| [MongoDB](#mongodb)       | ✅ Available | Connection string |

### Cloud & API Sources

| Source                          | Status       | Authentication    | Access Method |
| ------------------------------- | ------------ | ----------------- | ------------- |
| [Google Sheets](#google-sheets) | ✅ Available | OAuth/Apps Script | REST API      |
| [HubSpot](#hubspot)             | ✅ Available | Access Token      | REST API      |

---

## Database Sources

### PostgreSQL

**Best for:** Enterprise applications, complex analytical queries, high-performance requirements

#### Overview

PostgreSQL is a popular database used by many applications. Great for businesses with existing PostgreSQL databases.

#### Connection Setup

**Connection String Format:**

```
postgresql://username:password@hostname:port/database_name
```

**Example:**

```
postgresql://myuser:mypassword@localhost:5432/company_db
```

**SSL Support:**

```
postgresql://user:pass@host:5432/db?sslmode=require
```

#### What You Get

- Automatic understanding of your data structure
- Secure connections
- Support for all data types

### MySQL

**Best for:** Web applications, WordPress sites, traditional LAMP stack applications

#### Overview

MySQL powers millions of websites and applications. Perfect if you're already using MySQL for your business.

#### Connection Setup

**Connection String Format:**

```
mysql://username:password@hostname:port/database_name
```

**Example:**

```
mysql://webuser:webpass@db.example.com:3306/website_db
```

#### What You Can Do

**✅ Supported Operations:**

- Full SQL DML operations (SELECT, INSERT, UPDATE, DELETE)
- Complex queries with JOINs and subqueries
- MySQL-specific functions and syntax
- Data aggregation and reporting

**❌ Restricted Operations:**

- DDL operations (CREATE, DROP, ALTER)
- Administrative functions
- Database structure changes

#### What You Need

- MySQL database (version 5.7 or newer)
- Database login credentials
- Network access to your database

---

### SQLite

**Best for:** Local development, file-based databases, prototyping, small to medium datasets

#### Overview

SQLite works with database files on your computer. No setup needed - just point to your .db file and start exploring.

#### Connection Setup

**Connection String Format:**

```
sqlite:///path/to/database.db
```

**Examples:**

```
sqlite:///Users/john/myapp/data.db
sqlite:///home/user/projects/analytics.db
sqlite:///C:/Data/sales.db
```

#### What You Can Do

**✅ Supported Operations:**

- Full SQL queries with SQLite syntax
- File-based data access
- Fast local operations
- Sample database exploration

**❌ Restricted Operations:**

- DDL operations for security
- No network connectivity
- Limited concurrent access

#### What You Need

- A .db file on your computer
- File access permissions

---

### MongoDB

**Best for:** Document-based applications, JSON data, modern web applications, flexible schemas

#### Overview

MongoDB stores data as documents (like JSON files). Great if your data doesn't fit into traditional rows and columns.

#### Connection Setup

**Connection String Format:**

```
mongodb://username:password@hostname:port/database_name
```

**Examples:**

```
mongodb://user:pass@localhost:27017/myapp
mongodb+srv://user:pass@cluster.mongodb.net/production
```

#### What You Can Do

**✅ Supported Operations:**

- Document queries with filters and projections
- Aggregation pipelines for complex data processing
- JSON-based query syntax
- Collection and field discovery

**❌ Restricted Operations:**

- Administrative operations (dropDatabase, createUser)
- Security-sensitive operations ($where, eval)
- Database structure modifications

#### What You Need

- MongoDB database (version 4.0 or newer)
- Database connection details
- Login credentials

---

## Cloud & API Sources

### Google Sheets

**Best for:** Spreadsheet data, collaborative datasets, business reporting, real-time data updates

#### Overview

Connect your Google Sheets to analyze spreadsheet data instantly. Perfect for teams already using Google Sheets.

#### Connection Methods

| Method            | Setup Time | Capabilities    |
| ----------------- | ---------- | --------------- |
| **Sharable Link** | 30 seconds | Read-only       |
| **Apps Script**   | 5 minutes  | Full read/write |
| **OAuth**         | 15 minutes | Full API access |

#### What You Can Do

**✅ Supported Operations:**

- Read entire sheets or specific ranges
- Write data (with Apps Script or OAuth)
- Get sheet metadata and structure
- Real-time data updates
- Multi-sheet workbook support

**Query Format Example:**

```json
{
  "operation": "readRange",
  "parameters": {
    "range": "A1:E100",
    "valueRenderOption": "FORMATTED_VALUE"
  }
}
```

#### What You Need

- Google account
- Access to the spreadsheet you want to analyze
- Internet connection

📖 **[View Complete Google Sheets Guide](./getting-started/google-sheets-integration.md)**

---

### HubSpot

**Best for:** CRM data analysis, customer insights, sales reporting

#### Overview

Connect your HubSpot CRM to analyze customer data and sales insights. Great for HubSpot users.

#### Connection Setup

- **Authentication**: Private App Access Token
- **Format**: `pat-xxx-xxxxxxxx-xxxx-xxxxxxxxxxxx`
- **Access**: Bearer token authentication

#### What You Can Do

**✅ Current Capabilities:**

- Connection testing and validation
- Access to contact objects
- Basic CRM data connectivity

#### Requirements

- HubSpot account with appropriate permissions
- Private app access token
- Internet connectivity

---

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
