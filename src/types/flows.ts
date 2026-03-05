// Tipos para el Editor Visual de Flujos
import { Node, Edge, Connection } from 'reactflow';

// Enums que coinciden con Prisma
export enum FlowCategory {
  AUTOMATION = 'AUTOMATION',
  DATA_PROCESSING = 'DATA_PROCESSING',
  NOTIFICATION = 'NOTIFICATION',
  INTEGRATION = 'INTEGRATION',
  CUSTOM = 'CUSTOM'
}

export enum FlowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  EVENT = 'EVENT',
  WEBHOOK = 'WEBHOOK',
  DATA_CHANGE = 'DATA_CHANGE'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum NodeExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum NodeCategory {
  TRIGGER = 'TRIGGER',
  ACTION = 'ACTION',
  CONDITION = 'CONDITION',
  TRANSFORM = 'TRANSFORM',
  INTEGRATION = 'INTEGRATION'
}

// Interfaces para configuraciones de nodos
export interface TriggerConfig {
  type: TriggerType;
  schedule?: {
    cronExpression: string;
    timezone: string;
  };
  event?: {
    source: string;
    eventType: string;
    filters?: Record<string, any>;
  };
  webhook?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  dataChange?: {
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    conditions?: Record<string, any>;
  };
}

export interface ActionConfig {
  type: string;
  parameters: Record<string, any>;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    retryDelay: number;
  };
  timeout?: number;
}

export interface ConditionConfig {
  expression: string;
  variables: Record<string, any>;
  operator: 'AND' | 'OR';
  conditions: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
  }>;
}

export interface TransformConfig {
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  transformations: Array<{
    sourceField: string;
    targetField: string;
    transformation?: string;
    defaultValue?: any;
  }>;
}

export interface IntegrationConfig {
  connectorId: string;
  operation: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE';
  parameters: Record<string, any>;
  mapping?: Record<string, string>;
}

// Configuración unificada del nodo
export type NodeConfig = TriggerConfig | ActionConfig | ConditionConfig | TransformConfig | IntegrationConfig;

// Extensión de Node de React Flow para nuestros nodos personalizados
export interface FlowNode extends Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    category: NodeCategory;
    config: NodeConfig;
    inputs?: Array<{
      id: string;
      name: string;
      type: string;
      required: boolean;
    }>;
    outputs?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    validation?: {
      isValid: boolean;
      errors: string[];
    };
  };
}

// Extensión de Edge de React Flow
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  className?: string;
  data?: {
    condition?: string;
    label?: string;
  };
}

// Interface principal de definición de flujo
export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  category: FlowCategory;
  status: FlowStatus;
  clientId?: string;
  productId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  versions?: FlowVersion[];
  executions?: FlowExecution[];
}

// Interface para versiones de flujo
export interface FlowVersion {
  id: string;
  flowId: string;
  version: number;
  name?: string;
  description?: string;
  definition: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  flow?: FlowDefinition;
  executions?: FlowExecution[];
}

// Interface para ejecuciones de flujo
export interface FlowExecution {
  id: string;
  flowId: string;
  versionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  triggeredBy?: string;
  context: Record<string, any>;
  result?: Record<string, any>;
  errorMessage?: string;
  flow?: FlowDefinition;
  version?: FlowVersion;
  nodeLogs?: NodeExecutionLog[];
}

// Interface para logs de ejecución de nodos
export interface NodeExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  status: NodeExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  input?: Record<string, any>;
  output?: Record<string, any>;
  errorMessage?: string;
  duration?: number;
  execution?: FlowExecution;
}

// Interface para plantillas de nodos
export interface NodeTemplate {
  id: string;
  name: string;
  description?: string;
  category: NodeCategory;
  icon?: string;
  color?: string;
  defaultConfig: NodeConfig;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  documentation?: string;
  examples?: Array<{
    name: string;
    description: string;
    config: NodeConfig;
  }>;
}

// DTOs para APIs
export interface CreateFlowDTO {
  name: string;
  description?: string;
  category: FlowCategory;
  clientId?: string;
  productId?: string;
}

