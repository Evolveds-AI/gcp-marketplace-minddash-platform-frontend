// Tipos específicos para componentes de UI del sistema de roles

import { ProductRole, RoleType, RoleSource } from './index';

/**
 * Props para el componente RoleTypeBadge
 */
export interface RoleTypeBadgeProps {
  type: RoleType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Props para el componente RolesList
 */
export interface RolesListProps {
  productId: string;
  onEdit?: (role: ProductRole) => void;
  onDelete?: (roleId: string) => void;
  className?: string;
}

/**
 * Props para el formulario de creación/edición de roles
 */
export interface RoleFormProps {
  productId: string;
  role?: ProductRole; // Si se pasa, es edición; si no, es creación
  onSubmit: (data: RoleFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Datos del formulario de roles
 */
export interface RoleFormData {
  name: string;
  type: RoleType;
  source?: RoleSource;
  table?: string;
  field?: string;
  uses_user_code: boolean;
  user_code_table?: string;
  user_code_key?: string;
  user_code_value_col?: string;
  static_value?: string;
  active: boolean;
}

/**
 * Props para el selector de usuarios
 */
export interface UserRoleSelectorProps {
  productId: string;
  userId: string;
  currentRoleId?: string;
  onRoleChange: (roleId: string | null) => void;
  disabled?: boolean;
}

/**
 * Props para el componente de exportación de datos
 */
export interface DataExportButtonsProps {
  productId: string;
  roleId?: string;
  className?: string;
}

/**
 * Props para el banner de sin acceso
 */
export interface NoAccessBannerProps {
  message?: string;
  className?: string;
}

/**
 * Estado del formulario de roles
 */
export interface RoleFormState {
  data: RoleFormData;
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Opciones para el selector de tipo de rol
 */
export interface RoleTypeOption {
  value: RoleType;
  label: string;
  description: string;
  disabled?: boolean;
}

/**
 * Opciones para el selector de fuente de rol
 */
export interface RoleSourceOption {
  value: RoleSource;
  label: string;
  description: string;
  requiresTable?: boolean;
}

/**
 * Props para el modal de confirmación
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

/**
 * Props para el componente de loading
 */
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Props para el componente de error
 */
export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Estado de la UI para la gestión de roles
 */
export interface RoleManagementUIState {
  selectedRole: ProductRole | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  filters: {
    search: string;
    type: RoleType | 'all';
    source: RoleSource | 'all';
    active: boolean | 'all';
  };
  sorting: {
    field: keyof ProductRole;
    direction: 'asc' | 'desc';
  };
}

/**
 * Props para el componente de filtros
 */
export interface RoleFiltersProps {
  filters: RoleManagementUIState['filters'];
  onFiltersChange: (filters: Partial<RoleManagementUIState['filters']>) => void;
  className?: string;
}

/**
 * Props para el componente de tabla de roles
 */
export interface RoleTableProps {
  roles: ProductRole[];
  sorting: RoleManagementUIState['sorting'];
  onSortChange: (field: keyof ProductRole) => void;
  onEdit: (role: ProductRole) => void;
  onDelete: (role: ProductRole) => void;
  isLoading?: boolean;
}

/**
 * Props para el breadcrumb de navegación
 */
export interface RoleBreadcrumbProps {
  productName: string;
  currentPage?: string;
  className?: string;
}

/**
 * Configuración de columnas para la tabla
 */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

/**
 * Props para el componente de paginación
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Toast notification types
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Props para el provider de notificaciones
 */
export interface NotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Context para las notificaciones
 */
export interface NotificationContextType {
  notifications: ToastNotification[];
  addNotification: (notification: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}