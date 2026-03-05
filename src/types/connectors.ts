// Tipos para el Sistema de Conectores de Datos

// Enums que coinciden con Prisma
export enum ConnectorType {
  DATABASE = 'DATABASE',
  API = 'API',
  FILE = 'FILE',
  WEBHOOK = 'WEBHOOK'
}

export enum ConnectorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  TESTING = 'TESTING',
  SYNCING = 'SYNCING'
}

export enum SyncType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  REAL_TIME = 'REAL_TIME'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export enum WebhookAuthType {
  NONE = 'none',
  BEARER = 'bearer',
  BASIC = 'basic',
  API_KEY = 'apikey',
  SIGNATURE = 'signature'
}

export enum AuthType {
  NONE = 'none',
  BEARER = 'bearer',
  BASIC = 'basic',
  API_KEY = 'apikey',
  OAUTH2 = 'oauth2'
}

export enum WebhookMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// Interfaces para configuraciones específicas de conectores
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  queryTimeout?: number;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
    credentials: Record<string, string>;
  };
  rateLimit?: {
    requests: number;
    window: number; // en segundos
  };
  timeout?: number; // en milisegundos
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    retryDelay: number; // en milisegundos
  };
  dataTransformation?: {
    requestTransform?: string; // JSONPath expression
    responseTransform?: string; // JSONPath expression
  };
  methods?: {
    get?: boolean;
    post?: boolean;
    put?: boolean;
    delete?: boolean;
    patch?: boolean;
  };
}

export interface FileConfig {
  path: string;
  format: 'csv' | 'json' | 'xml' | 'excel';
  encoding?: string;
  delimiter?: string; // para CSV
  hasHeader?: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'apikey' | 'signature';
    credentials: Record<string, string>;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    retryDelay: number; // en milisegundos
  };
  signatureValidation?: {
    enabled: boolean;
    algorithm: 'sha1' | 'sha256' | 'md5';
    secretKey: string;
    headerName: string; // ej: 'X-Hub-Signature-256'
  };
  timeout?: number; // en milisegundos
  async?: boolean; // procesamiento asíncrono
  queueConfig?: {
    priority: 'low' | 'normal' | 'high';
    delay?: number; // en milisegundos
    attempts?: number;
  };
}

// Configuración unificada del conector
export type ConnectorConfig = DatabaseConfig | ApiConfig | FileConfig | WebhookConfig;

// Interface principal del conector
export interface DataConnector {
  id: string;
  name: string;
  description?: string;
  type: ConnectorType;
  status: ConnectorStatus;
  config: ConnectorConfig;
  clientId?: string;
  productId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  syncLogs?: SyncLog[];
  fieldMappings?: FieldMapping[];
  syncedData?: SyncedData[];
}

// Interface para logs de sincronización
export interface SyncLog {
  id: string;
  connectorId: string;
  syncType: SyncType;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  recordsSuccess?: number;
  recordsError?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Interface para mapeo de campos
export interface FieldMapping {
  id: string;
  connectorId: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  isRequired: boolean;
  defaultValue?: string;
  validationRules?: Record<string, any>;
}

// Interface para datos sincronizados
export interface SyncedData {
  id: string;
  connectorId: string;
  sourceId: string;
  data: Record<string, any>;
  syncedAt: Date;
  version: number;
  checksum?: string;
}

// DTOs para APIs
export interface CreateConnectorDTO {
  name: string;
  description?: string;
  type: ConnectorType;
  config: ConnectorConfig;
  clientId?: string;
  productId?: string;
}

export interface UpdateConnectorDTO {
  name?: string;
  description?: string;
  status?: ConnectorStatus;
  config?: Partial<ConnectorConfig>;
}

export interface TestConnectionDTO {
  type: ConnectorType;
  config: ConnectorConfig;
}

export interface SyncConnectorDTO {
  connectorId: string;
  syncType: SyncType;
  options?: {
    fullSync?: boolean;
    batchSize?: number;
    filters?: Record<string, any>;
  };
}

// Respuestas de API
export interface ConnectorResponse {
  success: boolean;
  data?: DataConnector;
  error?: string;
  message?: string;
}

export interface ConnectorListResponse {
  success: boolean;
  data?: DataConnector[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    latency?: number;
    version?: string;
    capabilities?: string[];
  };
  error?: string;
}

export interface SyncResponse {
  success: boolean;
  syncLogId?: string;
  message?: string;
  error?: string;
}

// Tipos para validación
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Tipos para métricas y monitoreo
export interface ConnectorMetrics {
  connectorId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  lastSyncStatus: SyncStatus;
  dataVolume: {
    totalRecords: number;
    recordsToday: number;
    recordsThisWeek: number;
    recordsThisMonth: number;
  };
}

// Tipos para configuración de sincronización
export interface SyncSchedule {
  connectorId: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  nextRun?: Date;
  lastRun?: Date;
}

// Tipos para filtros y búsqueda
export interface ConnectorFilters {
  type?: ConnectorType;
  status?: ConnectorStatus;
  clientId?: string;
  productId?: string;
  createdBy?: string;
  search?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  offset?: number;
}

// Tipos para exportación de datos
export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  fields?: string[];
  filters?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  recordCount?: number;
  error?: string;
}