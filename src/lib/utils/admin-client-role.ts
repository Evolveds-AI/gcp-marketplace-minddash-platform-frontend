export function normalizeRole(role: unknown): string {
  return typeof role === 'string' ? role.toLowerCase() : '';
}

export function isAdminClientReadRole(role: unknown): boolean {
  const r = normalizeRole(role);
  return (
    r === 'admin' ||
    r === 'admin-client' ||
    r === 'admin_client' ||
    r === 'super_admin' ||
    r === 'superadmin' ||
    r === 'editor'
  );
}

export function isAdminClientWriteRole(role: unknown): boolean {
  const r = normalizeRole(role);
  return (
    r === 'admin' ||
    r === 'admin-client' ||
    r === 'admin_client' ||
    r === 'super_admin' ||
    r === 'superadmin'
  );
}
