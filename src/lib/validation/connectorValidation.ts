import { z } from 'zod';
import { ConnectorType, HttpMethod, AuthType } from '@/types/connectors';

// Esquemas base
const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const authTypeSchema = z.enum(['none', 'bearer', 'basic', 'apikey', 'oauth2', 'signature']);

// Esquema para autenticación Bearer
const bearerAuthSchema = z.object({
  type: z.literal('bearer'),
  token: z.string().min(1, 'Token es requerido')
});

// Esquema para autenticación Basic
const basicAuthSchema = z.object({
  type: z.literal('basic'),
  username: z.string().min(1, 'Usuario es requerido'),
  password: z.string().min(1, 'Contraseña es requerida')
});

// Esquema para autenticación API Key
const apiKeyAuthSchema = z.object({
  type: z.literal('apikey'),
  key: z.string().min(1, 'Clave API es requerida'),
  location: z.enum(['header', 'query']).default('header'),
  name: z.string().min(1, 'Nombre del parámetro es requerido')
});

// Esquema para autenticación OAuth2
const oauth2AuthSchema = z.object({
  type: z.literal('oauth2'),
  clientId: z.string().min(1, 'Client ID es requerido'),
  clientSecret: z.string().min(1, 'Client Secret es requerido'),
  tokenUrl: z.string().url('URL de token inválida'),
  scope: z.string().optional(),
  grantType: z.enum(['client_credentials', 'authorization_code']).default('client_credentials')
});

// Esquema para autenticación por firma
const signatureAuthSchema = z.object({
  type: z.literal('signature'),
  secret: z.string().min(1, 'Secreto es requerido'),
  algorithm: z.enum(['sha256', 'sha1']).default('sha256'),
  headerName: z.string().default('x-hub-signature-256')
});

// Esquema para sin autenticación
const noneAuthSchema = z.object({
  type: z.literal('none')
});

// Esquema unificado de autenticación
const authSchema = z.discriminatedUnion('type', [
  noneAuthSchema,
  bearerAuthSchema,
  basicAuthSchema,
  apiKeyAuthSchema,
  oauth2AuthSchema,
  signatureAuthSchema
]);

// Esquema para headers personalizados
const customHeaderSchema = z.object({
  key: z.string().min(1, 'Nombre del header es requerido'),
  value: z.string().min(1, 'Valor del header es requerido'),
  description: z.string().optional()
});

// Esquema para política de reintentos
const retryPolicySchema = z.object({
  maxRetries: z.number().min(0).max(10).default(3),
  backoffMultiplier: z.number().min(1).max(10).default(2),
  initialDelay: z.number().min(100).max(60000).default(1000),
  maxDelay: z.number().min(1000).max(300000).default(30000)
});

// Esquema para transformación de datos
const dataTransformSchema = z.object({
  enabled: z.boolean().default(false),
  inputPath: z.string().optional(),
  outputPath: z.string().optional(),
  mapping: z.record(z.string()).optional()
});

// Esquema para configuración de cola
const queueConfigSchema = z.object({
  name: z.string().min(1, 'Nombre de cola es requerido'),
  concurrency: z.number().min(1).max(100).default(5),
  maxRetries: z.number().min(0).max(10).default(3),
  delay: z.number().min(0).max(3600000).default(0),
  removeOnComplete: z.number().min(1).max(1000).default(100),
  removeOnFail: z.number().min(1).max(1000).default(50)
});

// Esquema para configuración de API REST
const apiConfigSchema = z.object({
  baseUrl: z.string().url('URL base inválida'),
  timeout: z.number().min(1000).max(300000).default(30000),
  allowedMethods: z.array(httpMethodSchema).min(1, 'Al menos un método HTTP es requerido'),
  auth: authSchema,
  headers: z.array(customHeaderSchema).default([]),
  retryPolicy: retryPolicySchema.optional(),
  dataTransform: dataTransformSchema.optional(),
  rateLimit: z.object({
    enabled: z.boolean().default(false),
    requestsPerMinute: z.number().min(1).max(10000).default(60)
  }).optional()
});

// Esquema para configuración de Webhook
const webhookConfigSchema = z.object({
  url: z.string().url('URL del webhook inválida'),
  allowedMethods: z.array(httpMethodSchema).default(['POST']),
  timeout: z.number().min(1000).max(300000).default(30000),
  async: z.boolean().default(true),
  auth: authSchema,
  headers: z.array(customHeaderSchema).default([]),
  queueConfig: queueConfigSchema.optional(),
  payloadValidation: z.object({
    enabled: z.boolean().default(false),
    schema: z.string().optional(),
    strictSignature: z.boolean().default(true),
    maxPayloadSize: z.number().min(1024).max(10485760).default(1048576) // 1MB por defecto
  }).optional()
});

// Esquema principal del conector
export const connectorSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  type: z.nativeEnum(ConnectorType),
  config: z.union([
    apiConfigSchema,
    webhookConfigSchema
  ]),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([])
});

