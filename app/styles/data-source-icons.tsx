import SQLiteIc from '~/icons/sqlite.svg';
import PostgresIc from '~/icons/postgres.svg';
import MysqlIc from '~/icons/mysql.svg';
import MongoIc from '~/icons/mongodb.svg';
import HubspotIc from '~/icons/hubspot.svg';
import GoogleSheetsIc from '~/icons/google_sheets.svg';
import GoogleDocsIc from '~/icons/google_docs.svg';
import SalesforceIc from '~/icons/salesforce.svg';
import JiraIc from '~/icons/jira.svg';
import { DataSourceType } from '@liblab/data-access/utils/types';
import type { ReactElement } from 'react';
import { ComingSoonDataSource } from '~/lib/hooks/plugins/useDataSourceTypesPlugin';

export const DATA_SOURCE_ICON_MAP: Record<DataSourceType | ComingSoonDataSource, ReactElement> = {
  [DataSourceType.SQLITE]: <SQLiteIc />,
  [DataSourceType.POSTGRES]: <PostgresIc className="w-4 h-4" />,
  [DataSourceType.MYSQL]: <MysqlIc className="w-4 h-4" />,
  [DataSourceType.MONGODB]: <MongoIc className="w-4 h-4" />,
  [DataSourceType.HUBSPOT]: <HubspotIc className="w-4 h-4" />,
  [DataSourceType.GOOGLE_SHEETS]: <GoogleSheetsIc className="w-4 h-4" />,
  [DataSourceType.GOOGLE_DOCS]: <GoogleDocsIc className="w-4 h-4" />,
  [ComingSoonDataSource.SALESFORCE]: <SalesforceIc className="w-4 h-4" />,
  [ComingSoonDataSource.JIRA]: <JiraIc className="w-4 h-4" />,
};
