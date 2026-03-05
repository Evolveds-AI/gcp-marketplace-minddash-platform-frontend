import React from 'react';
import { RoleType, ProductRole } from '@/types/roles/index';
import { RolesListProps } from '@/types/roles/ui';
import { RoleTypeBadge } from './RoleTypeBadge';
import { useProductRoles } from '@/hooks/roles/useProductRoles';
import { cn } from '@/lib/utils';
import { Edit, Trash2, Eye, EyeOff, MoreHorizontal } from 'lucide-react';

/**
 * Componente para mostrar un rol individual en la lista
 */
const RoleItem: React.FC<{
  role: ProductRole;
  onEdit?: (role: ProductRole) => void;
  onDelete?: (roleId: string) => void;
  onToggleActive?: (roleId: string, active: boolean) => void;
}> = ({ role, onEdit, onDelete, onToggleActive }) => {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {role.name}
          </h3>
          <RoleTypeBadge type={role.type} size="sm" />
          <div className={cn(
            "px-3 py-2 rounded-full text-xs font-medium",
            !role.active ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          )}>
            {!role.active ? 'Inactivo' : 'Activo'}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {role.table ? `Tabla: ${role.table}` : 'Sin tabla definida'}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Fuente: {role.source || 'N/A'}</span>
          <span>Campo: {role.field || 'N/A'}</span>
          <span>Creado: {new Date(role.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={() => onToggleActive?.(role.id, !role.active)}
          className={cn(
            'p-2 rounded-md transition-colors',
            role.active
              ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
              : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          title={role.active ? 'Desactivar rol' : 'Activar rol'}
        >
          {role.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        
        <button
          onClick={() => onEdit?.(role)}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          title="Editar rol"
        >
          <Edit className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => onDelete?.(role.id)}
          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title="Eliminar rol"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Componente de loading para la lista
 */
const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-36"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Componente principal para listar roles con acciones
 */
export const RolesList: React.FC<RolesListProps> = ({
  productId,
  onEdit,
  onDelete,
  className
}) => {
  const { data, isLoading, error, refetch } = useProductRoles(productId);

  const handleToggleActive = async (roleId: string, active: boolean) => {
    try {
      // TODO: Implementar la actualización del estado activo
      console.log('Toggle active:', roleId, active);
      // Refrescar la lista después de la actualización
      refetch();
    } catch (error) {
      console.error('Error al cambiar estado del rol:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-red-600 dark:text-red-400 mb-4">
          Error al cargar los roles: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data || !data.roles || data.roles.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          No hay roles configurados para este producto.
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Crea tu primer rol para comenzar a gestionar el acceso a los datos.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {data.roles.map((role: ProductRole) => (
        <RoleItem
          key={role.id}
          role={role}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={handleToggleActive}
        />
      ))}
    </div>
  );
};

export default RolesList;