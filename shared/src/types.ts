export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface MySqlColumn extends Column {
  fullType?: string;
  nullable?: string;
  defaultValue?: string | null;
  comment?: string;
  extra?: string;
}

export interface Table {
  tableName: string;
  columns: Column[];
}

export interface MySqlTable extends Table {
  tableComment: string;
}
