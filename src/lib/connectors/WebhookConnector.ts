import crypto from 'crypto';
import { WebhookConfig, SyncLog, SyncStatus, SyncType } from '@/types/connectors';
import { Queue } from 'bull';

export interface WebhookConnectorOptions {
  config: WebhookConfig;
  onLog?: (log: Partial<SyncLog>) => void;
  queue?: Queue;
}

export interface WebhookPayload {
  headers: Record<string, string>;
  body: any;
  method: string;
  url: string;
  timestamp: Date;
  signature?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  payload?: any;
}

export interface WebhookProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
  queueJobId?: string;
}

export class WebhookConnector {
  private config: WebhookConfig;
  private onLog?: (log: Partial<SyncLog>) => void;
  private queue?: Queue;
  private processingStats = {
    totalReceived: 0,
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
  };

  constructor(options: WebhookConnectorOptions) {
    this.config = options.config;
    this.onLog = options.onLog;
    this.queue = options.queue;
  }

  /**
   * Valida la signature del webhook
   */
  private validateSignature(payload: WebhookPayload): WebhookValidationResult {
    if (!this.config.signatureValidation?.enabled) {
      return { isValid: true, payload: payload.body };
    }

    const { algorithm, secretKey, headerName } = this.config.signatureValidation;
    const receivedSignature = payload.headers[headerName.toLowerCase()];

    if (!receivedSignature) {
      return {
        isValid: false,
        error: `Missing signature header: ${headerName}`,
      };
    }

    try {
      // Crear el hash esperado
      const expectedSignature = this.createSignature(
        JSON.stringify(payload.body),
        secretKey,
        algorithm
      );

      // Comparar signatures de forma segura
      const isValid = this.secureCompare(receivedSignature, expectedSignature);

      if (!isValid) {
        this.log({
          status: SyncStatus.FAILED,
          errorMessage: 'Invalid webhook signature',
          metadata: {
            receivedSignature: receivedSignature.substring(0, 10) + '...',
            algorithm,
            headerName,
          },
        });

        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      return {
        isValid: true,
        payload: payload.body,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: `Signature validation error: ${error.message}`,
      };
    }
  }

  /**
   * Crea una signature para el payload
   */
  private createSignature(payload: string, secret: string, algorithm: string): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    // Formato común: sha256=<hash>
    return `${algorithm}=${signature}`;
  }

