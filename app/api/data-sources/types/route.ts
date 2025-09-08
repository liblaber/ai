import { NextResponse } from 'next/server';
import { DataSourcePluginManager } from '~/lib/plugins/data-source/data-access-plugin-manager';

export async function GET() {
  return NextResponse.json(DataSourcePluginManager.getAvailableDataSourceTypes());
}
