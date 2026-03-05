// Utilidades para convertir datos de gráficos desde diferentes formatos
// hacia el formato requerido por las librerías de gráficos

export interface ParsedChartData {
  time: string | number;
  value: number;
  label?: string;
}

export interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'candlestick';
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
}

// Función principal para extraer datos de URLs de QuickChart
export function parseQuickChartUrl(url: string): { data: ParsedChartData[]; config: ChartConfig } | null {
  try {
    // Parseando URL de QuickChart
    
    // Extraer la configuración de la URL de QuickChart
    const urlObj = new URL(url);
    const chartParam = urlObj.searchParams.get('c') || urlObj.searchParams.get('chart');
    
    // Parámetro de configuración encontrado
    
    if (!chartParam) {
      throw new Error('No se encontró configuración del gráfico en la URL');
    }

    // Decodificar la configuración JSON con validación
    let decodedParam;
    try {
      decodedParam = decodeURIComponent(chartParam);
    } catch (decodeError) {
      console.error('[Parser] Error decodificando URL:', decodeError);
      throw new Error('URL malformada - no se puede decodificar');
    }
    
    // Validar que el JSON decodificado sea válido
    if (!decodedParam || decodedParam.trim().length === 0) {
      throw new Error('Configuración de gráfico vacía después de decodificar');
    }
    
    // Intentar reparar JSON truncado o malformado
    let cleanedJson = decodedParam.trim();
    
    // Si el JSON está incompleto, intentar cerrarlo de manera más inteligente
    if (!cleanedJson.endsWith('}') && !cleanedJson.endsWith(']')) {
      console.warn('[Parser] JSON parece estar truncado, intentando reparar');
      
      // Buscar el último objeto o array abierto y cerrarlo
      const openBraces = (cleanedJson.match(/\{/g) || []).length;
      const closeBraces = (cleanedJson.match(/\}/g) || []).length;
      const openBrackets = (cleanedJson.match(/\[/g) || []).length;
      const closeBrackets = (cleanedJson.match(/\]/g) || []).length;
      
      // Si hay strings sin cerrar, intentar cerrarlas
      const unclosedStrings = (cleanedJson.match(/[^\\]"/g) || []).length % 2;
      if (unclosedStrings !== 0) {
        cleanedJson += '"';
      }
      
      // Agregar comas faltantes si es necesario
      const lastChar = cleanedJson.trim().slice(-1);
      if (lastChar && ![':', ',', '{', '[', '"'].includes(lastChar)) {
        // Si el último carácter no es válido para terminar un valor, agregar comillas
        if (!/[0-9\]\}]/.test(lastChar)) {
          cleanedJson += '"';
        }
      }
      
      // Cerrar arrays primero, luego objetos
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        cleanedJson += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        cleanedJson += '}';
      }
      
      console.warn('[Parser] JSON reparado:', cleanedJson.slice(-50));
    }
    
    let chartConfig;
    try {
      chartConfig = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('[Parser] Error parseando JSON reparado:', parseError);
      console.warn('[Parser] JSON problemático:', cleanedJson.slice(-100));
      
      // Intentar reparación más agresiva del JSON
      try {
        // Buscar el último objeto válido antes del error
        let validJson = cleanedJson;
        
        // Intentar encontrar el último punto válido del JSON
        const errorMatch = (parseError as Error).toString().match(/position (\d+)/);
        if (errorMatch) {
          const errorPosition = parseInt(errorMatch[1]);
          validJson = cleanedJson.substring(0, errorPosition);
          
          // Cerrar el JSON truncado de manera inteligente
          const openBraces = (validJson.match(/\{/g) || []).length;
          const closeBraces = (validJson.match(/\}/g) || []).length;
          const openBrackets = (validJson.match(/\[/g) || []).length;
          const closeBrackets = (validJson.match(/\]/g) || []).length;
          
          // Remover caracteres inválidos al final
          validJson = validJson.replace(/[,\s]*$/, '');
          
          // Cerrar arrays y objetos abiertos
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            validJson += ']';
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            validJson += '}';
          }
          
          console.warn('[Parser] Intentando JSON reparado:', validJson.slice(-50));
          chartConfig = JSON.parse(validJson);
        } else {
          throw parseError;
        }
      } catch (repairError) {
        console.error('[Parser] Error en reparación avanzada:', repairError);
        
        // Fallback: crear un gráfico básico con datos de ejemplo
        return {
          data: [{
            time: 'Sin datos',
            value: 0,
            label: 'Sin datos'
          }],
          config: {
            type: 'bar',
            title: 'Error al cargar datos del gráfico'
          }
        };
      }
    }
    
    return extractDataFromQuickChartConfig(chartConfig);
  } catch (error) {
    console.error('[Parser] Error general parseando URL de QuickChart:', error);
    return null;
  }
}

