import { WebhookQueueManager, QueueConfig } from './WebhookQueueManager';
import { WebhookConnector } from '../connectors/WebhookConnector';
import { SyncLog } from '@/types/connectors';
import Queue from 'bull';

export interface QueueServiceConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  webhook?: {
    concurrency?: number;
    maxJobs?: number;
    defaultJobOptions?: {
      removeOnComplete?: number;
      removeOnFail?: number;
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
    };
  };
}

export class QueueService {
  private static instance: QueueService;
  private webhookQueueManager?: WebhookQueueManager;
  private config: QueueServiceConfig;
  private onLog?: (log: Partial<SyncLog>) => void;
  private connectors: Map<string, WebhookConnector> = new Map();

  private constructor(config: QueueServiceConfig, onLog?: (log: Partial<SyncLog>) => void) {
    this.config = config;
    this.onLog = onLog;
  }

  /**
   * Obtiene la instancia singleton del servicio de colas
   */
  static getInstance(config?: QueueServiceConfig, onLog?: (log: Partial<SyncLog>) => void): QueueService {
    if (!QueueService.instance) {
      if (!config) {
        throw new Error('QueueService config is required for first initialization');
      }
      QueueService.instance = new QueueService(config, onLog);
    }
    return QueueService.instance;
  }

  /**
   * Inicializa el gestor de colas de webhooks
   */
  async initializeWebhookQueue(): Promise<void> {
    if (this.webhookQueueManager) {
      return; // Ya inicializado
    }

    const queueConfig: QueueConfig = {
      redis: this.config.redis,
      concurrency: this.config.webhook?.concurrency || 5,
      maxJobs: this.config.webhook?.maxJobs || 1000,
      defaultJobOptions: this.config.webhook?.defaultJobOptions || {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };

    this.webhookQueueManager = new WebhookQueueManager(queueConfig, this.onLog);

    // Registrar procesadores personalizados para conectores existentes
    for (const [connectorId, connector] of Array.from(this.connectors.entries())) {
      this.registerWebhookProcessor(connectorId, connector);
    }

    if (this.onLog) {
      this.onLog({
        status: 'COMPLETED' as any,
        metadata: {
          action: 'initializeWebhookQueue',
          config: queueConfig,
        },
      });
    }
  }

  /**
   * Registra un conector de webhook con su procesador
   */
  registerWebhookConnector(connectorId: string, connector: WebhookConnector): void {
    this.connectors.set(connectorId, connector);

    // Si el queue manager ya está inicializado, registrar el procesador
    if (this.webhookQueueManager) {
      this.registerWebhookProcessor(connectorId, connector);
    }
  }

  /**
   * Registra un procesador personalizado para un conector
   */
  private registerWebhookProcessor(connectorId: string, connector: WebhookConnector): void {
    if (!this.webhookQueueManager) {
      throw new Error('Webhook queue manager not initialized');
    }

    this.webhookQueueManager.registerProcessor(connectorId, async (job) => {
      const { payload, metadata } = job.data;
      
      // Crear un payload compatible con WebhookConnector
      const webhookPayload = {
        headers: (metadata as any).headers || { 'content-type': 'application/json' },
        body: payload,
        method: metadata.method,
        url: metadata.url,
        timestamp: new Date(metadata.timestamp),
      };

      // Procesar usando el conector específico
      const result = await connector.processWebhook(webhookPayload);
      
      if (!result.success) {
        throw new Error(result.error || 'Webhook processing failed');
      }

      return result.data;
    });
  }

  /**
   * Desregistra un conector de webhook
   */
  unregisterWebhookConnector(connectorId: string): void {
    this.connectors.delete(connectorId);
    
    if (this.webhookQueueManager) {
      this.webhookQueueManager.unregisterProcessor(connectorId);
    }
  }

  /**
   * Obtiene la cola de webhooks para un conector
   */
  getWebhookQueue(): Queue.Queue | undefined {
    return this.webhookQueueManager?.getQueue();
  }

  /**
   * Obtiene el gestor de colas de webhooks
   */
  getWebhookQueueManager(): WebhookQueueManager | undefined {
    return this.webhookQueueManager;
  }

  /**
   * Obtiene estadísticas de todas las colas
   */
  async getStats() {
    const stats: any = {};

    if (this.webhookQueueManager) {
      stats.webhook = await this.webhookQueueManager.getStats();
    }

    return stats;
  }

  /**
   * Pausa todas las colas
   */
  async pauseAll(): Promise<void> {
    if (this.webhookQueueManager) {
      await this.webhookQueueManager.pause();
    }

    if (this.onLog) {
      this.onLog({
        status: 'PAUSED' as any,
        metadata: { action: 'pauseAll' },
      });
    }
  }

  /**
   * Reanuda todas las colas
   */
  async resumeAll(): Promise<void> {
    if (this.webhookQueueManager) {
      await this.webhookQueueManager.resume();
    }

    if (this.onLog) {
      this.onLog({
        status: 'RUNNING' as any,
        metadata: { action: 'resumeAll' },
      });
    }
  }

  /**
   * Limpia trabajos antiguos en todas las colas
   */
  async cleanAllJobs(grace = 24 * 60 * 60 * 1000): Promise<void> {
    if (this.webhookQueueManager) {
      await this.webhookQueueManager.cleanJobs(grace);
    }

    if (this.onLog) {
      this.onLog({
        status: 'COMPLETED' as any,
        metadata: {
          action: 'cleanAllJobs',
          grace,
        },
      });
    }
  }

  /**
   * Reintenta trabajos fallidos en todas las colas
   */
  async retryAllFailedJobs(): Promise<void> {
    if (this.webhookQueueManager) {
      await this.webhookQueueManager.retryFailedJobs();
    }

    if (this.onLog) {
      this.onLog({
        status: 'RUNNING' as any,
        metadata: { action: 'retryAllFailedJobs' },
      });
    }
  }

  /**
   * Verifica el estado de salud del servicio de colas
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        details: {
          initialized: {
            webhook: !!this.webhookQueueManager,
          },
          stats,
          connectors: Array.from(this.connectors.keys()),
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          initialized: {
            webhook: !!this.webhookQueueManager,
          },
        },
      };
    }
  }

  /**
   * Actualiza la configuración del servicio
   */
  updateConfig(newConfig: Partial<QueueServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cierra todas las colas y libera recursos
   */
  async shutdown(): Promise<void> {
    if (this.webhookQueueManager) {
      await this.webhookQueueManager.close();
      this.webhookQueueManager = undefined;
    }

    this.connectors.clear();

    if (this.onLog) {
      this.onLog({
        status: 'COMPLETED' as any,
        metadata: { action: 'shutdown' },
      });
    }
  }

  /**
   * Reinicia el servicio de colas
   */
  async restart(): Promise<void> {
    await this.shutdown();
    await this.initializeWebhookQueue();

    if (this.onLog) {
      this.onLog({
        status: 'COMPLETED' as any,
        metadata: { action: 'restart' },
      });
    }
  }
}

// Función de utilidad para crear una configuración por defecto
export function createDefaultQueueConfig(): QueueServiceConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    webhook: {
      concurrency: 5,
      maxJobs: 1000,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    },
  };
}

export default QueueService;