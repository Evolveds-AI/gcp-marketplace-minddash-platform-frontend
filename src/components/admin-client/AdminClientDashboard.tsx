'use client';

import AdminLimitedPanel from '@/components/admin/AdminLimitedPanel';

/**
 * Componente wrapper para el dashboard de administración de clientes
 * Usa AdminLimitedPanel con funcionalidades restringidas para administradores
 * con rol 'admin' (no 'super_admin')
 */
export default function AdminClientDashboard() {
  return <AdminLimitedPanel />;
}