// Esquema para actualización de conector (campos opcionales)
export const connectorUpdateSchema = connectorSchema.partial();

// Esquema para solicitud de sincronización
export const syncRequestSchema = z.object({
  syncType: z.enum(['full', 'incremental']).default('full'),
  filters: z.record(z.any()).default({}),
  options: z.record(z.any()).default({})
});

// Esquema para configuración de programación
export const scheduleConfigSchema = z.object({
  enabled: z.boolean(),
  cronExpression: z.string().optional(),
  syncType: z.enum(['full', 'incremental']).default('full'),
  filters: z.record(z.any()).default({}),
  options: z.record(z.any()).default({})
}).refine(
  (data) => !data.enabled || (data.enabled && data.cronExpression),
  {
    message: 'Expresión cron es requerida cuando la programación está habilitada',
    path: ['cronExpression']
  }
);

// Funciones de validación
export class ConnectorValidator {
  /**
   * Valida la configuración completa de un conector
   */
  static validateConnector(data: unknown) {
    return connectorSchema.parse(data);
  }

  /**
   * Valida una actualización parcial de conector
   */
  static validateConnectorUpdate(data: unknown) {
    return connectorUpdateSchema.parse(data);
  }

  /**
   * Valida una solicitud de sincronización
   */
  static validateSyncRequest(data: unknown) {
    return syncRequestSchema.parse(data);
  }

  /**
   * Valida la configuración de programación
   */
  static validateScheduleConfig(data: unknown) {
    return scheduleConfigSchema.parse(data);
  }

  /**
   * Valida la configuración específica de API
   */
  static validateApiConfig(data: unknown) {
    return apiConfigSchema.parse(data);
  }

  /**
   * Valida la configuración específica de Webhook
   */
  static validateWebhookConfig(data: unknown) {
    return webhookConfigSchema.parse(data);
  }

  /**
   * Valida una expresión cron
   */
  static validateCronExpression(expression: string): boolean {
    const cronParts = expression.trim().split(/\s+/);
    
    // Validar que tenga 5 o 6 partes (con o sin segundos)
    if (cronParts.length !== 5 && cronParts.length !== 6) {
      return false;
    }

    // Validación básica de cada parte
    const patterns = {
      second: /^(\*|[0-5]?\d|\*\/[0-5]?\d|[0-5]?\d-[0-5]?\d|[0-5]?\d(,[0-5]?\d)*)$/,
      minute: /^(\*|[0-5]?\d|\*\/[0-5]?\d|[0-5]?\d-[0-5]?\d|[0-5]?\d(,[0-5]?\d)*)$/,
      hour: /^(\*|1?\d|2[0-3]|\*\/1?\d|\*\/2[0-3]|1?\d-1?\d|2[0-3]-2[0-3]|1?\d(,1?\d)*|2[0-3](,2[0-3])*)$/,
      day: /^(\*|[1-9]|[12]\d|3[01]|\*\/[1-9]|\*\/[12]\d|\*\/3[01]|[1-9]-[1-9]|[12]\d-[12]\d|3[01]-3[01]|[1-9](,[1-9])*|[12]\d(,[12]\d)*|3[01](,3[01])*)$/,
      month: /^(\*|[1-9]|1[0-2]|\*\/[1-9]|\*\/1[0-2]|[1-9]-[1-9]|1[0-2]-1[0-2]|[1-9](,[1-9])*|1[0-2](,1[0-2])*)$/,
      dayOfWeek: /^(\*|[0-6]|\*\/[0-6]|[0-6]-[0-6]|[0-6](,[0-6])*)$/
    };

    try {
      if (cronParts.length === 6) {
        // Con segundos
        return patterns.second.test(cronParts[0]) &&
               patterns.minute.test(cronParts[1]) &&
               patterns.hour.test(cronParts[2]) &&
               patterns.day.test(cronParts[3]) &&
               patterns.month.test(cronParts[4]) &&
               patterns.dayOfWeek.test(cronParts[5]);
      } else {
        // Sin segundos
        return patterns.minute.test(cronParts[0]) &&
               patterns.hour.test(cronParts[1]) &&
               patterns.day.test(cronParts[2]) &&
               patterns.month.test(cronParts[3]) &&
               patterns.dayOfWeek.test(cronParts[4]);
      }
    } catch {
      return false;
    }
  }

  /**
   * Valida una URL
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida un JSONPath
   */
  static validateJsonPath(path: string): boolean {
    // Validación básica de JSONPath
    const jsonPathPattern = /^\$(\.\w+|\[\d+\]|\[\*\]|\[\'[^\']*\'\]|\[\"[^\"]*\"\])*$/;
    return jsonPathPattern.test(path);
  }

  /**
   * Obtiene errores de validación en formato legible
   */
  static getValidationErrors(error: z.ZodError): Array<{ field: string; message: string }> {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
  }
}