  /**
   * Comparación segura de signatures para prevenir timing attacks
   */
  private secureCompare(received: string, expected: string): boolean {
    if (received.length !== expected.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < received.length; i++) {
      result |= received.charCodeAt(i) ^ expected.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Procesa un webhook de forma síncrona
   */
  private async processSynchronously(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // Validar signature
      const validation = this.validateSignature(payload);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          processingTime: Date.now() - startTime,
        };
      }

      // Procesar el payload
      const result = await this.processWebhookData(validation.payload!);
      const processingTime = Date.now() - startTime;

      // Actualizar estadísticas
      this.updateStats(processingTime, true);

      this.log({
        status: SyncStatus.COMPLETED,
        recordsProcessed: 1,
        recordsSuccess: 1,
        metadata: {
          processingTime,
          payloadSize: JSON.stringify(payload.body).length,
          method: payload.method,
        },
      });

      return {
        success: true,
        data: result,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false);

      this.log({
        status: SyncStatus.FAILED,
        errorMessage: error.message,
        recordsError: 1,
        metadata: {
          processingTime,
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Procesa un webhook de forma asíncrona usando colas
   */
  private async processAsynchronously(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    if (!this.queue) {
      throw new Error('Queue not configured for async processing');
    }

    try {
      // Validar signature antes de añadir a la cola
      const validation = this.validateSignature(payload);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Configurar opciones de la cola
      const jobOptions = {
        priority: this.getQueuePriority(),
        delay: this.config.queueConfig?.delay || 0,
        attempts: this.config.queueConfig?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      };

      // Añadir trabajo a la cola
      const job = await this.queue.add('process-webhook', {
        payload: validation.payload,
        metadata: {
          timestamp: payload.timestamp,
          method: payload.method,
          url: payload.url,
          connectorId: this.config.url, // Usar URL como ID temporal
        },
      }, jobOptions);

      this.log({
        status: SyncStatus.RUNNING,
        metadata: {
          queueJobId: job.id,
          priority: jobOptions.priority,
          async: true,
        },
      });

      return {
        success: true,
        queueJobId: job.id?.toString(),
        data: { message: 'Webhook queued for processing', jobId: job.id },
      };
    } catch (error: any) {
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: `Failed to queue webhook: ${error.message}`,
        metadata: { error: error.message },
      });

      return {
        success: false,
        error: `Failed to queue webhook: ${error.message}`,
      };
    }
  }

  /**
   * Obtiene la prioridad de la cola basada en la configuración
   */
  private getQueuePriority(): number {
    const priority = this.config.queueConfig?.priority || 'normal';
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Procesa los datos del webhook (lógica de negocio)
   */
  private async processWebhookData(data: any): Promise<any> {
    // Aquí iría la lógica específica de procesamiento del webhook
    // Por ahora, simplemente validamos y retornamos los datos
    
    if (!data) {
      throw new Error('Empty webhook payload');
    }

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      processed: true,
      timestamp: new Date(),
      originalData: data,
      processedBy: 'WebhookConnector',
    };
  }

  /**
   * Actualiza las estadísticas de procesamiento
   */
  private updateStats(processingTime: number, success: boolean): void {
    this.processingStats.totalReceived++;
    
    if (success) {
      this.processingStats.totalProcessed++;
      
      // Calcular tiempo promedio de procesamiento
      const currentAvg = this.processingStats.averageProcessingTime;
      const count = this.processingStats.totalProcessed;
      this.processingStats.averageProcessingTime = 
        ((currentAvg * (count - 1)) + processingTime) / count;
    } else {
      this.processingStats.totalFailed++;
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
   * Método principal para procesar webhooks
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    try {
      // Verificar si el procesamiento debe ser asíncrono
      if (this.config.async && this.queue) {
        return await this.processAsynchronously(payload);
      } else {
        return await this.processSynchronously(payload);
      }
    } catch (error: any) {
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: `Webhook processing failed: ${error.message}`,
        metadata: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Valida la configuración del webhook
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.url) {
      errors.push('URL is required');
    }

    if (!this.config.method) {
      errors.push('HTTP method is required');
    }

    if (this.config.signatureValidation?.enabled) {
      if (!this.config.signatureValidation.secretKey) {
        errors.push('Secret key is required for signature validation');
      }
      if (!this.config.signatureValidation.headerName) {
        errors.push('Header name is required for signature validation');
      }
      if (!['sha1', 'sha256', 'md5'].includes(this.config.signatureValidation.algorithm)) {
        errors.push('Invalid signature algorithm');
      }
    }

    if (this.config.async && !this.queue) {
      errors.push('Queue is required for async processing');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtiene las estadísticas de procesamiento
   */
  getStats() {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalReceived > 0 
        ? (this.processingStats.totalProcessed / this.processingStats.totalReceived) * 100 
        : 0,
    };
  }

  /**
   * Reinicia las estadísticas
   */
  resetStats(): void {
    this.processingStats = {
      totalReceived: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Prueba la configuración del webhook
   */
  async testWebhook(): Promise<WebhookProcessingResult> {
    const testPayload: WebhookPayload = {
      headers: {
        'content-type': 'application/json',
        'user-agent': 'WebhookConnector-Test',
      },
      body: {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook payload',
      },
      method: 'POST',
      url: this.config.url,
      timestamp: new Date(),
    };

    // Si la validación de signature está habilitada, crear una signature de prueba
    if (this.config.signatureValidation?.enabled) {
      const signature = this.createSignature(
        JSON.stringify(testPayload.body),
        this.config.signatureValidation.secretKey,
        this.config.signatureValidation.algorithm
      );
      testPayload.headers[this.config.signatureValidation.headerName.toLowerCase()] = signature;
    }

    return this.processWebhook(testPayload);
  }

  /**
   * Actualiza la configuración del webhook
   */
  updateConfig(newConfig: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    // Limpiar recursos si es necesario
    this.resetStats();
  }
}

export default WebhookConnector;