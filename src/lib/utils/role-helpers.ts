/**
 * Helpers para trabajar con el nuevo sistema de roles
 * BD: tabla roles con columna name ('SuperAdmin', 'Admin', 'User', etc.)
 * Código legacy: usaba iam_role con valores ('super_admin', 'admin', 'user', etc.)
 */

// Tipos de roles en la nueva BD
export type RoleName = 'SuperAdmin' | 'Admin' | 'User' | 'Viewer' | 'heredado';

// Tipos de roles en el código legacy
export type LegacyRole = 'super_admin' | 'admin' | 'user' | 'editor' | 'viewer';

/**
 * Convierte el nombre del rol de la BD al formato legacy del código
 */
export function roleToLegacy(roleName: RoleName | string | null | undefined): LegacyRole {
  if (!roleName) return 'user';
  
  const mapping: Record<string, LegacyRole> = {
    'SuperAdmin': 'super_admin',
    'Admin': 'admin',
    'User': 'user',
    'Viewer': 'viewer',
    'heredado': 'user'
  };
  
  return mapping[roleName] || 'user';
}

/**
 * Convierte el formato legacy al nombre del rol en la BD
 */
export function legacyToRole(legacyRole: LegacyRole | string): RoleName {
  const mapping: Record<string, RoleName> = {
    'super_admin': 'SuperAdmin',
    'admin': 'Admin',
    'user': 'User',
    'editor': 'User',
    'viewer': 'Viewer'
  };
  
  return mapping[legacyRole] || 'User';
}

/**
 * Verifica si el rol es admin (SuperAdmin o Admin)
 */
export function isAdminRole(roleName: RoleName | string | null | undefined): boolean {
  if (!roleName) return false;
  return roleName === 'SuperAdmin' || roleName === 'Admin';
}

/**
 * Verifica si el rol es super admin
 */
export function isSuperAdminRole(roleName: RoleName | string | null | undefined): boolean {
  if (!roleName) return false;
  return roleName === 'SuperAdmin';
}

/**
 * Obtiene el rol desde un objeto user que puede tener role.name o iam_role
 */
export function getUserRole(user: any): LegacyRole {
  // Nuevo sistema: user.role.name
  if (user?.role?.name) {
    return roleToLegacy(user.role.name);
  }
  
  // Sistema legacy: user.iam_role
  if (user?.iam_role) {
    return user.iam_role as LegacyRole;
  }
  
  return 'user';
}
