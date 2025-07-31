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

    try {
      // Parse the query which should be a MongoDB aggregation pipeline or find query
      // Handle both regular JSON and escaped JSON strings from LLM
      let parsedQuery: any;

      try {
        parsedQuery = JSON.parse(query);
      } catch (parseError) {
        // Try to handle escaped JSON strings from LLM generation
        try {
          const cleanedQuery = query.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          parsedQuery = JSON.parse(cleanedQuery);
        } catch (secondParseError) {
          console.error('Failed to parse MongoDB query:', {
            original: query,
            firstError: parseError,
            secondError: secondParseError,
          });
          throw new Error(
            `Invalid JSON format for MongoDB query: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
          );
        }
      }

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
    // Safely parse parameter values
    if (param === 'null') {
      return null;
    }

    if (param === 'undefined') {
      return undefined;
    }

    if (param === 'true') {
      return true;
    }

    if (param === 'false') {
      return false;
    }

    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(param)) {
      const num = Number(param);

      if (!isNaN(num)) {
        return num;
      }
    }

    // Try to parse as JSON for objects/arrays
    if ((param.startsWith('{') && param.endsWith('}')) || (param.startsWith('[') && param.endsWith(']'))) {
      try {
        return JSON.parse(param);
      } catch {
        // If JSON parsing fails, treat as string
      }
    }

    // Return as string (default)
    return param;
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

    try {
      // Try to parse the query, handling both regular JSON and escaped JSON strings
      let parsedQuery: any;

      try {
        parsedQuery = JSON.parse(query);
      } catch (firstParseError) {
        // If first parse fails, it might be an escaped JSON string
        // Try to parse it as a string first, then parse the result
        try {
          const unescapedQuery = JSON.parse(`"${query.replace(/"/g, '\\"')}"`).replace(/\\"/g, '"');
          parsedQuery = JSON.parse(unescapedQuery);
        } catch (secondParseError) {
          // If both attempts fail, try treating it as an already-unescaped string
          try {
            const cleanedQuery = query.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            parsedQuery = JSON.parse(cleanedQuery);
          } catch (thirdParseError) {
            console.error('MongoDB query parsing attempts:', {
              original: query,
              firstError: firstParseError instanceof Error ? firstParseError.message : String(firstParseError),
              secondError: secondParseError instanceof Error ? secondParseError.message : String(secondParseError),
              thirdError: thirdParseError instanceof Error ? thirdParseError.message : String(thirdParseError),
            });
            throw new Error(
              `Invalid JSON format for MongoDB query: ${firstParseError instanceof Error ? firstParseError.message : String(firstParseError)}`,
            );
          }
        }
      }

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
