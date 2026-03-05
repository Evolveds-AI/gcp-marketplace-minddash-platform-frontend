// Utilidades para mejorar mensajes y forzar generación de gráficos

/**
 * Convierte consultas de "comparativo" a formatos que el bot externo reconoce mejor para generar gráficos
 */
export function enhanceMessageForCharts(message: string, needChart: boolean = true): string {
  if (!needChart) return message;

  let enhancedMessage = message;
  
  // Detectar y convertir consultas de "comparativo" y "ranking/top"
  const comparativoPatterns = [
    /\bcomparativo\b/gi,
    /\bcomparación\b/gi,
    /\bcompara\b/gi,
    /\bcomparar\b/gi,
    /\bdiferencia\b/gi,
    /\bvs\b/gi,
    /\bversus\b/gi,
    /\bentre.*y\b/gi,
    /\bentre.*\d{4}.*y.*\d{4}\b/gi, // Para patrones como "entre 2024 y 2025"
    /\bdel.*\d{4}.*al.*\d{4}\b/gi,  // Para "del 2024 al 2025"
    /\bentre.*enero.*febrero\b/gi,  // Para meses
    /\bperiodo.*\d{4}\b/gi,         // Para "periodo 2024"
    /\banalisis.*temporal\b/gi,     // Para análisis temporal
    /\bevolucion\b/gi,              // Para evolución
    /\btendencia\b/gi,              // Para tendencia
    /\btop\s+\d+\b/gi,              // Para "top 5", "top 10", etc.
    /\branking\b/gi,                // Para "ranking"
    /\bmejor(es)?\b/gi,             // Para "mejor", "mejores"
    /\bpeor(es)?\b/gi,              // Para "peor", "peores"
    /\blistado\b/gi,                // Para "listado"
    /\bvendedor(es)?\b/gi           // Para "vendedor", "vendedores"
  ];

  const hasComparativo = comparativoPatterns.some(pattern => pattern.test(message));
  
  if (hasComparativo) {
    // Convertir "comparativo" a "ranking" para forzar gráficos
    enhancedMessage = enhancedMessage
      .replace(/\bcomparativo\b/gi, 'ranking comparativo')
      .replace(/\bcomparación\b/gi, 'listado comparativo')
      .replace(/\bcompara\b/gi, 'muestra en ranking')
      .replace(/\bcomparar\b/gi, 'listar para comparar')
      .replace(/\bdiferencia.*entre\b/gi, 'ranking que compare')
      .replace(/\bvs\b/gi, 'comparado con')
      .replace(/\bversus\b/gi, 'comparado con')
      .replace(/\bentre.*(\d{4}).*y.*(\d{4})\b/gi, 'ranking de datos entre $1 y $2')
      .replace(/\bdel.*(\d{4}).*al.*(\d{4})\b/gi, 'listado desde $1 hasta $2')
      .replace(/\bevolucion\b/gi, 'ranking de evolución')
      .replace(/\btendencia\b/gi, 'análisis de tendencia en ranking');
    
    // Instrucción específica para gráficos comparativos/temporales
    enhancedMessage += "\n\nIMPORTANTE: DEBE GENERAR GRÁFICO OBLIGATORIAMENTE. Crear gráfico de barras (bar chart) con los datos numéricos proporcionados. Incluir chart_url en la respuesta. Los datos deben visualizarse como gráfico automáticamente. NO solo mencionar que se puede generar, sino GENERARLO.";
  } else {
    // Para otros tipos de consultas, agregar instrucción general
    enhancedMessage += "\n\nIMPORTANTE: Si los datos contienen números, estadísticas, rankings o tendencias, GENERAR gráfico automáticamente (bar, line, area, pie). Incluir chart_url en la respuesta.";
  }

  return enhancedMessage;
}

/**
 * Detecta si un mensaje requiere visualización de datos
 */
export function shouldGenerateChart(message: string): boolean {
  const chartTriggers = [
    /\btop\b/gi,
    /\blistado\b/gi,
    /\branking\b/gi,
    /\bmejor/gi,
    /\bpeor/gi,
    /\bcomparativo\b/gi,
    /\bestadística/gi,
    /\bdatos\b/gi,
    /\bnúmero/gi,
    /\bcantidad/gi,
    /\btotal\b/gi,
    /\bventas\b/gi,
    /\bingresos\b/gi,
    /\bevolución\b/gi,
    /\btendencia\b/gi,
    /\bgráfico\b/gi,
    /\bchart\b/gi,
    /\bvisualiz/gi
  ];

  return chartTriggers.some(pattern => pattern.test(message));
}

/**
 * Limpia URLs de gráficos del texto de respuesta para evitar duplicación
 */
