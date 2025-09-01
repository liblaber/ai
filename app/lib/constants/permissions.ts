import { PermissionAction, PermissionResource } from '@prisma/client';

/**
 * Centralized permission definitions for the system
 * This ensures consistency between permission creation and CASL ability building
 */

// Full system admin permissions - grants access to everything
export const SYSTEM_ADMIN_PERMISSIONS = [
  { action: PermissionAction.manage, resource: PermissionResource.all },
] as const;

// Builder role permissions - full access to app development resources
export const BUILDER_PERMISSIONS = [
  { action: PermissionAction.manage, resource: PermissionResource.Environment },
  { action: PermissionAction.manage, resource: PermissionResource.DataSource },
  { action: PermissionAction.manage, resource: PermissionResource.Website },
  { action: PermissionAction.manage, resource: PermissionResource.BuilderApp },
] as const;

// Operator role permissions - limited access for end users
export const OPERATOR_PERMISSIONS = [
  { action: PermissionAction.read, resource: PermissionResource.Website },
  { action: PermissionAction.update, resource: PermissionResource.Website },
] as const;

// Type for permission objects
export type PermissionDefinition = {
  action: PermissionAction;
  resource: PermissionResource;
};

// Helper function to get all permissions for a role type
export function getPermissionsForRole(roleType: 'system-admin' | 'builder' | 'operator'): PermissionDefinition[] {
  switch (roleType) {
    case 'system-admin':
      return [...SYSTEM_ADMIN_PERMISSIONS];
    case 'builder':
      return [...BUILDER_PERMISSIONS];
    case 'operator':
      return [...OPERATOR_PERMISSIONS];
    default:
      return [];
  }
}
