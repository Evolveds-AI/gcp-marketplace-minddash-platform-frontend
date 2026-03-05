import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { JSONPath } from 'jsonpath-plus';
import { ApiConfig, SyncLog, SyncStatus, SyncType } from '@/types/connectors';

export interface RestApiConnectorOptions {
  config: ApiConfig;
  onLog?: (log: Partial<SyncLog>) => void;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  transform?: {
    request?: string; // JSONPath expression
    response?: string; // JSONPath expression
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  duration?: number;
}

export class RestApiConnector {
  private client: AxiosInstance;
  private config: ApiConfig;
  private onLog?: (log: Partial<SyncLog>) => void;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(options: RestApiConnectorOptions) {
    this.config = options.config;
    this.onLog = options.onLog;
    this.client = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    };

    // Configurar autenticación
    if (this.config.authentication) {
      this.setupAuthentication(axiosConfig);
    }

    const instance = axios.create(axiosConfig);

    // Interceptor para rate limiting
    instance.interceptors.request.use(async (config) => {
      await this.enforceRateLimit();
      return config;
    });

    // Interceptor para logging y retry
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }
        throw error;
      }
    );

    return instance;
  }

  private setupAuthentication(axiosConfig: AxiosRequestConfig): void {
    const { authentication } = this.config;
    if (!authentication) return;

    switch (authentication.type) {
      case 'bearer':
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: `Bearer ${authentication.credentials.token}`,
        };
        break;

      case 'basic':
        const basicAuth = Buffer.from(
          `${authentication.credentials.username}:${authentication.credentials.password}`
        ).toString('base64');
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: `Basic ${basicAuth}`,
        };
        break;

      case 'apikey':
        const headerName = authentication.credentials.headerName || 'X-API-Key';
        axiosConfig.headers = {
          ...axiosConfig.headers,
          [headerName]: authentication.credentials.apiKey,
        };
        break;

      case 'oauth2':
        // Para OAuth2, asumimos que el token ya está disponible
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: `Bearer ${authentication.credentials.accessToken}`,
        };
        break;
    }
  }

  private async enforceRateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    const windowStart = now - (this.config.rateLimit.window * 1000);

    // Reset counter if we're in a new window
    if (this.lastRequestTime < windowStart) {
      this.requestCount = 0;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.config.rateLimit.requests) {
      const waitTime = (this.config.rateLimit.window * 1000) - (now - this.lastRequestTime);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }
    }

    this.requestCount++;
    this.lastRequestTime = now;
  }

  private shouldRetry(error: any): boolean {
    if (!this.config.retryPolicy) return false;

    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const status = error.response?.status;
    
    return retryableStatuses.includes(status) && 
           (error.config.__retryCount || 0) < this.config.retryPolicy.maxRetries;
  }

  private async retryRequest(error: any): Promise<AxiosResponse> {
    const retryCount = (error.config.__retryCount || 0) + 1;
    const delay = this.config.retryPolicy!.retryDelay * 
                  Math.pow(this.config.retryPolicy!.backoffMultiplier, retryCount - 1);

    error.config.__retryCount = retryCount;

    this.log({
      status: SyncStatus.RUNNING,
      metadata: {
        action: 'retry',
        attempt: retryCount,
        delay,
        error: error.message,
      },
    });

    await new Promise(resolve => setTimeout(resolve, delay));
    return this.client.request(error.config);
  }

  private transformData(data: any, transformExpression?: string): any {
    if (!transformExpression || !data) return data;

    try {
      const result = JSONPath({ path: transformExpression, json: data });
      return result.length === 1 ? result[0] : result;
    } catch (error) {
      this.log({
        status: SyncStatus.FAILED,
        errorMessage: `Data transformation failed: ${error}`,
        metadata: { transformExpression, originalData: data },
      });
      return data; // Return original data if transformation fails
    }
  }

  private log(logData: Partial<SyncLog>): void {
    if (this.onLog) {
      this.onLog({
        syncType: SyncType.MANUAL,
        startedAt: new Date(),
        ...logData,
      });
    }
  }

  // Método principal para realizar peticiones
  async request<T = any>(apiRequest: ApiRequest): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Verificar si el método está permitido
      if (this.config.methods && !this.config.methods[apiRequest.method.toLowerCase() as keyof typeof this.config.methods]) {
        throw new Error(`HTTP method ${apiRequest.method} is not allowed`);
      }

      // Transformar datos de entrada si es necesario
      let requestData = apiRequest.data;
      if (apiRequest.transform?.request || this.config.dataTransformation?.requestTransform) {
        const transformExpression = apiRequest.transform?.request || this.config.dataTransformation?.requestTransform;
        requestData = this.transformData(requestData, transformExpression);
      }

      // Configurar la petición
      const requestConfig: AxiosRequestConfig = {
        method: apiRequest.method,
        url: apiRequest.endpoint,
        data: requestData,
        params: apiRequest.params,
        headers: {
          ...this.config.headers,
          ...apiRequest.headers,
        },
      };

      this.log({
        status: SyncStatus.RUNNING,
        metadata: {
          method: apiRequest.method,
          endpoint: apiRequest.endpoint,
          requestConfig,
        },
      });

      // Realizar la petición
      const response = await this.client.request(requestConfig);
      const duration = Date.now() - startTime;

      // Transformar datos de respuesta si es necesario
      let responseData = response.data;
      if (apiRequest.transform?.response || this.config.dataTransformation?.responseTransform) {
        const transformExpression = apiRequest.transform?.response || this.config.dataTransformation?.responseTransform;
        responseData = this.transformData(responseData, transformExpression);
      }

      this.log({
        status: SyncStatus.COMPLETED,
        recordsProcessed: Array.isArray(responseData) ? responseData.length : 1,
        recordsSuccess: Array.isArray(responseData) ? responseData.length : 1,
        metadata: {
          statusCode: response.status,
          duration,
          responseSize: JSON.stringify(response.data).length,
        },
      });

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
        duration,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

      this.log({
        status: SyncStatus.FAILED,
        errorMessage,
        recordsError: 1,
        metadata: {
          statusCode: error.response?.status,
          duration,
          error: error.response?.data || error.message,
        },
      });

      return {
        success: false,
        error: errorMessage,
        statusCode: error.response?.status,
        duration,
      };
    }
  }

  // Métodos de conveniencia para diferentes tipos de peticiones
  async get<T = any>(endpoint: string, params?: Record<string, any>, options?: Partial<ApiRequest>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      endpoint,
      params,
      ...options,
    });
  }

  async post<T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      endpoint,
      data,
      ...options,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      endpoint,
      data,
      ...options,
    });
  }

  async delete<T = any>(endpoint: string, options?: Partial<ApiRequest>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      endpoint,
      ...options,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      endpoint,
      data,
      ...options,
    });
  }

  // Método para probar la conexión
  async testConnection(): Promise<ApiResponse> {
    try {
      const response = await this.get('/', {}, { 
        headers: { 'User-Agent': 'RestApiConnector-Test' } 
      });
      
      return {
        success: true,
        data: {
          message: 'Connection successful',
          statusCode: response.statusCode,
          duration: response.duration,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
      };
    }
  }

  // Método para obtener información del API
  async getApiInfo(): Promise<ApiResponse> {
    const info = {
      baseUrl: this.config.baseUrl,
      authType: this.config.authentication?.type || 'none',
      rateLimit: this.config.rateLimit,
      timeout: this.config.timeout,
      allowedMethods: this.config.methods,
      hasRetryPolicy: !!this.config.retryPolicy,
      hasDataTransformation: !!this.config.dataTransformation,
    };

    return {
      success: true,
      data: info,
    };
  }

  // Método para actualizar la configuración
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = this.createAxiosInstance();
  }

  // Método para limpiar recursos
  dispose(): void {
    // Limpiar interceptors y otros recursos si es necesario
    this.client.interceptors.request.clear();
    this.client.interceptors.response.clear();
  }
}

export default RestApiConnector;