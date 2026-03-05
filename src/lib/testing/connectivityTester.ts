import { ConnectorType, ConnectorConfig } from '@/types/connectors';
import { RestApiConnector } from '@/lib/connectors/RestApiConnector';
import { WebhookConnector } from '@/lib/connectors/WebhookConnector';
import { ConnectorValidator } from '@/lib/validation/connectorValidation';
import axios from 'axios';
import crypto from 'crypto';

export interface ConnectivityTestResult {
  success: boolean;
  message: string;
  details: {
    configValid: boolean;
    connectionEstablished: boolean;
    authenticationValid: boolean;
    responseTime: number;
    statusCode?: number;
    headers?: Record<string, string>;
    error?: string;
    warnings?: string[];
  };
  timestamp: string;
}

export interface TestOptions {
  timeout?: number;
  validateAuth?: boolean;
  testEndpoint?: string;
  customHeaders?: Record<string, string>;
  skipSslVerification?: boolean;
}

export class ConnectivityTester {
  /**
   * Prueba la conectividad de un conector
   */
  static async testConnector(
    type: ConnectorType,
    config: ConnectorConfig,
    options: TestOptions = {}
  ): Promise<ConnectivityTestResult> {
    const startTime = Date.now();
    const result: ConnectivityTestResult = {
      success: false,
      message: '',
      details: {
        configValid: false,
        connectionEstablished: false,
        authenticationValid: false,
        responseTime: 0,
        warnings: []
      },
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Validar configuración
      try {
        if (type === ConnectorType.API) {
          ConnectorValidator.validateApiConfig(config);
        } else if (type === ConnectorType.WEBHOOK) {
          ConnectorValidator.validateWebhookConfig(config);
        }
        result.details.configValid = true;
      } catch (error) {
        result.message = 'Configuración inválida';
        result.details.error = error instanceof Error ? error.message : 'Error de validación';
        result.details.responseTime = Date.now() - startTime;
        return result;
      }

      // 2. Probar conectividad según el tipo
      switch (type) {
        case ConnectorType.API:
          return await this.testApiConnector(config, options, result, startTime);
        case ConnectorType.WEBHOOK:
          return await this.testWebhookConnector(config, options, result, startTime);
        default:
          result.message = 'Tipo de conector no soportado';
          result.details.error = `Tipo ${type} no implementado`;
          result.details.responseTime = Date.now() - startTime;
          return result;
      }
    } catch (error) {
      result.message = 'Error durante la prueba de conectividad';
      result.details.error = error instanceof Error ? error.message : 'Error desconocido';
      result.details.responseTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Prueba un conector API REST
   */
  private static async testApiConnector(
    config: any,
    options: TestOptions,
    result: ConnectivityTestResult,
    startTime: number
  ): Promise<ConnectivityTestResult> {
    let connector: RestApiConnector | null = null;

    try {
      connector = new RestApiConnector(config);
      
      // Probar conexión básica
      const testResult = await connector.testConnection();
      
      result.details.connectionEstablished = testResult.success;
      result.details.authenticationValid = testResult.success; // Si la conexión es exitosa, la auth es válida
      result.details.statusCode = testResult.statusCode;
      result.details.headers = testResult.headers;
      
      if (testResult.success) {
        result.success = true;
        result.message = 'Conexión exitosa';
        
        // Las advertencias se manejan a nivel de resultado, no de testResult
      } else {
        result.message = testResult.error || 'Error de conexión';
        result.details.error = testResult.error;
      }
      
      result.details.responseTime = Date.now() - startTime;
      return result;
    } catch (error) {
      result.message = 'Error al probar conector API';
      result.details.error = error instanceof Error ? error.message : 'Error desconocido';
      result.details.responseTime = Date.now() - startTime;
      return result;
    } finally {
      if (connector) {
        await connector.dispose();
      }
    }
  }

  /**
   * Prueba un conector Webhook
   */
  private static async testWebhookConnector(
    config: any,
    options: TestOptions,
    result: ConnectivityTestResult,
    startTime: number
  ): Promise<ConnectivityTestResult> {
    let connector: WebhookConnector | null = null;

    try {
      connector = new WebhookConnector(config);
      
      // Probar configuración del webhook
      const testResult = await connector.testWebhook();
      
      result.details.connectionEstablished = testResult.success;
      result.details.authenticationValid = testResult.success || false;
      
      if (testResult.success) {
        result.success = true;
        result.message = 'Configuración de webhook válida';
        
        // Probar procesamiento de payload de ejemplo
        const testPayload = {
          test: true,
          timestamp: new Date().toISOString(),
          data: { message: 'Test webhook payload' }
        };
        
        const processResult = await connector.processWebhook({
          headers: {
            'content-type': 'application/json',
            'x-test-webhook': 'true'
          },
          body: testPayload,
          method: 'POST',
          url: 'http://test-webhook.local/test',
          timestamp: new Date()
        });
        
        if (processResult.success) {
          result.details.warnings?.push('Webhook procesado correctamente con payload de prueba');
        } else {
          result.details.warnings?.push('Advertencia: Error al procesar payload de prueba');
        }
      } else {
        result.message = testResult.error || 'Error en configuración de webhook';
        result.details.error = testResult.error;
      }
      
      result.details.responseTime = Date.now() - startTime;
      return result;
    } catch (error) {
      result.message = 'Error al probar conector webhook';
      result.details.error = error instanceof Error ? error.message : 'Error desconocido';
      result.details.responseTime = Date.now() - startTime;
      return result;
    } finally {
      if (connector) {
        await connector.dispose();
      }
    }
  }

  /**
   * Prueba una URL específica
   */
  static async testUrl(
    url: string,
    options: TestOptions = {}
  ): Promise<{
    success: boolean;
    statusCode?: number;
    responseTime: number;
    headers?: Record<string, string>;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: options.timeout || 10000,
        headers: options.customHeaders,
        validateStatus: () => true, // No lanzar error por códigos de estado
        httpsAgent: options.skipSslVerification ? {
          rejectUnauthorized: false
        } : undefined
      });
      
      return {
        success: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        headers: response.headers as Record<string, string>
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Valida credenciales de autenticación
   */
  static async validateAuth(
    authConfig: any,
    baseUrl: string
  ): Promise<{
    valid: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      switch (authConfig.type) {
        case 'bearer':
          return await this.validateBearerAuth(authConfig, baseUrl);
        case 'basic':
          return await this.validateBasicAuth(authConfig, baseUrl);
        case 'apikey':
          return await this.validateApiKeyAuth(authConfig, baseUrl);
        case 'oauth2':
          return await this.validateOAuth2Auth(authConfig);
        case 'none':
          return { valid: true };
        default:
          return {
            valid: false,
            error: `Tipo de autenticación ${authConfig.type} no soportado`
          };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de validación'
      };
    }
  }

  private static async validateBearerAuth(authConfig: any, baseUrl: string) {
    try {
      const response = await axios.get(baseUrl, {
        headers: {
          'Authorization': `Bearer ${authConfig.token}`
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      return {
        valid: response.status !== 401 && response.status !== 403,
        details: {
          statusCode: response.status,
          tokenLength: authConfig.token.length
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de conexión'
      };
    }
  }

  private static async validateBasicAuth(authConfig: any, baseUrl: string) {
    try {
      const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
      
      const response = await axios.get(baseUrl, {
        headers: {
          'Authorization': `Basic ${credentials}`
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      return {
        valid: response.status !== 401 && response.status !== 403,
        details: {
          statusCode: response.status,
          username: authConfig.username
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de conexión'
      };
    }
  }

  private static async validateApiKeyAuth(authConfig: any, baseUrl: string) {
    try {
      const headers: Record<string, string> = {};
      const params: Record<string, string> = {};
      
      if (authConfig.location === 'header') {
        headers[authConfig.name] = authConfig.key;
      } else {
        params[authConfig.name] = authConfig.key;
      }
      
      const response = await axios.get(baseUrl, {
        headers,
        params,
        timeout: 10000,
        validateStatus: () => true
      });
      
      return {
        valid: response.status !== 401 && response.status !== 403,
        details: {
          statusCode: response.status,
          location: authConfig.location,
          keyName: authConfig.name
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de conexión'
      };
    }
  }

  private static async validateOAuth2Auth(authConfig: any) {
    try {
      const response = await axios.post(authConfig.tokenUrl, {
        grant_type: authConfig.grantType,
        client_id: authConfig.clientId,
        client_secret: authConfig.clientSecret,
        scope: authConfig.scope
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      return {
        valid: response.status === 200 && response.data.access_token,
        details: {
          statusCode: response.status,
          hasAccessToken: !!response.data.access_token,
          tokenType: response.data.token_type
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de OAuth2'
      };
    }
  }
}