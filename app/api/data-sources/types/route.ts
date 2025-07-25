import { NextResponse } from 'next/server';

export async function GET() {
  /**
   * Placeholder for DataSourcePluginManager - you'll need to implement this
   * const databaseTypes = DataSourcePluginManager.getAvailableDatabaseTypes();
   *
   * For now, return a basic list of common database types
   */
  const databaseTypes = [
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'Advanced open source database',
      connectionStringFormat: 'postgresql://username:password@host:port/database',
    },
    {
      id: 'mysql',
      name: 'MySQL',
      description: 'Popular open source database',
      connectionStringFormat: 'mysql://username:password@host:port/database',
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      description: 'Lightweight file-based database',
      connectionStringFormat: 'sqlite://path/to/database.db',
    },
    {
      id: 'sqlserver',
      name: 'SQL Server',
      description: 'Microsoft SQL Server database',
      connectionStringFormat: 'sqlserver://username:password@host:port/database',
    },
  ];

  return NextResponse.json(databaseTypes);
}
