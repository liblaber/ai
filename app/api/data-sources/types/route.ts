import { NextResponse } from 'next/server';
import { DataAccessPluginManager } from '~/lib/plugins/data-access/data-access-plugin-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('data-sources-types');

export async function GET() {
  try {
    // Get available data source types from the plugin manager
    const dataSourceTypes = DataAccessPluginManager.getAvailableDataSourceTypes();

    return NextResponse.json({ success: true, dataSourceTypes });
  } catch (error) {
    logger.error('Failed to get data source types:', error);

    // Fallback to basic database types
    const fallbackTypes = [
      {
        pluginId: 'postgres',
        value: 'postgres',
        label: 'PostgreSQL',
        connectionStringFormat: 'postgresql://username:password@host:port/database',
        available: true,
      },
      {
        pluginId: 'mysql',
        value: 'mysql',
        label: 'MySQL',
        connectionStringFormat: 'mysql://username:password@host:port/database',
        available: true,
      },
      {
        pluginId: 'sqlite',
        value: 'sqlite',
        label: 'SQLite',
        connectionStringFormat: 'sqlite://path/to/database.db',
        available: true,
      },
      {
        pluginId: 'sqlserver',
        value: 'sqlserver',
        label: 'SQL Server',
        connectionStringFormat: 'sqlserver://username:password@host:port/database',
        available: true,
      },
    ];

    return NextResponse.json({ success: true, dataSourceTypes: fallbackTypes });
  }
}
