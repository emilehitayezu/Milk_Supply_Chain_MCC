import { ROLE_PERMISSIONS, type UserRole } from "@/lib/app-data";

export function hasRole(role: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  return Boolean(role) && allowedRoles.includes(role as UserRole);
}

export function hasPermission(role: UserRole | undefined, permission: string): boolean {
  if (!role) {
    return false;
  }

  return Boolean(ROLE_PERMISSIONS[role]?.includes(permission));
}

export function requirePermission(role: UserRole | undefined, permission: string): boolean {
  return hasPermission(role, permission);
}
