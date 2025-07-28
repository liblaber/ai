export enum OutputAppEventType {
  EDIT_QUERY = 'edit_query',
}

export interface OutputAppEvent {
  eventType: OutputAppEventType;
  queryId: string | number;
}

export enum BuilderAppEventType {
  SQL_INSPECTOR_TOGGLE = 'sql_inspector_toggle',
}

export interface BuilderAppEvent {
  eventType: BuilderAppEventType;
  enabled: boolean;
}
