import { MongoClient, Db, Collection } from 'mongodb';
import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';

export class MongoDBAccessor implements BaseAccessor {
  static pluginId = 'mongodb';
  readonly label = 'MongoDB';
  readonly preparedStatementPlaceholderExample = '{ field: $value }';
  readonly connectionStringFormat = 'mongodb://username:password@host:port/database';
  private _client: MongoClient | null = null;
  private _db: Db | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('mongodb://') || databaseUrl.startsWith('mongodb+srv://');
  }

  async testConnection(databaseUrl: string): Promise<boolean> {
    const client = new MongoClient(databaseUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    try {
      await client.connect();
      await client.db().admin().ping();
      await client.close();

      return true;
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
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
      // Parse the query which should be a MongoDB aggregation pipeline or find query
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      console.error('Failed to parse MongoDB query:', {
        original: query,
        error: parseError,
      });
      throw new Error(
        `Invalid JSON format for MongoDB query: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      );
    }

    try {
      console.log('MongoDB: Executing query:', JSON.stringify(parsedQuery, null, 2));

      if (!parsedQuery.collection) {
        throw new Error('MongoDB query must specify a collection name');
      }

      const collection: Collection = this._db.collection(parsedQuery.collection);

      let result: any[] = [];

      // Handle different types of MongoDB operations
      if (parsedQuery.operation === 'find') {
        const filter = parsedQuery.filter || {};
        const options = parsedQuery.options || {};

        // Apply parameters if provided
        if (params && params.length > 0) {
          this._applyParameters(filter, params);
        }

        console.log('MongoDB: Find operation with filter:', JSON.stringify(filter, null, 2));
        console.log('MongoDB: Find operation with options:', JSON.stringify(options, null, 2));

        const cursor = collection.find(filter, options);
        result = await cursor.toArray();

        console.log(`MongoDB: Query returned ${result.length} documents`);

        if (result.length > 0) {
          console.log('MongoDB: Sample result:', this._safeStringify(result[0]));
        }
      } else if (parsedQuery.operation === 'aggregate') {
        const pipeline = parsedQuery.pipeline || [];

        // Apply parameters if provided
        if (params && params.length > 0) {
          this._applyParametersToPipeline(pipeline, params);
        }

        console.log('MongoDB: Aggregate operation with pipeline:', JSON.stringify(pipeline, null, 2));

        const cursor = collection.aggregate(pipeline);
        result = await cursor.toArray();

        console.log(`MongoDB: Aggregation returned ${result.length} documents`);

        if (result.length > 0) {
          console.log('MongoDB: Sample result:', this._safeStringify(result[0]));
        }
      } else {
        throw new Error(`Unsupported MongoDB operation: ${parsedQuery.operation}`);
      }

      return result;
    } catch (error) {
      console.error('Error executing MongoDB query:', error);
      throw new Error((error as Error)?.message);
    }
  }

  private _applyParameters(obj: any, params: string[]): void {
    // Securely replace parameter placeholders by recursively traversing the object
    this._replaceParametersRecursively(obj, params);
  }

  private _applyParametersToPipeline(pipeline: any[], params: string[]): void {
    // Securely replace parameter placeholders in the aggregation pipeline
    this._replaceParametersRecursively(pipeline, params);
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
              obj[key] = this._parseParameterValue(params[paramIndex]);
            }
          } else if (typeof obj[key] === 'object') {
            this._replaceParametersRecursively(obj[key], params, visited);
          }
        }
      }
    }
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

  validate(connectionString: string): void {
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
      console.error('MongoDB JSON parsing error:', parseError);
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

      if (!parsedQuery.operation || !['find', 'aggregate'].includes(parsedQuery.operation)) {
        throw new Error('MongoDB query must specify a valid operation (find or aggregate)');
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
      console.error('Error fetching MongoDB schema:', error);
      throw new Error((error as Error)?.message);
    }
  }

  async initialize(databaseUrl: string): Promise<void> {
    if (this._client) {
      await this.close();
    }

    console.log('MongoDB: Initializing connection with URL:', databaseUrl);

    this._client = new MongoClient(databaseUrl, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await this._client.connect();

    // Extract database name from URL
    const url = new URL(databaseUrl);
    const dbName = url.pathname.substring(1) || 'test';

    console.log('MongoDB: Using database name:', dbName);

    this._db = this._client.db(dbName);

    // Log available collections for debugging
    try {
      const collections = await this._db.listCollections().toArray();
      console.log(
        'MongoDB: Available collections:',
        collections.map((c: any) => c.name),
      );

      if (collections.length === 0) {
        console.log('⚠️  WARNING: No collections found in database "' + dbName + '"');
        console.log('⚠️  Check if your connection string points to the correct database');
        console.log('⚠️  Expected: mongodb://localhost:27017/local (for database "local")');
        console.log('⚠️  Current:  ' + databaseUrl);
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
   {
     "collection": "collection_name",
     "operation": "find" | "aggregate",
     "filter": {...}, // for find operations
     "options": {...}, // for find operations (limit, sort, etc.)
     "pipeline": [...] // for aggregate operations
   }
4. Use MongoDB query operators like $match, $group, $sort, $limit, $project, etc.
5. For array fields (like amenities), use appropriate operators:
   - Use exact string match: {"amenities": "Pets allowed"}
   - Use $in for multiple values: {"amenities": {"$in": ["Pets allowed", "WiFi"]}}
   - Use $regex for partial matches: {"amenities": {"$regex": "pets", "$options": "i"}}
6. Do not use any administrative operations like drop, createUser, or eval.
7. Use appropriate aggregation pipelines for complex queries.
8. Optimize the queries for performance.
9. Avoid using any collections or fields not present in the schema.
10. If needed, parametrize the query using positional placeholders like $1, $2, etc.
11. Use exact field names and values as shown in the schema.
12. For queries about "having" or "containing" specific values in arrays, use exact string matching.
13. Provide a brief explanation for each query.
14. Specify the response schema for each query, including selected field types.

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
    "query": "{\"collection\": \"airbnb\", \"operation\": \"find\", \"filter\": {\"room_type\": \"Entire home/apt\"}, \"options\": {}}",
    "explanation": "Retrieves all entire apartment listings",
    "responseSchema": "_id (string), name (string), room_type (string), price (object)"
  },
  {
    "query": "{\"collection\": \"airbnb\", \"operation\": \"aggregate\", \"pipeline\": [{\"$group\": {\"_id\": \"$room_type\", \"count\": {\"$sum\": 1}}}]}",
    "explanation": "Groups listings by room type and counts each type",
    "responseSchema": "_id (string), count (number)"
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
