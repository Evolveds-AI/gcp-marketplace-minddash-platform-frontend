import { ConnectorType } from '@/types/connectors';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogCategory {
  CONNECTION = 'connection',
  AUTHENTICATION = 'authentication',
  REQUEST = 'request',
  RESPONSE = 'response',
  WEBHOOK = 'webhook',
  SYNC = 'sync',
  ERROR = 'error',
  PERFORMANCE = 'performance'
}

export interface LogEntry {
  id: string;
  connectorId: string;
  connectorType: ConnectorType;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  duration?: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
    size?: number;
  };
}

export interface LogFilter {
  connectorId?: string;
  level?: LogLevel;
  category?: LogCategory;
  startDate?: string;
  endDate?: string;
  search?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface LogMetrics {
  totalLogs: number;
  errorRate: number;
  averageResponseTime: number;
  requestsPerHour: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  performanceStats: {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
}

export class ConnectorLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private retentionDays: number = 30;

  constructor(maxLogs?: number, retentionDays?: number) {
    this.maxLogs = maxLogs || 10000;
    this.retentionDays = retentionDays || 30;
    
    // Limpiar logs antiguos periódicamente
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // Cada 24 horas
  }

  /**
   * Registra una entrada de log
   */
  log(
    connectorId: string,
    connectorType: ConnectorType,
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    metadata?: LogEntry['metadata']
  ): string {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      connectorId,
      connectorType,
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.logs.push(logEntry);

    // Mantener límite de logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log a consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(logEntry);
    }

    return logEntry.id;
  }

  /**
   * Logs específicos por categoría
   */
  logConnection(
    connectorId: string,
    connectorType: ConnectorType,
    success: boolean,
    details?: Record<string, any>
  ): string {
    return this.log(
      connectorId,
      connectorType,
      success ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.CONNECTION,
      success ? 'Conexión establecida exitosamente' : 'Error al establecer conexión',
      details
    );
  }

  logAuthentication(
    connectorId: string,
    connectorType: ConnectorType,
    success: boolean,
    authType: string,
    details?: Record<string, any>
  ): string {
    return this.log(
      connectorId,
      connectorType,
      success ? LogLevel.INFO : LogLevel.WARN,
      LogCategory.AUTHENTICATION,
      `Autenticación ${authType} ${success ? 'exitosa' : 'fallida'}`,
      details
    );
  }

  logRequest(
    connectorId: string,
    connectorType: ConnectorType,
    method: string,
    endpoint: string,
    duration: number,
    statusCode?: number,
    details?: Record<string, any>
  ): string {
    const level = statusCode && statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    return this.log(
      connectorId,
      connectorType,
      level,
      LogCategory.REQUEST,
      `${method} ${endpoint} - ${statusCode || 'N/A'} (${duration}ms)`,
      details,
      {
        endpoint,
        method,
        statusCode
      }
    );
  }

  logWebhook(
    connectorId: string,
    payload: any,
    success: boolean,
    processingTime: number,
    details?: Record<string, any>
  ): string {
    return this.log(
      connectorId,
      ConnectorType.WEBHOOK,
      success ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.WEBHOOK,
      `Webhook ${success ? 'procesado' : 'falló'} en ${processingTime}ms`,
      {
        ...details,
        payloadSize: JSON.stringify(payload).length
      },
      {
        size: JSON.stringify(payload).length
      }
    );
  }

  logSync(
    connectorId: string,
    connectorType: ConnectorType,
    syncType: 'manual' | 'automatic',
    status: 'started' | 'completed' | 'failed',
    details?: Record<string, any>
  ): string {
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    
    return this.log(
      connectorId,
      connectorType,
      level,
      LogCategory.SYNC,
      `Sincronización ${syncType} ${status}`,
      details
    );
  }

  logError(
    connectorId: string,
    connectorType: ConnectorType,
    error: Error | string,
    context?: Record<string, any>
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return this.log(
      connectorId,
      connectorType,
      LogLevel.ERROR,
      LogCategory.ERROR,
      errorMessage,
      {
        ...context,
        stack: errorStack
      }
    );
  }

  logPerformance(
    connectorId: string,
    connectorType: ConnectorType,
    operation: string,
    duration: number,
    details?: Record<string, any>
  ): string {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    
    return this.log(
      connectorId,
      connectorType,
      level,
      LogCategory.PERFORMANCE,
      `${operation} completado en ${duration}ms`,
      details
    );
  }

