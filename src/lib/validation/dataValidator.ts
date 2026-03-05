import { JSONPath } from 'jsonpath-plus';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  transformedData?: any;
}

export interface DataTransformConfig {
  inputMapping?: Record<string, string>; // JSONPath mappings
  outputMapping?: Record<string, string>; // JSONPath mappings
  filters?: {
    include?: string[]; // JSONPath expressions
    exclude?: string[]; // JSONPath expressions
  };
  transformations?: {
    field: string;
    operation: 'uppercase' | 'lowercase' | 'trim' | 'format_date' | 'parse_number' | 'custom';
    params?: any;
  }[];
}

export interface ValidationSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
  format?: string;
}

export class DataValidator {
  private ajv: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    (addFormats as unknown as (ajv: any) => void)(this.ajv);
  }

  /**
   * Valida datos contra un esquema JSON Schema
   */
  validateSchema(data: any, schema: ValidationSchema): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);

      if (valid) {
        result.valid = true;
      } else {
        result.errors = validate.errors?.map((error: any) => {
          const path = error.instancePath || 'root';
          return `${path}: ${error.message}`;
        }) || ['Error de validación desconocido'];
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Error al compilar esquema'
      );
    }

    return result;
  }

  /**
   * Transforma datos usando configuración de mapeo
   */
  transformData(data: any, config: DataTransformConfig): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      transformedData: data
    };

    try {
      let transformedData = JSON.parse(JSON.stringify(data)); // Deep clone

      // Aplicar filtros de inclusión/exclusión
      if (config.filters) {
        transformedData = this.applyFilters(transformedData, config.filters);
      }

      // Aplicar mapeos de entrada
      if (config.inputMapping) {
        transformedData = this.applyMapping(transformedData, config.inputMapping);
      }

      // Aplicar transformaciones
      if (config.transformations) {
        transformedData = this.applyTransformations(transformedData, config.transformations);
      }

      // Aplicar mapeos de salida
      if (config.outputMapping) {
        transformedData = this.applyMapping(transformedData, config.outputMapping);
      }

      result.transformedData = transformedData;
    } catch (error) {
      result.valid = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Error durante la transformación'
      );
    }

    return result;
  }

  /**
   * Valida JSONPath expressions
   */
  validateJSONPath(expression: string, testData?: any): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Validar sintaxis básica
      if (!expression || typeof expression !== 'string') {
        result.errors.push('JSONPath expression debe ser una cadena no vacía');
        return result;
      }

      if (!expression.startsWith('$')) {
        result.errors.push('JSONPath expression debe comenzar con $');
        return result;
      }

      // Probar con datos de ejemplo si se proporcionan
      if (testData) {
        try {
          const testResult = JSONPath({ path: expression, json: testData });
          result.valid = true;
          
          if (testResult.length === 0) {
            result.warnings.push('JSONPath no encontró coincidencias en los datos de prueba');
          }
        } catch (error) {
          result.errors.push(
            `Error al evaluar JSONPath: ${error instanceof Error ? error.message : 'Error desconocido'}`
          );
          return result;
        }
      } else {
        // Validación básica de sintaxis sin datos
        result.valid = this.isValidJSONPathSyntax(expression);
        if (!result.valid) {
          result.errors.push('Sintaxis de JSONPath inválida');
        }
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Error de validación'
      );
    }

    return result;
  }

  /**
   * Valida estructura de datos de webhook
   */
  validateWebhookPayload(
    payload: string,
    expectedSchema?: ValidationSchema
  ): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Validar que sea JSON válido
      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (error) {
        result.errors.push('Payload no es JSON válido');
        return result;
      }

      // Validar tamaño
      if (payload.length > 10 * 1024 * 1024) { // 10MB
        result.errors.push('Payload excede el tamaño máximo permitido (10MB)');
        return result;
      }

      // Validar contra esquema si se proporciona
      if (expectedSchema) {
        const schemaResult = this.validateSchema(parsedPayload, expectedSchema);
        result.valid = schemaResult.valid;
        result.errors = schemaResult.errors;
        result.warnings = schemaResult.warnings;
      } else {
        result.valid = true;
      }

      // Verificar campos comunes de webhook
      this.validateCommonWebhookFields(parsedPayload, result);

    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Error de validación'
      );
    }

    return result;
  }

  /**
   * Valida respuesta de API
   */
  validateApiResponse(
    response: any,
    expectedSchema?: ValidationSchema,
    statusCode?: number
  ): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Validar código de estado
      if (statusCode !== undefined) {
        if (statusCode < 200 || statusCode >= 300) {
          result.warnings.push(`Código de estado no exitoso: ${statusCode}`);
        }
      }

      // Validar estructura de respuesta
      if (expectedSchema) {
        const schemaResult = this.validateSchema(response, expectedSchema);
        result.valid = schemaResult.valid;
        result.errors = schemaResult.errors;
        result.warnings.push(...schemaResult.warnings);
      } else {
        result.valid = true;
      }

      // Verificar campos comunes de respuesta API
      this.validateCommonApiFields(response, result);

    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Error de validación'
      );
    }

    return result;
  }

  /**
   * Aplica filtros de inclusión/exclusión
   */
  private applyFilters(data: any, filters: { include?: string[]; exclude?: string[] }): any {
    let result = data;

    // Aplicar filtros de inclusión
    if (filters.include && filters.include.length > 0) {
      const included: any = {};
      for (const path of filters.include) {
        try {
          const values = JSONPath({ path, json: data });
          if (values.length > 0) {
            this.setValueByPath(included, path, values[0]);
          }
        } catch (error) {
          // Ignorar errores de JSONPath inválido
        }
      }
      result = included;
    }

    // Aplicar filtros de exclusión
    if (filters.exclude && filters.exclude.length > 0) {
      result = JSON.parse(JSON.stringify(result)); // Deep clone
      for (const path of filters.exclude) {
        try {
          this.deleteValueByPath(result, path);
        } catch (error) {
          // Ignorar errores de JSONPath inválido
        }
      }
    }

    return result;
  }

  /**
   * Aplica mapeos JSONPath
   */
  private applyMapping(data: any, mapping: Record<string, string>): any {
    const result: any = {};

    for (const [targetPath, sourcePath] of Object.entries(mapping)) {
      try {
        const values = JSONPath({ path: sourcePath, json: data });
        if (values.length > 0) {
          this.setValueByPath(result, targetPath, values[0]);
        }
      } catch (error) {
        // Ignorar errores de JSONPath inválido
      }
    }

    return result;
  }

  /**
   * Aplica transformaciones de datos
   */
  private applyTransformations(
    data: any,
    transformations: { field: string; operation: string; params?: any }[]
  ): any {
    const result = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const transform of transformations) {
      try {
        const values = JSONPath({ path: transform.field, json: result });
        for (let i = 0; i < values.length; i++) {
          const transformedValue = this.applyTransformation(
            values[i],
            transform.operation,
            transform.params
          );
          this.setValueByPath(result, transform.field, transformedValue);
        }
      } catch (error) {
        // Ignorar errores de transformación
      }
    }

    return result;
  }

  /**
   * Aplica una transformación específica
   */
  private applyTransformation(value: any, operation: string, params?: any): any {
    switch (operation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'format_date':
        return this.formatDate(value, params?.format || 'ISO');
      case 'parse_number':
        return this.parseNumber(value);
      case 'custom':
        return this.applyCustomTransformation(value, params);
      default:
        return value;
    }
  }

  /**
   * Valida sintaxis básica de JSONPath
   */
  private isValidJSONPathSyntax(expression: string): boolean {
    // Validaciones básicas de sintaxis
    const invalidPatterns = [
      /\[\s*\]/, // Brackets vacíos
      /\[\s*[^\]]*[^\d\]'"\s][^\]]*\]/, // Brackets con contenido inválido
      /\.\s*\./, // Doble punto
      /\$\s*[^.\[]/, // $ no seguido de . o [
    ];

    return !invalidPatterns.some(pattern => pattern.test(expression));
  }

  /**
   * Establece un valor usando JSONPath
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    // Implementación simplificada para establecer valores
    const parts = path.replace(/^\$\./, '').split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Elimina un valor usando JSONPath
   */
  private deleteValueByPath(obj: any, path: string): void {
    // Implementación simplificada para eliminar valores
    const parts = path.replace(/^\$\./, '').split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        return; // Path no existe
      }
      current = current[part];
    }
    
    delete current[parts[parts.length - 1]];
  }

  /**
   * Valida campos comunes de webhook
   */
  private validateCommonWebhookFields(payload: any, result: ValidationResult): void {
    // Verificar timestamp
    if (!payload.timestamp && !payload.created_at && !payload.time) {
      result.warnings.push('Webhook no contiene campo de timestamp');
    }

    // Verificar ID de evento
    if (!payload.id && !payload.event_id && !payload.uuid) {
      result.warnings.push('Webhook no contiene identificador único');
    }

    // Verificar tipo de evento
    if (!payload.type && !payload.event && !payload.action) {
      result.warnings.push('Webhook no especifica tipo de evento');
    }
  }

  /**
   * Valida campos comunes de respuesta API
   */
  private validateCommonApiFields(response: any, result: ValidationResult): void {
    // Verificar estructura de error
    if (response.error && !response.message) {
      result.warnings.push('Respuesta de error sin mensaje descriptivo');
    }

    // Verificar paginación
    if (Array.isArray(response.data) && !response.pagination && !response.meta) {
      result.warnings.push('Respuesta con array de datos sin información de paginación');
    }
  }

  /**
   * Formatea fecha
   */
  private formatDate(value: any, format: string): any {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return value; // No es una fecha válida
      }

      switch (format) {
        case 'ISO':
          return date.toISOString();
        case 'timestamp':
          return date.getTime();
        case 'date':
          return date.toISOString().split('T')[0];
        default:
          return date.toISOString();
      }
    } catch {
      return value;
    }
  }

  /**
   * Parsea número
   */
  private parseNumber(value: any): any {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? value : parsed;
    }
    
    return value;
  }

  /**
   * Aplica transformación personalizada
   */
  private applyCustomTransformation(value: any, params: any): any {
    // Implementación básica para transformaciones personalizadas
    if (params && params.function) {
      try {
        // Evaluar función personalizada de forma segura
        // En un entorno de producción, esto debería ser más restrictivo
        return new Function('value', `return ${params.function}`)(value);
      } catch {
        return value;
      }
    }
    
    return value;
  }
}