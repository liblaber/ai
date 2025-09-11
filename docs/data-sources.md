# Data Sources - Complete Guide

Connect your data and unlock the power of AI-driven insights. This comprehensive guide covers all supported data sources, from traditional databases to modern cloud services, helping you choose the right solution for your needs.

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

Data sources are the foundation of your AI applications. They represent any system that contains your data - from traditional databases to modern cloud services. Once connected, liblab.ai builds applications based on your prompts and connected data source.

### How It Works

1. **Connect**: Add your data source with simple configuration
2. **Analyze**: AI automatically understands your data structure
3. **Query**: Ask questions in plain English
4. **Visualize**: Get instant charts, graphs, and dashboards
5. **Iterate**: Refine and explore deeper insights

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

**Choose based on your infrastructure:**

| Database Type                 | Best for                                 | Setup complexity | Performance |
| ----------------------------- | ---------------------------------------- | ---------------- | ----------- |
| [**PostgreSQL**](#postgresql) | Production applications, complex queries | Medium           | Excellent   |
| [**MySQL**](#mysql)           | Web applications, WordPress sites        | Medium           | Excellent   |
| [**MongoDB**](#mongodb)       | Document stores, modern apps             | Medium           | Very Good   |
| [**SQLite**](#sqlite)         | Local files, prototypes                  | Easy             | Good        |

---

## Supported Data Sources

### Database Sources

| Source                    | Status       | Authentication    | Query Language | Best For                |
| ------------------------- | ------------ | ----------------- | -------------- | ----------------------- |
| [PostgreSQL](#postgresql) | ✅ Available | Username/Password | SQL            | Enterprise applications |
| [MySQL](#mysql)           | ✅ Available | Username/Password | SQL            | Web applications        |
| [SQLite](#sqlite)         | ✅ Available | File-based        | SQL            | Local development       |
| [MongoDB](#mongodb)       | ✅ Available | Connection string | JSON queries   | Document stores         |

### Cloud & API Sources

| Source                          | Status         | Authentication    | Access Method | Best For          |
| ------------------------------- | -------------- | ----------------- | ------------- | ----------------- |
| [Google Sheets](#google-sheets) | ✅ Available   | OAuth/Apps Script | REST API      | Spreadsheet data  |
| [Google Docs](#google-docs)     | 🚧 Coming Soon | OAuth/API Key     | REST API      | Document analysis |
| [HubSpot](#hubspot)             | 🚧 Beta        | Access Token      | REST API      | CRM data          |

### Coming Soon

| Source         | Use Case                    |
| -------------- | --------------------------- |
| **Salesforce** | Enterprise CRM              |
| **Jira**       | Project management          |
| **GitHub**     | Code repositories           |
| **Airtable**   | Database/spreadsheet hybrid |
| **Notion**     | Knowledge bases             |

---

## Database Sources

### PostgreSQL

**Best for:** Enterprise applications, complex analytical queries, high-performance requirements

#### Overview

PostgreSQL is a powerful, open-source relational database known for its reliability, feature robustness, and performance. Perfect for production applications requiring complex queries and high data integrity.

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


#### Special Features

- **Connection Pooling**: Automatic connection management for optimal performance
- **Schema Discovery**: AI automatically understands your tables, relationships, and data types
- **Enum Support**: Recognizes and uses PostgreSQL enum types
- **Advanced Types**: Support for JSON, arrays, and custom types
- **Prepared Statements**: Secure parameter binding with appropriate database syntax

### MySQL

**Best for:** Web applications, WordPress sites, traditional LAMP stack applications

#### Overview

MySQL is the world's most popular open-source database, powering millions of web applications. Ideal for web development and applications requiring proven reliability.

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

#### Special Features

- **Enhanced Schema Discovery**: Includes table comments, column descriptions
- **ENUM Type Support**: Recognizes MySQL enum values and constraints
- **Type Casting**: Automatic type conversion for optimal data handling
- **MySQL Syntax**: Native support for MySQL-specific SQL features
- **Prepared Statements**: Secure queries with `?` parameter placeholders

#### Performance Notes

- **Single Connection**: One connection per data source instance
- **Type Optimization**: Efficient handling of MySQL data types
- **Query Formatting**: MySQL-specific SQL generation

#### Requirements

- MySQL 5.7 or higher (MySQL 8.0 recommended)
- Network access to database server
- User account with appropriate SELECT permissions

---

### SQLite

**Best for:** Local development, file-based databases, prototyping, small to medium datasets

#### Overview

SQLite is a lightweight, file-based database that requires no server setup. Perfect for development, testing, and applications that need a simple, reliable database.

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

#### Special Features

- **File-Based**: No server required, just point to a database file
- **Sample Database**: Built-in sample data for testing and learning
- **PRAGMA Support**: Schema introspection using SQLite PRAGMA commands
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Zero Configuration**: No setup required beyond file path

#### Performance Notes

- **High Performance**: Direct file access, no network overhead
- **Single User**: Optimized for single-user access patterns
- **Memory Efficiency**: Minimal resource requirements

#### Requirements

- SQLite database file
- File system read/write permissions
- Compatible with SQLite 3.x format

---

### MongoDB

**Best for:** Document-based applications, JSON data, modern web applications, flexible schemas

#### Overview

MongoDB is a NoSQL document database that stores data in flexible, JSON-like documents. Ideal for applications with evolving schemas and complex, nested data structures.

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

#### Special Features

- **Document Schema Discovery**: Automatically analyzes document structure
- **Aggregation Pipelines**: Powerful data processing and transformation
- **JSON Query Format**: Native JSON query syntax
- **Flexible Schema**: Handles varying document structures
- **Parameter Substitution**: Secure parameter binding with `$1, $2` syntax

#### Query Format Example

```json
{
  "operation": "find",
  "parameters": {
    "filter": { "status": "active", "age": { "$gte": 18 } },
    "projection": { "name": 1, "email": 1 },
    "limit": 100
  }
}
```

#### Performance Notes

- **Connection Pooling**: Automatic connection management
- **Timeouts**: 10s server selection, 10s connection timeout
- **Document Optimization**: Efficient JSON serialization

#### Requirements

- MongoDB 4.0 or higher
- Network access to MongoDB server
- Valid authentication credentials

---

## Cloud & API Sources

### Google Sheets

**Best for:** Spreadsheet data, collaborative datasets, business reporting, real-time data updates

#### Overview

Google Sheets integration provides powerful spreadsheet connectivity with multiple authentication methods. Perfect for teams that work with spreadsheet data and need real-time access.

#### Connection Methods

| Method            | Setup Time | Capabilities    | Best For                       |
| ----------------- | ---------- | --------------- | ------------------------------ |
| **Sharable Link** | 30 seconds | Read-only       | Quick testing, public data     |
| **Apps Script**   | 5 minutes  | Full read/write | Production use, private sheets |
| **OAuth**         | 15 minutes | Full API access | Enterprise, multi-user         |

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

#### Special Features

- **Multiple Authentication**: Choose what works for your security needs
- **Real-time Updates**: Changes reflect immediately
- **Schema Generation**: AI understands your column structure
- **Rate Limiting**: Built-in API quota management
- **Auto-retry**: Handles temporary failures gracefully

#### Performance Notes

- **Rate Limits**: 100 requests/minute, 10k requests/day
- **Caching**: Intelligent caching for frequently accessed data
- **Batch Operations**: Efficient bulk data operations

#### Requirements

- Google account
- Internet connectivity
- Appropriate sheet permissions

📖 **[View Complete Google Sheets Guide](./getting-started/google-sheets-integration.md)**

---

### HubSpot

**Best for:** CRM data analysis, customer insights, sales reporting

#### Overview

HubSpot integration provides access to your CRM data for customer analysis and sales insights. Ideal for businesses using HubSpot for customer relationship management.

#### Connection Setup

- **Authentication**: Private App Access Token
- **Format**: `pat-xxx-xxxxxxxx-xxxx-xxxxxxxxxxxx`
- **Access**: Bearer token authentication

#### What You Can Do

**✅ Current Capabilities:**

- Connection testing and validation
- Access to contact objects
- Basic CRM data connectivity

**🚧 In Development:**

- Full contact, company, and deal access
- Custom property support
- Advanced filtering and querying

#### Requirements

- HubSpot account with appropriate permissions
- Private app access token
- Internet connectivity

#### Status

🚧 **Currently in beta** - Connection testing available, full query interface in development

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

### Common Connection Issues

#### Database Connection Failures

**"Connection refused" or "Cannot connect"**

```bash
# Check connectivity
ping database-host.example.com
telnet database-host.example.com 5432

# Verify credentials
psql postgresql://user:pass@host:5432/db

# Check firewall rules
# Ensure port is open (5432 for PostgreSQL, 3306 for MySQL, etc.)
```

**"Authentication failed"**

- Verify username and password
- Check user permissions on target database
- Confirm user can connect from your IP address
- For PostgreSQL: Check `pg_hba.conf` settings

**"Database does not exist"**

- Verify database name spelling
- Check if database is created
- Confirm user has access to the database

#### API Connection Issues

**Google Sheets "Permission denied"**

- Verify sheet sharing settings ("Anyone with link can view")
- Check if Apps Script is deployed correctly
- Confirm OAuth tokens are valid and not expired

**HubSpot "Unauthorized"**

- Verify access token format (pat-xxx-xxx...)
- Check token permissions and scopes
- Confirm token is not expired or revoked

### Query Execution Problems

#### SQL Syntax Errors

```sql
-- ✅ Correct parameter syntax
SELECT * FROM users WHERE id = $1

-- ❌ Incorrect parameter syntax
SELECT * FROM users WHERE id = ?1
```

#### MongoDB Query Issues

```json
// ✅ Correct JSON format
{
  "operation": "find",
  "parameters": {
    "filter": { "status": "active" }
  }
}

// ❌ Invalid JSON
{
  operation: "find",
  parameters: { status: active }
}
```

### Performance Issues

#### Slow Query Performance

1. **Check Query Complexity**: Simplify complex JOINs
2. **Add Indexes**: Ensure proper database indexing
3. **Limit Results**: Use LIMIT clauses for large datasets
4. **Connection Pooling**: Verify pool settings

#### API Rate Limiting

1. **Monitor Quotas**: Check API usage limits
2. **Implement Caching**: Cache frequently accessed data
3. **Batch Operations**: Combine multiple operations
4. **Retry Logic**: Implement exponential backoff

### Debugging Steps

#### Step 1: Basic Connectivity

```bash
# Test network connectivity
ping hostname
telnet hostname port

# Test authentication
# (database-specific connection tools)
```

#### Step 2: Permission Verification

```sql
-- Check user permissions
SHOW GRANTS FOR 'username'@'host'; -- MySQL
\du -- PostgreSQL
```

#### Step 3: Query Testing

- Start with simple SELECT queries
- Test parameter substitution
- Verify data types and formats

#### Step 4: Log Analysis

- Check application logs for detailed errors
- Review database server logs
- Monitor API response codes and messages

---

## Performance Optimization

### Database Performance

#### Connection Management

```javascript
// ✅ Use connection pooling
const pool = new Pool({
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

// ❌ Creating new connections for each query
const client = new Client({ connectionString });
```

#### Query Optimization

```sql
-- ✅ Use indexes effectively
SELECT * FROM orders
WHERE customer_id = $1
  AND created_date >= $2
ORDER BY created_date DESC
LIMIT 100;

-- ✅ Avoid SELECT *
SELECT id, name, email FROM users WHERE active = true;

-- ❌ Full table scans
SELECT * FROM large_table WHERE description LIKE '%keyword%';
```

#### Data Types

- **PostgreSQL**: Use appropriate numeric types (INTEGER vs BIGINT)
- **MongoDB**: Optimize document structure and indexing
- **MySQL**: Choose proper VARCHAR lengths and use ENUM when appropriate

### API Performance

#### Google Sheets Optimization

```json
// ✅ Request specific ranges
{
  "operation": "readRange",
  "parameters": {
    "range": "A1:E100"
  }
}

// ❌ Reading entire sheet unnecessarily
{
  "operation": "readSheet",
  "parameters": {
    "sheetName": "Data"
  }
}
```

#### Batch Operations

```json
// ✅ Update multiple cells at once
{
  "operation": "updateRange",
  "parameters": {
    "range": "A1:C1",
    "values": [["Value1", "Value2", "Value3"]]
  }
}

// ❌ Multiple individual updates
// Multiple updateCell operations
```

### Caching Strategies

#### Application-Level Caching

- Cache frequently accessed static data
- Implement TTL (Time To Live) for cached data
- Use Redis or in-memory caching for high-performance needs

#### Database-Level Optimization

- Regular ANALYZE/OPTIMIZE TABLE commands
- Monitor and tune database configuration
- Implement read replicas for read-heavy workloads

### Monitoring & Metrics

#### Key Metrics to Track

- **Connection pool usage** (database sources)
- **Query execution time** (all sources)
- **API quota usage** (cloud sources)
- **Error rates** and **success rates**
- **Data freshness** and **update frequency**

#### Alerting Thresholds

- Connection failures > 5% error rate
- Query execution time > 30 seconds
- API quota usage > 80%
- Consecutive failed requests > 10

---

## Advanced Configuration

### Environment Variables

#### Database Connections

```bash
# PostgreSQL
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/db

# MySQL
MYSQL_CONNECTION_STRING=mysql://user:pass@host:3306/db

# MongoDB
MONGODB_CONNECTION_STRING=mongodb://user:pass@host:27017/db
```

#### API Credentials

```bash
# Google Workspace
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_AUTH_ENCRYPTION_KEY=your_32_char_key

# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-xxx-xxx
```

### Custom Configuration

#### Connection Pooling (PostgreSQL)

```javascript
const poolConfig = {
  max: 20, // Maximum pool connections
  idleTimeoutMillis: 60000, // 60 second idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  ssl: {
    rejectUnauthorized: false, // For self-signed certificates
  },
};
```

#### SSL Configuration

```bash
# PostgreSQL with SSL
postgresql://user:pass@host:5432/db?sslmode=require&sslcert=client-cert.pem

# MySQL with SSL
mysql://user:pass@host:3306/db?ssl=true&sslca=ca-cert.pem
```

### Integration Patterns

#### Multi-Source Analytics

```javascript
// Combine data from multiple sources
const salesData = await queryDatabase('SELECT * FROM sales WHERE date >= $1', [lastMonth]);
const customerData = await queryGoogleSheets('{"operation": "readRange", "parameters": {"range": "A:E"}}');
const crmData = await queryHubSpot('contacts', { filters: { lastSeen: 'recent' } });

// Correlate and analyze across sources
```

#### Real-time Data Pipeline

```javascript
// Set up automatic data synchronization
const syncPipeline = {
  source: 'google-sheets',
  destination: 'postgresql',
  schedule: '*/15 * * * *', // Every 15 minutes
  transformations: ['validate', 'normalize', 'enrich'],
};
```

### Custom Development

#### Plugin Architecture

The application uses a plugin-based architecture that allows for:

- Custom data source implementations
- Extensible authentication methods
- Configurable connection parameters
- Custom query languages and operations

#### API Extensions

- REST API endpoints for programmatic access
- Webhook support for real-time notifications
- Custom authentication providers
- Specialized data transformations

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
- Check the **[coming soon](#coming-soon)** section for upcoming integrations
- Follow our release notes for new features and improvements
