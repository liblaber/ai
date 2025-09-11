# MongoDB Data Source

This guide explains how to connect MongoDB as a data source in **liblab.ai**. MongoDB is a popular NoSQL document database that provides flexibility and scalability for modern applications.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Connection Setup](#connection-setup)
- [Supported Operations](#supported-operations)
- [Query Examples](#query-examples)
- [Schema Detection](#schema-detection)
- [Security & Best Practices](#security--best-practices)

## Quick Start

To connect MongoDB to liblab.ai, you need a MongoDB connection string in one of these formats:

```
mongodb://localhost:27017/database_name
mongodb://username:password@localhost:27017/database_name
mongodb+srv://username:password@cluster.mongodb.net/database_name
```

The system supports both local MongoDB instances and cloud services like MongoDB Atlas.

---

## Connection Setup

1. **Get your MongoDB connection string** from your MongoDB deployment
2. **Add MongoDB as a data source** in liblab.ai
3. **Enter your connection string** when prompted
4. **Test the connection** to ensure it works properly

### Supported Connection Formats

- **Local MongoDB**: `mongodb://localhost:27017/database_name`
- **MongoDB with authentication**: `mongodb://username:password@host:port/database_name`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database_name`

---

## Supported Operations

liblab.ai supports both read and write MongoDB operations. All queries must be formatted as JSON objects with specific structure.

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

### Query Structure

All queries must include:

- `collection`: The MongoDB collection name
- `operation`: One of the supported operations
- Additional fields based on operation type:
  - **find**: `filter` (object), `options` (object)
  - **aggregate**: `pipeline` (array)
  - **insertOne**: `document` (object)
  - **insertMany**: `documents` (array)
  - **updateOne/updateMany**: `filter` (object), `update` (object), `options` (optional)
  - **deleteOne/deleteMany**: `filter` (object)

---

## Query Examples

### Find Operations

Find queries use `filter` and `options` fields:

```json
{
  "collection": "users",
  "operation": "find",
  "filter": {
    "status": "active",
    "age": { "$gte": 18 }
  },
  "options": {
    "limit": 10,
    "sort": { "name": 1 }
  }
}
```

### Aggregate Operations

Aggregation queries use a `pipeline` array:

```json
{
  "collection": "orders",
  "operation": "aggregate",
  "pipeline": [
    { "$match": { "status": "completed" } },
    {
      "$group": {
        "_id": "$customerId",
        "totalAmount": { "$sum": "$amount" }
      }
    }
  ]
}
```

### Parameter Substitution

Use `$1`, `$2`, etc. for dynamic values:

```json
{
  "collection": "users",
  "operation": "find",
  "filter": {
    "age": { "$gte": "$1" },
    "city": "$2"
  },
  "options": {}
}
```

### Insert Operations

**Insert a single document:**

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

**Insert multiple documents:**

```json
{
  "collection": "products",
  "operation": "insertMany",
  "documents": [
    { "name": "Product A", "price": 100, "category": "electronics" },
    { "name": "Product B", "price": 200, "category": "books" }
  ]
}
```

### Update Operations

**Update a single document:**

```json
{
  "collection": "users",
  "operation": "updateOne",
  "filter": { "_id": "$1" },
  "update": {
    "$set": {
      "status": "inactive",
      "lastModified": "2024-01-01"
    }
  }
}
```

**Update multiple documents:**

```json
{
  "collection": "products",
  "operation": "updateMany",
  "filter": { "category": "electronics" },
  "update": {
    "$inc": { "price": 10 },
    "$set": { "sale": true }
  }
}
```

### Delete Operations

**Delete a single document:**

```json
{
  "collection": "users",
  "operation": "deleteOne",
  "filter": { "email": "$1" }
}
```

**Delete multiple documents:**

```json
{
  "collection": "logs",
  "operation": "deleteMany",
  "filter": {
    "createdAt": { "$lt": "2024-01-01" }
  }
}
```

### Common Query Examples

**Find users by status:**

```json
{
  "collection": "users",
  "operation": "find",
  "filter": { "status": "active" },
  "options": { "limit": 50 }
}
```

**Count by category:**

```json
{
  "collection": "products",
  "operation": "aggregate",
  "pipeline": [{ "$group": { "_id": "$category", "count": { "$sum": 1 } } }]
}
```

**Search with regex:**

```json
{
  "collection": "products",
  "operation": "find",
  "filter": {
    "name": { "$regex": "$1", "$options": "i" }
  },
  "options": { "limit": 10 }
}
```

---

## Schema Detection

liblab.ai automatically detects your MongoDB schema by:

1. **Listing all collections** in your database
2. **Sampling documents** from each collection (up to 10 documents)
3. **Inferring field types** from the sample data
4. **Creating a schema structure** for query building

The detected schema shows:

- Collection names (as table names)
- Field names and inferred types
- Primary key identification (always `_id` for MongoDB)

---

## Security & Best Practices

### Supported Operations

liblab.ai supports the following MongoDB operations:

- ✅ **find**: Query documents with filters
- ✅ **aggregate**: Data transformations and analytics
- ✅ **insertOne/insertMany**: Insert single or multiple documents
- ✅ **updateOne/updateMany**: Update single or multiple documents
- ✅ **deleteOne/deleteMany**: Delete single or multiple documents
- ❌ **drop/admin**: Administrative operations blocked

### Query Validation

All queries are validated for:

- **JSON syntax**: Must be valid JSON format
- **Required fields**: Must include collection and operation
- **Operation type**: Only supported operations allowed (find, aggregate, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany)
- **Dangerous operators**: `$where`, `eval`, and `drop` are blocked

### Connection Security

- **Encrypted connections**: Supports TLS/SSL (mongodb+srv://)
- **Authentication**: Username/password validation
- **Connection timeouts**: 10-second timeout for connection attempts

### Best Practices

#### For Read Operations

1. **Use specific filters** to limit result sizes
2. **Create indexes** on frequently queried fields
3. **Use projections** to select only needed fields
4. **Limit results** to prevent large data transfers

#### For Write Operations

1. **Use appropriate update operators** like `$set`, `$inc`, `$push`, `$pull`
2. **Include specific filters** for update/delete operations to avoid unintended changes
3. **Use `updateOne` vs `updateMany`** carefully based on your intent
4. **Consider using transactions** for complex multi-document operations
5. **Validate data** before insertion to maintain data integrity

#### General

1. **Test queries** in MongoDB shell before using in liblab.ai
2. **Use parameter substitution** (`$1`, `$2`) for dynamic values
3. **Monitor write operations** carefully in production environments

For production deployments, consider MongoDB Atlas for managed hosting with built-in security and monitoring.
