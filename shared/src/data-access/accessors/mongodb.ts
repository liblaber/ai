import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import type { Table } from '../../types';
import { BaseDatabaseAccessor } from '../baseDatabaseAccessor';
import { type DataAccessPluginId, type DataSourceProperty, DataSourceType } from '../utils/types';

export class MongoDBAccessor extends BaseDatabaseAccessor {
  readonly dataSourceType: DataSourceType = DataSourceType.MONGODB;
  readonly pluginId: DataAccessPluginId = 'mongodb';
  readonly label = 'MongoDB';
  readonly preparedStatementPlaceholderExample = '{ field: $value }';
  readonly connectionStringFormat = 'mongodb://username:password@host:port/database';
  private _client: MongoClient | null = null;
  private _db: Db | null = null;

  async testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    const client = new MongoClient(this.getConnectionStringFromProperties(dataSourceProperties), {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    try {
      await client.connect();
      await client.db().admin().ping();
      await client.close();

      return true;
    } catch {
      await client.close();

      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._db) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON format for MongoDB query: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      );
    }

    try {
      if (!parsedQuery.collection) {
        throw new Error('MongoDB query must specify a collection name');
      }

      const collection: Collection = this._db.collection(parsedQuery.collection);
      const processedQuery = this._processParameters(parsedQuery, params);

      return await this._executeOperation(collection, processedQuery);
    } catch (error) {
      throw new Error((error as Error)?.message);
    }
  }

  private _processParameters(query: any, params?: string[]): any {
    if (!params || params.length === 0) {
      return query;
    }

    const processedQuery = JSON.parse(JSON.stringify(query));
    this._replaceParametersRecursively(processedQuery, params);

    return processedQuery;
  }

  private async _executeOperation(collection: Collection, query: any): Promise<any[]> {
    const { operation } = query;

    switch (operation) {
      case 'find':
        return await this._executeFindOperation(collection, query);
      case 'aggregate':
        return await this._executeAggregateOperation(collection, query);
      case 'insertOne':
        return await this._executeInsertOneOperation(collection, query);
      case 'insertMany':
        return await this._executeInsertManyOperation(collection, query);
      case 'updateOne':
        return await this._executeUpdateOneOperation(collection, query);
      case 'updateMany':
        return await this._executeUpdateManyOperation(collection, query);
      case 'deleteOne':
        return await this._executeDeleteOneOperation(collection, query);
      case 'deleteMany':
        return await this._executeDeleteManyOperation(collection, query);
      default:
        throw new Error(`Unsupported MongoDB operation: ${operation}`);
    }
  }

  private async _executeFindOperation(collection: Collection, query: any): Promise<any[]> {
    const filter = query.filter || {};
    const options = query.options || {};
    const cursor = collection.find(filter, options);

    return await cursor.toArray();
  }

  private async _executeAggregateOperation(collection: Collection, query: any): Promise<any[]> {
    const pipeline = query.pipeline || [];
    const cursor = collection.aggregate(pipeline);

    return await cursor.toArray();
  }

  private async _executeInsertOneOperation(collection: Collection, query: any): Promise<any[]> {
    const document = query.document || {};
    const result = await collection.insertOne(document);

    return [
      {
        insertedId: result.insertedId,
        acknowledged: result.acknowledged,
      },
    ];
  }

  private async _executeInsertManyOperation(collection: Collection, query: any): Promise<any[]> {
    const documents = query.documents || [];
    const result = await collection.insertMany(documents);

    return [
      {
        insertedIds: result.insertedIds,
        insertedCount: result.insertedCount,
        acknowledged: result.acknowledged,
      },
    ];
  }

  private async _executeUpdateOneOperation(collection: Collection, query: any): Promise<any[]> {
    const filter = query.filter || {};
    const update = query.update || {};
    const options = query.options || {};

    let result = await collection.updateOne(filter, update, options);

    if (result.matchedCount === 0 && filter._id !== undefined) {
      result = await this._retryWithAlternativeIdFormats(collection, 'updateOne', filter, update, options);
    }

    return [
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
        upsertedId: result.upsertedId,
      },
    ];
  }

  private async _executeUpdateManyOperation(collection: Collection, query: any): Promise<any[]> {
    const filter = query.filter || {};
    const update = query.update || {};
    const options = query.options || {};

    let result = await collection.updateMany(filter, update, options);

    if (result.matchedCount === 0 && filter._id !== undefined) {
      result = await this._retryWithAlternativeIdFormats(collection, 'updateMany', filter, update, options);
    }

    return [
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId,
      },
    ];
  }

  private async _executeDeleteOneOperation(collection: Collection, query: any): Promise<any[]> {
    const filter = query.filter || {};

    let result = await collection.deleteOne(filter);

    if (result.deletedCount === 0 && filter._id !== undefined) {
      result = await this._retryWithAlternativeIdFormats(collection, 'deleteOne', filter);
    }

    return [
      {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged,
      },
    ];
  }

  private async _executeDeleteManyOperation(collection: Collection, query: any): Promise<any[]> {
    const filter = query.filter || {};

    let result = await collection.deleteMany(filter);

    if (result.deletedCount === 0 && filter._id !== undefined) {
      result = await this._retryWithAlternativeIdFormats(collection, 'deleteMany', filter);
    }

    return [
      {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged,
      },
    ];
  }

  private _replaceParametersRecursively(obj: any, params: string[], visited = new WeakSet()): void {
    if (obj === null || obj === undefined) {
      return;
    }

    // Prevent infinite recursion from circular references
    if (typeof obj === 'object' && visited.has(obj)) {
      return;
    }

    if (typeof obj === 'object') {
      visited.add(obj);
    }

    if (Array.isArray(obj)) {
      // Handle arrays
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string' && this._isValidParameterPlaceholder(obj[i])) {
          // Replace placeholder with parameter value
          const paramIndex = parseInt(obj[i].substring(1)) - 1;

          if (paramIndex >= 0 && paramIndex < params.length) {
            obj[i] = this._parseParameterValue(params[paramIndex]);
          }
        } else if (typeof obj[i] === 'object') {
          this._replaceParametersRecursively(obj[i], params, visited);
        }
      }
    } else if (typeof obj === 'object') {
      // Handle objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string' && this._isValidParameterPlaceholder(obj[key])) {
            // Replace placeholder with parameter value
            const paramIndex = parseInt(obj[key].substring(1)) - 1;

            if (paramIndex >= 0 && paramIndex < params.length) {
              const value = this._parseParameterValue(params[paramIndex]);
              obj[key] = this._convertValueForField(key, value);
            }
          } else if (typeof obj[key] === 'object') {
            this._replaceParametersRecursively(obj[key], params, visited);
          }
        }
      }
    }
  }

  private _convertValueForField(fieldName: string, value: any): any {
    // Handle _id field conversions
    if (fieldName === '_id') {
      return this._convertIdValue(value);
    }

    return value;
  }

  private async _retryWithAlternativeIdFormats(
    collection: any,
    operation: string,
    filter: any,
    updateOrOptions?: any,
    options?: any,
  ): Promise<any> {
    const originalId = filter._id;
    const alternativeFormats = this._getAlternativeIdFormats(originalId);

    // Operation handlers map
    const operationHandlers: { [key: string]: (filter: any, updateOrOptions?: any, options?: any) => Promise<any> } = {
      updateOne: (f, u, o) => collection.updateOne(f, u, o),
      updateMany: (f, u, o) => collection.updateMany(f, u, o),
      deleteOne: (f) => collection.deleteOne(f),
      deleteMany: (f) => collection.deleteMany(f),
    };

    const executeOperation = operationHandlers[operation];

    if (!executeOperation) {
      throw new Error(`Unsupported operation: ${operation}`);
    }

    // Success checkers map
    const hasResults = (result: any): boolean => {
      if (operation.includes('update') || operation.includes('delete')) {
        return result.matchedCount > 0 || result.deletedCount > 0;
      }

      return false;
    };

    // Try alternative ID formats
    for (const alternativeId of alternativeFormats) {
      const alternativeFilter = { ...filter, _id: alternativeId };

      try {
        const result = await executeOperation(alternativeFilter, updateOrOptions, options);

        if (hasResults(result)) {
          return result;
        }
      } catch {
        // Continue to next format
      }
    }

    // Return default "not found" result based on operation type
    const defaultResults: { [key: string]: any } = {
      updateOne: { matchedCount: 0, modifiedCount: 0, acknowledged: true, upsertedId: null },
      updateMany: { matchedCount: 0, modifiedCount: 0, acknowledged: true, upsertedCount: 0, upsertedId: null },
      deleteOne: { deletedCount: 0, acknowledged: true },
      deleteMany: { deletedCount: 0, acknowledged: true },
    };

    return defaultResults[operation] || {};
  }

  private _getAlternativeIdFormats(originalId: any): any[] {
    const alternatives = [];

    // If it's a number, try string
    if (typeof originalId === 'number') {
      alternatives.push(originalId.toString());
    }

    // If it's a string that looks like a number, try number
    if (typeof originalId === 'string' && /^\d+$/.test(originalId)) {
      const numValue = parseInt(originalId, 10);

      if (!isNaN(numValue)) {
        alternatives.push(numValue);
      }
    }

    // If it's a string that looks like an ObjectId, try ObjectId
    if (typeof originalId === 'string' && /^[0-9a-fA-F]{24}$/.test(originalId)) {
      try {
        alternatives.push(new ObjectId(originalId));
      } catch {
        // Ignore conversion error
      }
    }

    // If it's an ObjectId, try string
    if (
      originalId &&
      typeof originalId === 'object' &&
      originalId.constructor &&
      originalId.constructor.name === 'ObjectId'
    ) {
      alternatives.push(originalId.toString());
    }

    return alternatives;
  }

  private _convertIdValue(value: any): any {
    // If the value is already an ObjectId, keep it
    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
      return value;
    }

    // For string values that look like ObjectIds (24 hex characters), try to convert
    if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
      try {
        return new ObjectId(value);
      } catch {
        // If conversion fails, return as string
        return value;
      }
    }

    // For numeric values, convert to string (most common case)
    if (typeof value === 'number') {
      return value.toString();
    }

    // For string numbers, keep as string but also prepare for number fallback
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return value; // Keep as string, but we'll add fallback logic in execution
    }

    return value;
  }

  private _isValidParameterPlaceholder(value: string): boolean {
    // Only accept exact matches for parameter placeholders like $1, $2, etc.
    return /^\$\d+$/.test(value);
  }

  private _parseParameterValue(param: string): any {
    try {
      return JSON.parse(param);
    } catch {
      return param;
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]): void {
    const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);

    try {
      new URL(connectionString);
    } catch {
      throw new Error('Invalid MongoDB connection string format');
    }

    if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
      throw new Error('Connection string must start with mongodb:// or mongodb+srv://');
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new Error('No MongoDB query provided. Please provide a valid MongoDB query to execute.');
    }

    let parsedQuery: any;

    try {
      // Try direct JSON parsing first
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON format for MongoDB query: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }

    try {
      // Validate that we have a proper MongoDB query structure
      if (!parsedQuery || typeof parsedQuery !== 'object') {
        throw new Error('MongoDB query must be a valid JSON object');
      }

      if (!parsedQuery.collection) {
        throw new Error('MongoDB query must specify a collection name');
      }

      const validOperations = [
        'find',
        'aggregate',
        'insertOne',
        'insertMany',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
      ];

      if (!parsedQuery.operation || !validOperations.includes(parsedQuery.operation)) {
        throw new Error(`MongoDB query must specify a valid operation (${validOperations.join(', ')})`);
      }

      // Check for potentially dangerous operations
      const forbiddenOperations = ['drop', 'dropDatabase', 'createUser', 'dropUser', '$where'];

      const queryString = JSON.stringify(parsedQuery).toLowerCase();

      if (forbiddenOperations.some((op) => queryString.includes(op.toLowerCase()))) {
        throw new Error('Query contains forbidden MongoDB operations');
      }

      // Check for eval or $where operators which can execute arbitrary code
      if (queryString.includes('$where') || queryString.includes('eval')) {
        throw new Error('Query contains potentially dangerous operators');
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('MongoDB query')) {
        throw error;
      }

      throw new Error(`Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSchema(): Promise<Table[]> {
    if (!this._db) {
      throw new Error('Database connection not initialized. Please call initialize() first.');
    }

    try {
      const collections = await this._db.listCollections().toArray();
      const tables: Table[] = [];

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = this._db.collection(collectionName);

        // Sample a few documents to infer schema
        const sampleDocs = await collection.find({}).limit(10).toArray();

        const columns: any[] = [];
        const fieldTypes: { [key: string]: Set<string> } = {};

        // Analyze sample documents to infer field types
        sampleDocs.forEach((doc: any) => {
          Object.keys(doc).forEach((field) => {
            if (!fieldTypes[field]) {
              fieldTypes[field] = new Set();
            }

            fieldTypes[field].add(typeof doc[field]);
          });
        });

        // Convert field analysis to column definitions
        Object.keys(fieldTypes).forEach((field) => {
          const types = Array.from(fieldTypes[field]);
          columns.push({
            name: field,
            type: types.length === 1 ? types[0] : 'mixed',
            isPrimary: field === '_id',
          });
        });

        tables.push({
          tableName: collectionName,
          columns,
        });
      }

      return tables;
    } catch (error) {
      throw new Error((error as Error)?.message);
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._client) {
      await this.close();
    }

    this._client = new MongoClient(databaseUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await this._client.connect();

    // Extract database name from URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1) || 'test';

    this._db = this._client.db(dbName);

    try {
      const collections = await this._db.listCollections().toArray();

      if (collections.length === 0) {
        console.warn('MongoDB: No collections found in the database. Please verify the database name and connection.');
      }
    } catch (error) {
      console.log('MongoDB: Could not list collections:', (error as Error).message);
    }
  }

  async close(): Promise<void> {
    if (this._client) {
      await this._client.close();
      this._client = null;
      this._db = null;
    }
  }

  generateSampleSchema(): Table[] {
    return [
      {
        tableName: 'airbnb',
        columns: [
          { name: '_id', type: 'string', isPrimary: true },
          { name: 'name', type: 'string', isPrimary: false },
          { name: 'summary', type: 'string', isPrimary: false },
          {
            name: 'room_type',
            type: 'string',
            isPrimary: false,
            enumValues: ['Entire home/apt', 'Private room', 'Shared room'],
          },
          { name: 'property_type', type: 'string', isPrimary: false },
          { name: 'price', type: 'object', isPrimary: false },
          {
            name: 'amenities',
            type: 'array',
            isPrimary: false,
          },
          { name: 'accommodates', type: 'number', isPrimary: false },
          { name: 'bedrooms', type: 'number', isPrimary: false },
          { name: 'beds', type: 'number', isPrimary: false },
          { name: 'bathrooms', type: 'object', isPrimary: false },
          { name: 'number_of_reviews', type: 'number', isPrimary: false },
          { name: 'host', type: 'object', isPrimary: false },
          { name: 'address', type: 'object', isPrimary: false },
        ],
      },
      {
        tableName: 'reviews',
        columns: [
          { name: '_id', type: 'ObjectId', isPrimary: true },
          { name: 'listing_id', type: 'string', isPrimary: false },
          { name: 'reviewer_id', type: 'string', isPrimary: false },
          { name: 'reviewer_name', type: 'string', isPrimary: false },
          { name: 'comments', type: 'string', isPrimary: false },
          { name: 'date', type: 'Date', isPrimary: false },
        ],
      },
      {
        tableName: 'hosts',
        columns: [
          { name: '_id', type: 'ObjectId', isPrimary: true },
          { name: 'host_id', type: 'string', isPrimary: false },
          { name: 'host_name', type: 'string', isPrimary: false },
          { name: 'host_since', type: 'Date', isPrimary: false },
          { name: 'host_listings_count', type: 'number', isPrimary: false },
        ],
      },
    ];
  }

  formatQuery(query: string): string {
    try {
      const parsedQuery = JSON.parse(query);
      return JSON.stringify(parsedQuery, null, 2);
    } catch {
      // If it's not valid JSON, return as-is
      return query;
    }
  }

  generateSystemPrompt(
    databaseType: string,
    dbSchema: string,
    existingQueries: string[] | undefined,
    userPrompt: string,
  ): string {
    return `You are a MongoDB expert tasked with generating MongoDB queries based on a given database schema and user requirements.
Your goal is to create accurate, optimized queries that address the user's request while adhering to specific guidelines and output format.

You will be working with the following database type:
<databaseType>
${databaseType}
</databaseType>

Here is the database schema you should use (collections and their field structure):
<dbSchema>
${dbSchema}
</dbSchema>

${existingQueries ? `Here are the existing MongoDB queries used by the app the user is building. Use them as context if they need to be updated to fulfill the user's request: <existing_mongodb_queries>${existingQueries}</existing_mongodb_queries>` : ''}

To generate the MongoDB queries, follow these steps:
1. Carefully analyze the user's request and the provided database schema.
2. Create one or more MongoDB queries that accurately address the user's requirements.
3. Structure queries as JSON objects with the following format:
   // For read operations
   {
     "collection": "collection_name",
     "operation": "find" | "aggregate",
     "filter": {...}, // for find operations
     "options": {...}, // for find operations (limit, sort, etc.)
     "pipeline": [...] // for aggregate operations
   }
   
   // For write operations
   {
     "collection": "collection_name",
     "operation": "insertOne" | "insertMany" | "updateOne" | "updateMany" | "deleteOne" | "deleteMany",
     "document": {...}, // for insertOne
     "documents": [...], // for insertMany
     "filter": {...}, // for update/delete operations
     "update": {...}, // for update operations
     "options": {...} // optional for all operations
   }
4. Use MongoDB query operators like $match, $group, $sort, $limit, $project, etc.
5. For array fields (like amenities), use appropriate operators:
   - Use exact string match: {"amenities": "Pets allowed"}
   - Use $in for multiple values: {"amenities": {"$in": ["Pets allowed", "WiFi"]}}
   - Use $regex for partial matches: {"amenities": {"$regex": "pets", "$options": "i"}}
6. Do not use any administrative operations like drop, createUser, or eval.
7. Use appropriate aggregation pipelines for complex queries.
8. For write operations, use appropriate update operators like $set, $unset, $inc, $push, $pull, etc.
9. Optimize the queries for performance.
10. Avoid using any collections or fields not present in the schema.
11. If needed, parametrize the query using positional placeholders like $1, $2, etc.
12. Use exact field names and values as shown in the schema.
13. For queries about "having" or "containing" specific values in arrays, use exact string matching.
14. Provide a brief explanation for each query.
15. Specify the response schema for each query, including selected field types.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your MongoDB query as JSON string here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "field_name1 (data_type), field_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "{\"collection\": \"airbnb\", \"operation\": \"find\", \"filter\": {\"amenities\": \"Pets allowed\"}, \"options\": {}}",
    "explanation": "Finds all listings that allow pets by searching the amenities array",
    "responseSchema": "_id (string), name (string), amenities (array), room_type (string)"
  },
  {
    "query": "{\"collection\": \"airbnb\", \"operation\": \"insertOne\", \"document\": {\"name\": \"New Listing\", \"room_type\": \"Private room\", \"price\": 100}}",
    "explanation": "Inserts a new listing with specified properties",
    "responseSchema": "insertedId (ObjectId), acknowledged (boolean)"
  },
  {
    "query": "{\"collection\": \"airbnb\", \"operation\": \"updateOne\", \"filter\": {\"_id\": \"$1\"}, \"update\": {\"$set\": {\"price\": \"$2\"}}}",
    "explanation": "Updates the price of a specific listing by ID",
    "responseSchema": "matchedCount (number), modifiedCount (number), acknowledged (boolean)"
  },
  {
    "query": "{\"collection\": \"airbnb\", \"operation\": \"deleteMany\", \"filter\": {\"status\": \"inactive\"}}",
    "explanation": "Deletes all inactive listings",
    "responseSchema": "deletedCount (number), acknowledged (boolean)"
  }
]

IMPORTANT: Your output should consist ONLY of the JSON array containing the query objects. Do not include any additional text or explanations outside of this JSON structure.
IMPORTANT: The query field should contain a properly formatted JSON string representing the MongoDB query object. Use standard JSON escaping (not double-escaped).

Now, generate MongoDB queries based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;
  }

  private _safeStringify(obj: any, maxDepth = 3): string {
    const seen = new WeakSet();

    const replacer = (key: string, value: any, depth = 0): any => {
      if (depth > maxDepth) {
        return '[Max Depth Reached]';
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }

        seen.add(value);

        if (Array.isArray(value)) {
          return value.map((item, index) => replacer(String(index), item, depth + 1));
        } else {
          const result: any = {};

          for (const [k, v] of Object.entries(value)) {
            result[k] = replacer(k, v, depth + 1);
          }

          return result;
        }
      }

      return value;
    };

    try {
      return JSON.stringify(replacer('', obj), null, 2);
    } catch (error) {
      return '[Serialization Error: ' + (error as Error).message + ']';
    }
  }
}