  /**
   * Obtiene logs con filtros
   */
  getLogs(filter: LogFilter = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Filtrar por conector
    if (filter.connectorId) {
      filteredLogs = filteredLogs.filter(log => log.connectorId === filter.connectorId);
    }

    // Filtrar por nivel
    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    // Filtrar por categoría
    if (filter.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }

    // Filtrar por usuario
    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    // Filtrar por rango de fechas
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Filtrar por búsqueda de texto
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por timestamp (más reciente primero)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar paginación
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Obtiene métricas de logs
   */
  getMetrics(connectorId?: string, timeRange?: { start: string; end: string }): LogMetrics {
    let logs = this.logs;

    // Filtrar por conector si se especifica
    if (connectorId) {
      logs = logs.filter(log => log.connectorId === connectorId);
    }

    // Filtrar por rango de tiempo
    if (timeRange) {
      const start = new Date(timeRange.start);
      const end = new Date(timeRange.end);
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= start && logTime <= end;
      });
    }

    const totalLogs = logs.length;
    const errorLogs = logs.filter(log => log.level === LogLevel.ERROR).length;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    // Calcular tiempo promedio de respuesta
    const requestLogs = logs.filter(log => log.category === LogCategory.REQUEST && log.duration);
    const averageResponseTime = requestLogs.length > 0 
      ? requestLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / requestLogs.length
      : 0;

    // Calcular requests por hora
    const timeRangeHours = timeRange 
      ? (new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()) / (1000 * 60 * 60)
      : 24; // Por defecto últimas 24 horas
    const requestsPerHour = requestLogs.length / timeRangeHours;

    // Top errores
    const errorMessages = logs
      .filter(log => log.level === LogLevel.ERROR)
      .reduce((acc, log) => {
        const message = log.message;
        if (!acc[message]) {
          acc[message] = { count: 0, lastOccurrence: log.timestamp };
        }
        acc[message].count++;
        if (new Date(log.timestamp) > new Date(acc[message].lastOccurrence)) {
          acc[message].lastOccurrence = log.timestamp;
        }
        return acc;
      }, {} as Record<string, { count: number; lastOccurrence: string }>);

    const topErrors = Object.entries(errorMessages)
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Estadísticas de rendimiento
    const durations = requestLogs
      .map(log => log.duration || 0)
      .sort((a, b) => a - b);

    const performanceStats = {
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      min: durations.length > 0 ? durations[0] : 0,
      max: durations.length > 0 ? durations[durations.length - 1] : 0
    };

    return {
      totalLogs,
      errorRate,
      averageResponseTime,
      requestsPerHour,
      topErrors,
      performanceStats
    };
  }

  /**
   * Limpia logs antiguos
   */
  cleanupOldLogs(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    
    const removedCount = initialCount - this.logs.length;
    
    if (removedCount > 0) {
      console.log(`Limpiados ${removedCount} logs antiguos`);
    }
    
    return removedCount;
  }

  /**
   * Limpia logs por filtro
   */
  clearLogs(filter: LogFilter = {}): number {
    const initialCount = this.logs.length;
    
    if (Object.keys(filter).length === 0) {
      // Limpiar todos los logs
      this.logs = [];
    } else {
      // Limpiar logs que coincidan con el filtro
      const logsToKeep = this.logs.filter(log => !this.matchesFilter(log, filter));
      this.logs = logsToKeep;
    }
    
    return initialCount - this.logs.length;
  }

  /**
   * Exporta logs a JSON
   */
  exportLogs(filter: LogFilter = {}): string {
    const logs = this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Genera ID único para log
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a consola para desarrollo
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] [${entry.connectorId}]`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.details);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.details);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.details);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.details);
        break;
    }
  }

  /**
   * Verifica si un log coincide con un filtro
   */
  private matchesFilter(log: LogEntry, filter: LogFilter): boolean {
    if (filter.connectorId && log.connectorId !== filter.connectorId) return false;
    if (filter.level && log.level !== filter.level) return false;
    if (filter.category && log.category !== filter.category) return false;
    if (filter.userId && log.userId !== filter.userId) return false;
    
    if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) return false;
    if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) return false;
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesMessage = log.message.toLowerCase().includes(searchLower);
      const matchesDetails = JSON.stringify(log.details || {}).toLowerCase().includes(searchLower);
      if (!matchesMessage && !matchesDetails) return false;
    }
    
    return true;
  }

  /**
   * Calcula percentil
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const index = (p / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return values[lower];
    }
    
    const weight = index - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  }
}

// Instancia global del logger
export const connectorLogger = new ConnectorLogger();