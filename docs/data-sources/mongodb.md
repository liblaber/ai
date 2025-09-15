# MongoDB Data Source

Connect your MongoDB database to liblab.ai and start building AI applications with your document data instantly.

## Quick Start

To connect MongoDB to liblab.ai, you need a MongoDB connection string in one of these formats:

```
mongodb://localhost:27017/database_name
mongodb://username:password@localhost:27017/database_name
mongodb+srv://username:password@cluster.mongodb.net/database_name
```

The system supports both local MongoDB instances and cloud services like MongoDB Atlas.

## Connection Setup

1. **Get your MongoDB connection string** from your MongoDB deployment
2. **Add MongoDB as a data source** in liblab.ai
3. **Enter your connection string** when prompted
4. **Test the connection** to ensure it works properly

### Supported Connection Formats

- **Local MongoDB**: `mongodb://localhost:27017/database_name`
- **MongoDB with authentication**: `mongodb://username:password@host:port/database_name`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database_name`

## Supported Operations

liblab.ai supports both read and write MongoDB operations:

### Read Operations

- **find**: Query documents with filters
- **aggregate**: Complex data transformations and analytics

### Write Operations

- **insertOne**: Insert a single document
- **insertMany**: Insert multiple documents
- **updateOne**: Update a single document
- **updateMany**: Update multiple documents
- **deleteOne**: Delete a single document
- **deleteMany**: Delete multiple documents

## Using MongoDB with liblab.ai

Once connected, you can interact with your MongoDB data using natural language. liblab.ai automatically generates the appropriate MongoDB queries based on your requests.

## Examples

### Example Requests

Instead of writing complex MongoDB queries, simply ask liblab.ai in natural language:

- **"Show me all active users"** - Finds documents with active status
- **"Add a new user named John Doe with email john@example.com"** - Inserts new documents
- **"Update user status to inactive where id is 12345"** - Updates specific documents
- **"Delete all inactive users"** - Removes documents matching criteria
- **"Group sales by month and show total revenue"** - Creates aggregation pipelines

## Security & Best Practices

liblab.ai includes built-in security measures to protect your MongoDB data:

- **Secure connections** with TLS/SSL encryption support
- **Authentication** through username/password validation
- **Query validation** to prevent dangerous operations
- **Connection timeouts** for reliable connectivity

### Best Practices

- **Use specific queries** to get exactly the data you need
- **Create database indexes** on frequently searched fields for better performance
- **Test with sample data** before using in production
- **Use MongoDB Atlas** for managed hosting with enhanced security

liblab.ai automatically handles query optimization and security validation, so you can focus on building your application.