export interface CreateFlowWithDefinitionDTO {
  name: string;
  description?: string;
  category: FlowCategory;
  clientId?: string;
  productId?: string;
  userId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UpdateFlowDTO {
  name?: string;
  description?: string;
  category?: FlowCategory;
  status?: FlowStatus;
}

export interface CreateVersionDTO {
  flowId: string;
  name?: string;
  description?: string;
  definition: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
}

export interface ExecuteFlowDTO {
  flowId: string;
  versionId?: string;
  context?: Record<string, any>;
  triggeredBy?: string;
}

// Respuestas de API
export interface FlowResponse {
  success: boolean;
  data?: FlowDefinition;
  error?: string;
  message?: string;
}

export interface FlowListResponse {
  success: boolean;
  data?: FlowDefinition[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface FlowVersionResponse {
  success: boolean;
  data?: FlowVersion;
  error?: string;
  message?: string;
}

export interface FlowExecutionResponse {
  success: boolean;
  data?: FlowExecution;
  executionId?: string;
  error?: string;
  message?: string;
}

export interface NodeTemplateResponse {
  success: boolean;
  data?: NodeTemplate[];
  error?: string;
}

// Tipos para validación de flujos
export interface FlowValidationResult {
  isValid: boolean;
  errors: FlowValidationError[];
  warnings: FlowValidationWarning[];
}

export interface FlowValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'MISSING_CONNECTION' | 'INVALID_CONFIG' | 'CIRCULAR_DEPENDENCY' | 'INVALID_NODE_TYPE';
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface FlowValidationWarning {
  nodeId?: string;
  type: 'PERFORMANCE' | 'BEST_PRACTICE' | 'DEPRECATED';
  message: string;
}

// Tipos para métricas y monitoreo
export interface FlowMetrics {
  flowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionStatus: ExecutionStatus;
  executionTrends: {
    daily: Array<{ date: string; count: number; avgDuration: number }>;
    weekly: Array<{ week: string; count: number; avgDuration: number }>;
    monthly: Array<{ month: string; count: number; avgDuration: number }>;
  };
}

// Tipos para filtros y búsqueda
export interface FlowFilters {
  category?: FlowCategory;
  status?: FlowStatus;
  clientId?: string;
  productId?: string;
  createdBy?: string;
  search?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Interfaz para filtros con paginación (usada en FlowEngine)
export interface FlowFilter {
  userId?: string;
  clientId?: string;
  productId?: string;
  category?: FlowCategory;
  status?: FlowStatus;
  limit?: number;
  offset?: number;
}

// Tipos para el editor visual
export interface EditorState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodes: string[];
  selectedEdges: string[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  isDirty: boolean;
  isValidating: boolean;
  validationResult?: FlowValidationResult;
}

export interface EditorActions {
  addNode: (node: Omit<FlowNode, 'id'>) => void;
  updateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (connection: Connection) => void;
  updateEdge: (edgeId: string, updates: Partial<FlowEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  validateFlow: () => Promise<FlowValidationResult>;
  saveFlow: () => Promise<void>;
  executeFlow: (context?: Record<string, any>) => Promise<FlowExecution>;
}

// Tipos para configuración del editor
export interface EditorConfig {
  readOnly: boolean;
  showMinimap: boolean;
  showControls: boolean;
  showBackground: boolean;
  snapToGrid: boolean;
  gridSize: number;
  nodeTypes: Record<string, any>;
  edgeTypes: Record<string, any>;
}

// Tipos para exportación e importación
export interface ExportFlowOptions {
  includeVersions: boolean;
  includeExecutions: boolean;
  format: 'json' | 'yaml';
}

export interface ImportFlowOptions {
  overwriteExisting: boolean;
  validateBeforeImport: boolean;
  createNewVersion: boolean;
}

export interface FlowExportResult {
  success: boolean;
  data?: string;
  fileName?: string;
  error?: string;
}

export interface FlowImportResult {
  success: boolean;
  flowId?: string;
  versionId?: string;
  warnings?: string[];
  error?: string;
}