import { SSL_MODE, type SSLMode } from '~/types/database';

export const parseDatabaseConnectionUrl = (connStr: string) => {
  try {
    const url = new URL(connStr);

    if (!url.protocol.startsWith('postgresql:')) {
      throw new Error('Connection string must start with postgresql://');
    }

    if (!url.hostname) {
      throw new Error('Host is required');
    }

    if (!url.pathname.slice(1)) {
      throw new Error('Database name is required');
    }

    if (!url.username || !url.password) {
      throw new Error('Username and password are required');
    }

    const sslMode = url.searchParams.get('sslmode')?.toUpperCase() || 'DISABLE';

    if (!Object.values(SSL_MODE).includes(sslMode as SSLMode)) {
      throw new Error(`Invalid SSL mode: ${sslMode}. Valid modes are: ${Object.values(SSL_MODE).join(', ')}`);
    }

    return {
      host: url.hostname,
      port: url.port || '5432',
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      type: 'postgres',
      sslMode: sslMode as SSLMode,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid connection string: ${error.message}`);
    }

    throw new Error('Invalid connection string format');
  }
};
