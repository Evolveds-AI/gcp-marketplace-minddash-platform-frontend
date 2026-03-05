// Tipos para el sistema de roles generalizados de MindDash

/**
 * Tipos de roles disponibles en el sistema
 */
export enum RoleType {
  DYNAMIC = 'DYNAMIC',
  STATIC = 'STATIC', 
  ALL = 'ALL',
  NONE = 'NONE'
}

/**
 * Fuentes de datos para roles dinámicos
 */
export enum RoleSource {
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  BU = 'BU',
  REGION = 'REGION',
  CUSTOM = 'CUSTOM'
}

/**
 * Interfaz principal para un rol de producto
 */
export interface ProductRole {
  id: string;
  product_id: string;
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
  created_at: Date;
  updated_at: Date;
}

/**
 * Interfaz para la relación usuario-rol de producto
 */
export interface UserProductRole {
  id: string;
  user_id: string;
  product_role_id: string;
  assigned_at: Date;
  assigned_by: string;
  // Relaciones
  user?: any; // Tipo de usuario del sistema
  product_role?: ProductRole;
}

/**
 * Interfaz para crear un nuevo rol
 */
export interface CreateRoleRequest {
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
  active?: boolean;
}

/**
 * Interfaz para actualizar un rol existente
 */
export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: string;
}

/**
 * Interfaz para asignar rol a usuario
 */
export interface AssignRoleRequest {
  user_id: string;
  product_role_id: string;
}

/**
 * Interfaz para respuesta de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Interfaz para listado paginado
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interfaz para filtros de roles
 */
export interface RoleFilters {
  type?: RoleType;
  source?: RoleSource;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interfaz para opciones de paginación
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'type' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interfaz para el contexto de producto
 */
export interface ProductContext {
  id: string;
  name: string;
  roles: ProductRole[];
}

/**
 * Interfaz para validación de roles
 */
export interface RoleValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Interfaz para estadísticas de roles
 */
export interface RoleStats {
  total: number;
  byType: Record<RoleType, number>;
  bySource: Record<RoleSource, number>;
  active: number;
  inactive: number;
}

/**
 * Interfaz para configuración de exportación
 */
export interface ExportConfig {
  format: 'csv' | 'excel';
  includeInactive?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * Tipos de eventos de auditoría
 */
export enum AuditEventType {
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_UNASSIGNED = 'ROLE_UNASSIGNED'
}

/**
 * Interfaz para eventos de auditoría
 */
export interface AuditEvent {
  id: string;
  event_type: AuditEventType;
  user_id: string;
  product_id: string;
  role_id?: string;
  details: Record<string, any>;
  timestamp: Date;
}