// Extraer datos de la configuración de QuickChart
function extractDataFromQuickChartConfig(config: Record<string, unknown>): { data: ParsedChartData[]; config: ChartConfig } {
  const result: ParsedChartData[] = [];
  let chartType: 'line' | 'area' | 'bar' | 'candlestick' = 'line';
  let title = '';
  let xAxisLabel = '';
  let yAxisLabel = '';

  try {
    // Extraer título
    if (config.options && typeof config.options === 'object' && 
        'plugins' in config.options && config.options.plugins &&
        typeof config.options.plugins === 'object' && 
        'title' in config.options.plugins && config.options.plugins.title &&
        typeof config.options.plugins.title === 'object' &&
        'text' in config.options.plugins.title) {
      title = String(config.options.plugins.title.text);
    }

    // Extraer etiquetas de ejes
    if (config.options && typeof config.options === 'object' && 
        'scales' in config.options && config.options.scales &&
        typeof config.options.scales === 'object' && 
        'x' in config.options.scales && config.options.scales.x &&
        typeof config.options.scales.x === 'object' &&
        'title' in config.options.scales.x && config.options.scales.x.title &&
        typeof config.options.scales.x.title === 'object' &&
        'text' in config.options.scales.x.title) {
      xAxisLabel = String(config.options.scales.x.title.text);
    }
    if (config.options && typeof config.options === 'object' && 
        'scales' in config.options && config.options.scales &&
        typeof config.options.scales === 'object' && 
        'y' in config.options.scales && config.options.scales.y &&
        typeof config.options.scales.y === 'object' &&
        'title' in config.options.scales.y && config.options.scales.y.title &&
        typeof config.options.scales.y.title === 'object' &&
        'text' in config.options.scales.y.title) {
      yAxisLabel = String(config.options.scales.y.title.text);
    }

    // Determinar tipo de gráfico
    if (config.type && typeof config.type === 'string') {
      switch (config.type.toLowerCase()) {
        case 'bar':
        case 'horizontalbar':
          chartType = 'bar';
          break;
        case 'line':
          chartType = 'line';
          break;
        case 'area':
          chartType = 'area';
          break;
        default:
          chartType = 'line';
      }
    }

    // Extraer datos de las series
    if (config.data && typeof config.data === 'object' && 
        'datasets' in config.data && Array.isArray(config.data.datasets) && 
        config.data.datasets.length > 0) {
      const labels = ('labels' in config.data && Array.isArray(config.data.labels)) ? config.data.labels : [];
      const dataset = config.data.datasets[0]; // Usar el primer dataset
      const dataValues = (dataset && typeof dataset === 'object' && 'data' in dataset && Array.isArray(dataset.data)) ? dataset.data : [];

      for (let i = 0; i < Math.min(labels.length, dataValues.length); i++) {
        result.push({
          time: labels[i] || i,
          value: Number(dataValues[i]) || 0,
          label: labels[i]
        });
      }
    }

    return {
      data: result,
      config: {
        type: chartType,
        title,
        xAxisLabel,
        yAxisLabel
      }
    };
  } catch (error) {
    console.error('Error extrayendo datos de configuración QuickChart:', error);
    throw new Error('Formato de configuración de gráfico no válido');
  }
}

// Función para parsear datos de texto/respuesta de IA
export function parseChartDataFromText(text: string): { data: ParsedChartData[]; config: ChartConfig } | null {
  try {
    // Buscar patrones comunes de datos en texto
    const patterns = [
      // Formato: "Producto A: 150, Producto B: 200, Producto C: 75"
      /([^:,]+):\s*(\d+(?:\.\d+)?)/g,
      // Formato: "2023: 150, 2024: 200"
      /(\d{4}):\s*(\d+(?:\.\d+)?)/g,
      // Formato: "Enero 150, Febrero 200"
      /([A-Za-z]+)\s+(\d+(?:\.\d+)?)/g
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length >= 2) {
        const data: ParsedChartData[] = matches.map((match, index) => ({
          time: match[1].trim(),
          value: parseFloat(match[2]),
          label: match[1].trim()
        }));

        return {
          data,
          config: {
            type: 'bar', // Por defecto para datos categóricos
            title: 'Datos extraídos'
          }
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parseando datos de texto:', error);
    return null;
  }
}

// Función para convertir datos simples a formato de gráfico
export function convertSimpleDataToChart(
  values: number[], 
  labels?: string[],
  type: 'line' | 'area' | 'bar' = 'line'
): { data: ParsedChartData[]; config: ChartConfig } {
  const data: ParsedChartData[] = values.map((value, index) => ({
    time: labels?.[index] || index,
    value: Number(value) || 0,
    label: labels?.[index]
  }));

  return {
    data,
    config: {
      type,
      title: 'Gráfico de datos'
    }
  };
}

// Función para detectar y parsear automáticamente cualquier formato
export function autoParseChartData(input: string | Record<string, unknown>): { data: ParsedChartData[]; config: ChartConfig } | null {
  // Iniciando análisis de datos
  
  // Si es una URL de QuickChart
  if (typeof input === 'string' && input.includes('quickchart.io')) {
    // Detectada URL de QuickChart
    return parseQuickChartUrl(input);
  }

  // Si es texto con datos
  if (typeof input === 'string') {
    // Detectado texto, intentando parsear datos
    return parseChartDataFromText(input);
  }

  // Si es un objeto con datos ya estructurados
  if (typeof input === 'object' && input.data && Array.isArray(input.data)) {
    // Detectado objeto con datos estructurados
    return {
      data: input.data,
      config: (input.config && typeof input.config === 'object' && 'type' in input.config) 
        ? input.config as ChartConfig 
        : { type: 'line' }
    };
  }

  // Si es un array de números
  if (Array.isArray(input) && input.every(item => typeof item === 'number')) {
    // Detectado array de números
    return convertSimpleDataToChart(input as number[]);
  }

  // No se pudo identificar el formato de los datos
  return null;
}

// Función de utilidad para limpiar y validar datos
export function validateAndCleanChartData(data: ParsedChartData[]): ParsedChartData[] {
  return data
    .filter(point => point.value !== null && point.value !== undefined && !isNaN(point.value))
    .sort((a, b) => {
      // Intentar ordenar por tiempo si es posible
      if (typeof a.time === 'number' && typeof b.time === 'number') {
        return a.time - b.time;
      }
      return 0;
    });
}