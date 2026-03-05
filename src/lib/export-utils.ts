/**
 * Export utilities for MindDash Canvas
 * Focused on analytics professionals - CSV/Excel exports for data analysis
 */

export type ExportFormat = 'csv' | 'xlsx' | 'png' | 'jpg';

export interface ExportOptions {
  filename?: string;
  format: ExportFormat;
  includeHeaders?: boolean;
  sheetName?: string;
}

export interface ChartDataRow {
  [key: string]: string | number | null;
}

/**
 * Extract tabular data from ECharts option
 * Handles various chart types: bar, line, pie, scatter, etc.
 */
export function extractDataFromEChartsOption(option: Record<string, any>): {
  headers: string[];
  rows: ChartDataRow[];
} {
  const headers: string[] = [];
  const rows: ChartDataRow[] = [];

  // Get x-axis categories if available
  const xAxisData = option.xAxis?.data || option.xAxis?.[0]?.data || [];
  const hasCategories = xAxisData.length > 0;

  if (hasCategories) {
    headers.push(option.xAxis?.name || 'Categoría');
  }

  // Extract series data
  const series = option.series || [];
  
  if (series.length === 0) {
    return { headers, rows };
  }

  // Add series names as headers
  series.forEach((s: any) => {
    headers.push(s.name || 'Valor');
  });

  // Handle different chart types
  const firstSeries = series[0];
  
  if (firstSeries.type === 'pie') {
    // Pie chart: data is [{name, value}, ...]
    headers.length = 0;
    headers.push('Nombre', 'Valor');
    
    const pieData = firstSeries.data || [];
    pieData.forEach((item: any) => {
      rows.push({
        'Nombre': item.name || '',
        'Valor': item.value ?? null,
      });
    });
  } else if (hasCategories) {
    // Bar/Line charts with categories
    const maxLength = Math.max(
      xAxisData.length,
      ...series.map((s: any) => (s.data || []).length)
    );

    for (let i = 0; i < maxLength; i++) {
      const row: ChartDataRow = {};
      row[headers[0]] = xAxisData[i] ?? '';
      
      series.forEach((s: any, seriesIdx: number) => {
        const seriesData = s.data || [];
        const value = seriesData[i];
        // Handle array values like [x, y] for scatter plots
        const cellValue = Array.isArray(value) ? value[1] : value;
        row[headers[seriesIdx + 1]] = cellValue ?? null;
      });
      
      rows.push(row);
    }
  } else {
    // Scatter or other charts without categories
    headers.length = 0;
    headers.push('X', 'Y');
    if (series.length > 1) {
      headers.push('Serie');
    }

    series.forEach((s: any) => {
      const seriesData = s.data || [];
      seriesData.forEach((point: any) => {
        const row: ChartDataRow = {};
        if (Array.isArray(point)) {
          row['X'] = point[0] ?? null;
          row['Y'] = point[1] ?? null;
        } else if (typeof point === 'object') {
          row['X'] = point.value?.[0] ?? point.x ?? null;
          row['Y'] = point.value?.[1] ?? point.y ?? null;
        } else {
          row['X'] = null;
          row['Y'] = point ?? null;
        }
        if (series.length > 1) {
          row['Serie'] = s.name || '';
        }
        rows.push(row);
      });
    });
  }

  return { headers, rows };
}

/**
 * Convert data to CSV string
 */
export function dataToCSV(headers: string[], rows: ChartDataRow[]): string {
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => 
    headers.map(h => escapeCSV(row[h])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Convert data to XLSX using SheetJS-style format
 * Returns a Blob for download
 */
export async function dataToXLSX(
  headers: string[], 
  rows: ChartDataRow[], 
  sheetName: string = 'Datos'
): Promise<Blob> {
  // Dynamic import of xlsx library
  const XLSX = await import('xlsx');
  
  // Convert to array of arrays format
  const aoa: any[][] = [headers];
  rows.forEach(row => {
    aoa.push(headers.map(h => row[h] ?? ''));
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLength = Math.max(
      h.length,
      ...rows.map(row => String(row[h] ?? '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const xlsxBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  return new Blob([xlsxBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Download a file from a Blob or string
 */
export function downloadFile(
  content: Blob | string, 
  filename: string, 
  mimeType?: string
): void {
  let blob: Blob;
  
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType || 'text/plain' });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export chart data to CSV
 */
export function exportToCSV(
  option: Record<string, any>, 
  filename: string = 'datos'
): void {
  const { headers, rows } = extractDataFromEChartsOption(option);
  const csv = dataToCSV(headers, rows);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export chart data to Excel
 */
export async function exportToXLSX(
  option: Record<string, any>, 
  filename: string = 'datos',
  sheetName: string = 'Datos'
): Promise<void> {
  const { headers, rows } = extractDataFromEChartsOption(option);
  const blob = await dataToXLSX(headers, rows, sheetName);
  downloadFile(blob, `${filename}.xlsx`);
}

/**
 * Export multiple charts to a single Excel file (multiple sheets)
 */
export async function exportMultipleToXLSX(
  charts: Array<{ option: Record<string, any>; name: string }>,
  filename: string = 'reporte'
): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  charts.forEach(({ option, name }, index) => {
    const { headers, rows } = extractDataFromEChartsOption(option);
    
    const aoa: any[][] = [headers];
    rows.forEach(row => {
      aoa.push(headers.map(h => row[h] ?? ''));
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    // Auto-width columns
    const colWidths = headers.map((h, i) => {
      const maxLength = Math.max(
        h.length,
        ...rows.map(row => String(row[h] ?? '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = colWidths;

    // Sheet name max 31 chars, no special chars
    const sheetName = (name || `Hoja${index + 1}`)
      .slice(0, 31)
      .replace(/[\\\/\*\?\[\]:]/g, '_');
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const xlsxBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  const blob = new Blob([xlsxBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  downloadFile(blob, `${filename}.xlsx`);
}

/**
 * Capture a DOM element as an image
 */
export async function captureElementAsImage(
  element: HTMLElement,
  format: 'png' | 'jpg' = 'png',
  scale: number = 2
): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#0c0c0c',
    scale,
    useCORS: true,
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      format === 'jpg' ? 'image/jpeg' : 'image/png',
      format === 'jpg' ? 0.95 : undefined
    );
  });
}

/**
 * Export canvas element to image file
 */
export async function exportElementToImage(
  element: HTMLElement,
  filename: string = 'canvas',
  format: 'png' | 'jpg' = 'png'
): Promise<void> {
  const blob = await captureElementAsImage(element, format);
  downloadFile(blob, `${filename}.${format}`);
}
