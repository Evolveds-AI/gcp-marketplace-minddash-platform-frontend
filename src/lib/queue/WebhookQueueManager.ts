import Queue from 'bull';
import Redis from 'ioredis';
import { WebhookConfig, SyncLog, SyncStatus, SyncType } from '@/types/connectors';

export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
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
}

export interface WebhookJob {
  payload: any;
  metadata: {
    timestamp: Date;
    method: string;
    url: string;
    connectorId: string;
    retryCount?: number;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export class WebhookQueueManager {
  private queue: Queue.Queue;
  private redis: Redis;
  private config: QueueConfig;
  private onLog?: (log: Partial<SyncLog>) => void;
  private processors: Map<string, (job: Queue.Job<WebhookJob>) => Promise<any>> = new Map();

  constructor(config: QueueConfig, onLog?: (log: Partial<SyncLog>) => void) {
    this.config = config;
    this.onLog = onLog;
    
    // Configurar Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    // Configurar la cola
    this.queue = new Queue('webhook-processing', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
      },
      defaultJobOptions: {
        removeOnComplete: config.defaultJobOptions?.removeOnComplete || 10,
        removeOnFail: config.defaultJobOptions?.removeOnFail || 5,
        attempts: config.defaultJobOptions?.attempts || 3,
        backoff: config.defaultJobOptions?.backoff || {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupEventHandlers();
    this.setupDefaultProcessor();
  }

  /**
   * Configura los manejadores de eventos de la cola
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', (job: Queue.Job<WebhookJob>, result: any) => {
      this.log({
        status: SyncStatus.COMPLETED,
        recordsProcessed: 1,
        recordsSuccess: 1,
        metadata: {
          jobId: job.id,
          connectorId: job.data.metadata.connectorId,
          processingTime: Date.now() - job.processedOn!,
          result,
        },
      });
    });

    this.queue.on('failed', (job: Queue.Job<WebhookJob>, error: Error) => {
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: error.message,
        recordsError: 1,
        metadata: {
          jobId: job.id,
          connectorId: job.data.metadata.connectorId,
          attemptsMade: job.attemptsMade,
          error: error.message,
        },
      });
    });

    this.queue.on('stalled', (job: Queue.Job<WebhookJob>) => {
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: 'Job stalled',
        metadata: {
          jobId: job.id,
          connectorId: job.data.metadata.connectorId,
        },
      });
    });

    this.queue.on('progress', (job: Queue.Job<WebhookJob>, progress: number) => {
      this.log({
        status: SyncStatus.RUNNING,
        metadata: {
          jobId: job.id,
          connectorId: job.data.metadata.connectorId,
          progress,
        },
      });
    });

    this.queue.on('error', (error: Error) => {
      console.error('Queue error:', error);
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: `Queue error: ${error.message}`,
        metadata: { error: error.message },
      });
    });
  }

  /**
   * Configura el procesador por defecto
   */
  private setupDefaultProcessor(): void {
    this.queue.process('process-webhook', this.config.concurrency || 5, async (job: Queue.Job<WebhookJob>) => {
      const { payload, metadata } = job.data;
      
      try {
        // Buscar procesador específico para el conector
        const processor = this.processors.get(metadata.connectorId);
        
        if (processor) {
          return await processor(job);
        } else {
          // Procesador por defecto
          return await this.defaultWebhookProcessor(job);
        }
      } catch (error: any) {
        throw new Error(`Webhook processing failed: ${error.message}`);
      }
    });
  }

  /**
   * Procesador por defecto para webhooks
   */
  private async defaultWebhookProcessor(job: Queue.Job<WebhookJob>): Promise<any> {
    const { payload, metadata } = job.data;
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Actualizar progreso
    await job.progress(50);
    
    // Más procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Completar
    await job.progress(100);
    
    return {
      processed: true,
      timestamp: new Date(),
      originalPayload: payload,
      metadata,
      processedBy: 'DefaultWebhookProcessor',
    };
  }

  /**
   * Registra un procesador personalizado para un conector específico
   */
  registerProcessor(
    connectorId: string, 
    processor: (job: Queue.Job<WebhookJob>) => Promise<any>
  ): void {
    this.processors.set(connectorId, processor);
  }

  /**
   * Desregistra un procesador
   */
  unregisterProcessor(connectorId: string): void {
    this.processors.delete(connectorId);
  }

  /**
   * Añade un trabajo a la cola
   */
  async addJob(
    jobData: WebhookJob,
    options?: Queue.JobOptions
  ): Promise<Queue.Job<WebhookJob>> {
    const jobOptions: Queue.JobOptions = {
      priority: this.getJobPriority(jobData),
      delay: options?.delay || 0,
      attempts: options?.attempts || this.config.defaultJobOptions?.attempts || 3,
      backoff: options?.backoff || this.config.defaultJobOptions?.backoff,
      removeOnComplete: options?.removeOnComplete || this.config.defaultJobOptions?.removeOnComplete,
      removeOnFail: options?.removeOnFail || this.config.defaultJobOptions?.removeOnFail,
      ...options,
    };

    const job = await this.queue.add('process-webhook', jobData, jobOptions);
    
    this.log({
      status: SyncStatus.RUNNING,
      metadata: {
        jobId: job.id,
        connectorId: jobData.metadata.connectorId,
        priority: jobOptions.priority,
        queued: true,
      },
    });

    return job;
  }

  /**
   * Obtiene la prioridad del trabajo basada en el payload
   */
  private getJobPriority(jobData: WebhookJob): number {
    // Lógica para determinar prioridad
    // Por ahora, usar prioridad normal
    return 5;
  }

  /**
   * Obtiene estadísticas de la cola
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: await this.queue.isPaused(),
    };
  }

  /**
   * Obtiene trabajos por estado
   */
  async getJobs(state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed', start = 0, end = 10): Promise<Queue.Job<WebhookJob>[]> {
    switch (state) {
      case 'waiting':
        return this.queue.getWaiting(start, end);
      case 'active':
        return this.queue.getActive(start, end);
      case 'completed':
        return this.queue.getCompleted(start, end);
      case 'failed':
        return this.queue.getFailed(start, end);
      case 'delayed':
        return this.queue.getDelayed(start, end);
      default:
        return [];
    }
  }

  /**
   * Reintenta trabajos fallidos
   */
  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }

    this.log({
      status: SyncStatus.RUNNING,
      metadata: {
        retriedJobs: failedJobs.length,
        action: 'retryFailedJobs',
      },
    });
  }

  /**
   * Limpia trabajos completados y fallidos
   */
  async cleanJobs(grace = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace, 'failed');

    this.log({
      status: SyncStatus.COMPLETED,
      metadata: {
        action: 'cleanJobs',
        grace,
      },
    });
  }

  /**
   * Pausa la cola
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    
    this.log({
      status: SyncStatus.PENDING,
      metadata: { action: 'pause' },
    });
  }

  /**
   * Reanuda la cola
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    
    this.log({
      status: SyncStatus.RUNNING,
      metadata: { action: 'resume' },
    });
  }

  /**
   * Obtiene un trabajo por ID
   */
  async getJob(jobId: string): Promise<Queue.Job<WebhookJob> | null> {
    return this.queue.getJob(jobId);
  }

  /**
   * Cancela un trabajo
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      
      this.log({
        status: SyncStatus.FAILED,
        metadata: {
          jobId,
          action: 'cancelJob',
        },
      });
    }
  }

  /**
   * Registra eventos en el log
   */
  private log(logData: Partial<SyncLog>): void {
    if (this.onLog) {
      this.onLog({
        syncType: SyncType.REAL_TIME,
        startedAt: new Date(),
        ...logData,
      });
    }
  }

  /**
   * Cierra la cola y libera recursos
   */
  async close(): Promise<void> {
    await this.queue.close();
    this.redis.disconnect();
  }

  /**
   * Obtiene la instancia de la cola (para uso avanzado)
   */
  getQueue(): Queue.Queue {
    return this.queue;
  }
}

export default WebhookQueueManager;