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

## Query Structure

All MongoDB queries in liblab.ai must be formatted as JSON objects with this structure:

```json
{
  "collection": "collection_name",
  "operation": "find",
  "filter": { "status": "active" },
  "options": { "limit": 10 }
}
```

Required fields:

- `collection`: The MongoDB collection name
- `operation`: One of the supported operations

Additional fields depend on the operation type:

- **find**: `filter` (object), `options` (object)
- **aggregate**: `pipeline` (array)
- **insertOne**: `document` (object)
- **insertMany**: `documents` (array)
- **updateOne/updateMany**: `filter` (object), `update` (object), `options` (optional)
- **deleteOne/deleteMany**: `filter` (object)

## Basic Examples

### Finding Documents

```json
{
  "collection": "users",
  "operation": "find",
  "filter": { "status": "active" },
  "options": { "limit": 10, "sort": { "name": 1 } }
}
```

### Inserting Documents

```json
{
  "collection": "users",
  "operation": "insertOne",
  "document": {
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active"
  }
}
```

### Updating Documents

```json
{
  "collection": "users",
  "operation": "updateOne",
  "filter": { "_id": "USER_ID" },
  "update": { "$set": { "status": "inactive" } }
}
```

## Security & Best Practices

### Allowed Operations

- ✅ **find, aggregate, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany**
- ❌ **drop, admin operations, and dangerous operators like $where**

### Connection Security

- **Encrypted connections**: Supports TLS/SSL (mongodb+srv://)
- **Authentication**: Username/password validation
- **Connection timeouts**: 10-second timeout for connection attempts

### Best Practices

1. **Use specific filters** to limit result sizes
2. **Create indexes** on frequently queried fields
3. **Test queries** in MongoDB shell before using in liblab.ai
4. **Monitor write operations** carefully in production environments

For production deployments, consider MongoDB Atlas for managed hosting with built-in security and monitoring.