export function cleanChartUrlsFromResponse(text: string): string {
  if (!text) return text;
  
  return text
    // Eliminar URLs de quickchart.io del texto
    .replace(/\[https:\/\/quickchart\.io\/chart\?[^\]]+\]/g, '')
    .replace(/\(https:\/\/quickchart\.io\/chart\?[^\)]+\)/g, '')
    .replace(/https:\/\/quickchart\.io\/chart\?[^\s\)]+/g, '')
    // Limpiar referencias al gráfico en el texto
    .replace(/Aquí tienes un gráfico[^:]*:\s*/gi, '')
    .replace(/Aquí está el gráfico[^:]*:\s*/gi, '')
    .replace(/Ver gráfico[^:]*:\s*/gi, '')
    .replace(/Gráfico[^:]*:\s*/gi, '')
    .replace(/Aquí tienes una visualización.*$/gim, '')
    .replace(/Para una mejor visualización.*$/gim, '')
    .replace(/Puedes visualizar.*$/gim, '')
    .replace(/visualización de estos datos.*$/gim, '')
    .replace(/datos en un\s*\).*$/gim, '')
    .replace(/en un\s*\).*$/gim, '')
    .replace(/\n\s*Aquí tienes una visualización.*$/gim, '')
    .replace(/\s*Aquí tienes una visualización.*$/gim, '')
    .replace(/Aquí tienes una visualización de estos datos en un.*$/gim, '')
    .replace(/en un\s*$/gim, '')
    // Limpiar mensajes sobre visualizaciones en otras plataformas (más específicos)
    .replace(/\.\s*Sin embargo, los datos proporcionados pueden ser utilizados para crear visualizaciones en otras plataformas\.$/gim, '')
    .replace(/\s*Sin embargo, los datos proporcionados pueden ser utilizados para crear visualizaciones en otras plataformas\.$/gim, '')
    .replace(/\.\s*Además,\s*$/gim, '.')
    .replace(/\s*\.\s*Además\s*$/gim, '.')
    // Limpiar mensajes básicos de incapacidad de generar gráficos
    .replace(/Lamentablemente.*?chart_url/gi, '')
    .replace(/lamento informarte que.*?chart_url/gi, '')
    // Limpiar referencias a chart_url y bloques JSON del bot
    .replace(/chart_url:\s*```json[\s\S]*?```\s*/gi, '')
    .replace(/Aquí tienes el chart_url[\s\S]*?```\s*/gi, '')
    .replace(/A continuación.*?```chart[\s\S]*?```\s*/gi, '')
    .replace(/```chart[\s\S]*?```\s*/gi, '')
    .replace(/\[chart_url:\s*/gi, '')
    .replace(/chart_url:\s*$/gi, '')
    .replace(/chart_url\s*```[\s\S]*?```\s*/gi, '')
    // Limpiar fragmentos de URLs codificadas que aparecen en el texto
    .replace(/Para visualizar estos datos.*?%[A-F0-9]{2}.*?$/gim, '')
    .replace(/puedes ver el\s*\)%[A-F0-9]{2}.*?$/gim, '')
    .replace(/visualizar en un\s*%[A-F0-9]{2}.*?$/gim, '')
    .replace(/%[A-F0-9]{2}[^%\s]*%[A-F0-9]{2}.*?$/gim, '')
    // Limpiar URLs rotas o fragmentadas
    .replace(/\)\s*%22.*?$/gim, '')
    .replace(/ver el\s*\).*?%.*?$/gim, '')
    .replace(/datos.*?\)%.*?$/gim, '')
    // Limpiar líneas vacías y espacios extra
    .replace(/\n\n+/g, '\n\n')
    .trim();
}

/**
 * Extrae datos de tabla markdown para generar gráficos dinámicos
 */
export function extractTableDataForChart(text: string): { labels: string[], data: number[], title: string } | null {
  if (!text) return null;
  
  try {
    // Buscar tablas markdown con patrón de vendedores y ventas
    const tableMatch = text.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\n\s*\|[^\n]*\|\s*\n([\s\S]*?)(?=\n\n|\n$|$)/);
    if (!tableMatch) return null;
    
    const [, header1, header2, tableContent] = tableMatch;
    
    // Verificar si es una tabla de ventas/vendedores
    if (!header1.toLowerCase().includes('vendedor') && !header2.toLowerCase().includes('ventas')) {
      return null;
    }
    
    // Extraer filas de datos
    const rows = tableContent.split('\n').filter(row => row.trim().startsWith('|'));
    const labels: string[] = [];
    const data: number[] = [];
    
    for (const row of rows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 2) {
        const vendedor = cells[0].trim();
        const ventasStr = cells[1].replace(/[\$,\s]/g, '').replace(/USD.*$/, '');
        
        // Convertir a número
        const ventas = parseFloat(ventasStr);
        if (!isNaN(ventas) && vendedor) {
          // Limitar nombre del vendedor para mejor visualización
          const shortName = vendedor.length > 20 ? vendedor.substring(0, 17) + '...' : vendedor;
          labels.push(shortName);
          // Convertir a millones para mejor visualización
          data.push(Math.round(ventas / 1000000 * 100) / 100);
        }
      }
    }
    
    if (labels.length > 0 && data.length > 0) {
      // Determinar título basado en el contenido
      let title = 'Ranking de Vendedores';
      if (text.includes('2025')) title += ' 2025';
      if (text.includes('top 5')) title = 'Top 5 ' + title;
      
      return { labels, data, title };
    }
    
    return null;
  } catch (error) {
    console.log('Error extracting table data:', error);
    return null;
  }
}