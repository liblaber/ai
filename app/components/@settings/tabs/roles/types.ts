export interface Role {
  id: string;
  name: string;
  description: string;

  permissions: Permission[];
  users: User[];
}

export interface Permission {
  id: string;
  roleId: string;
  action: string;
  resource: string;
  environmentId: string | null;
  dataSourceId: string | null;
  websiteId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
