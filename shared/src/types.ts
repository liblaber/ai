export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface Table {
  tableName: string;
  columns: Column[];
}
