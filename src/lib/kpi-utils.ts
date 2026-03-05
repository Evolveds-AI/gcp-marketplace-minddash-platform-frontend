/**
 * KPI Utilities
 * Functions to extract and calculate KPIs from chart data
 */

import { KPIData, KPITrend } from '@/components/canvas/KPICard';

export interface ChartSeriesData {
  name?: string;
  data: number[];
  type?: string;
}

export interface EChartsOption {
  series?: ChartSeriesData[];
  xAxis?: { data?: string[] } | { data?: string[] }[];
  title?: { text?: string };
  [key: string]: any;
}

/**
 * Extract KPIs from ECharts option data
 */
export function extractKPIsFromChart(option: EChartsOption, chartName?: string): KPIData[] {
  const kpis: KPIData[] = [];
  const series = option.series || [];
  
  series.forEach((s, index) => {
    if (!s.data || s.data.length === 0) return;
    
    const data = s.data.filter((v): v is number => typeof v === 'number');
    if (data.length === 0) return;
    
    const currentValue = data[data.length - 1];
    const previousValue = data.length > 1 ? data[data.length - 2] : undefined;
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const max = Math.max(...data);
    const min = Math.min(...data);
    
    // Calculate trend
    let trend: KPITrend = 'neutral';
    let trendValue: number | undefined;
    
    if (previousValue !== undefined && previousValue !== 0) {
      const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      trendValue = change;
      trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    }
    
    // Create KPI for latest value
    kpis.push({
      id: `${chartName || 'chart'}-${index}-latest`,
      title: s.name || `Serie ${index + 1}`,
      value: currentValue,
      previousValue,
      format: 'compact',
      trend,
      trendValue,
      trendLabel: 'vs anterior',
      sparkline: data.slice(-10), // Last 10 points
    });
  });
  
  return kpis;
}

/**
 * Extract numeric values from various ECharts data formats
 */
function extractNumericValues(data: any[]): number[] {
  const values: number[] = [];
  
  data.forEach((item) => {
    if (typeof item === 'number') {
      values.push(item);
    } else if (Array.isArray(item)) {
      // Handle [x, y] or [name, value] format
      item.forEach((v) => {
        if (typeof v === 'number') values.push(v);
      });
    } else if (item && typeof item === 'object') {
      // Handle { value: number } or { value: [x, y] } format
      if (typeof item.value === 'number') {
        values.push(item.value);
      } else if (Array.isArray(item.value)) {
        item.value.forEach((v: any) => {
          if (typeof v === 'number') values.push(v);
        });
      }
    }
  });
  
  return values;
}

/**
 * Create summary KPIs from multiple charts
 */
export function createSummaryKPIs(charts: { name: string; option: EChartsOption }[]): KPIData[] {
  const summaryKPIs: KPIData[] = [];
  
  let totalDataPoints = 0;
  let totalSum = 0;
  let allValues: number[] = [];
  
  charts.forEach((chart) => {
    const series = chart.option.series || [];
    series.forEach((s: any) => {
      if (!s.data) return;
      const data = extractNumericValues(s.data);
      totalDataPoints += data.length;
      totalSum += data.reduce((a, b) => a + b, 0);
      allValues = [...allValues, ...data];
    });
  });
  
  if (allValues.length > 0) {
    // Total KPI
    summaryKPIs.push({
      id: 'summary-total',
      title: 'Total General',
      value: totalSum,
      format: 'compact',
      trend: 'neutral',
    });
    
    // Average KPI
    summaryKPIs.push({
      id: 'summary-avg',
      title: 'Promedio',
      value: totalSum / allValues.length,
      format: 'compact',
      trend: 'neutral',
    });
    
    // Max KPI
    summaryKPIs.push({
      id: 'summary-max',
      title: 'Máximo',
      value: Math.max(...allValues),
      format: 'compact',
      trend: 'up',
    });
    
    // Data points count
    summaryKPIs.push({
      id: 'summary-count',
      title: 'Registros',
      value: totalDataPoints,
      format: 'number',
      trend: 'neutral',
    });
  }
  
  return summaryKPIs;
}

/**
 * Calculate period-over-period comparison
 */
export function calculatePeriodComparison(
  currentPeriodData: number[],
  previousPeriodData: number[]
): { change: number; trend: KPITrend } {
  if (currentPeriodData.length === 0 || previousPeriodData.length === 0) {
    return { change: 0, trend: 'neutral' };
  }
  
  const currentSum = currentPeriodData.reduce((a, b) => a + b, 0);
  const previousSum = previousPeriodData.reduce((a, b) => a + b, 0);
  
  if (previousSum === 0) {
    return { change: 0, trend: 'neutral' };
  }
  
  const change = ((currentSum - previousSum) / Math.abs(previousSum)) * 100;
  const trend: KPITrend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  return { change, trend };
}

/**
 * Format KPI value based on magnitude
 */
export function autoFormatKPI(value: number): { formatted: string; suffix: string } {
  if (Math.abs(value) >= 1_000_000_000) {
    return { formatted: (value / 1_000_000_000).toFixed(1), suffix: 'B' };
  }
  if (Math.abs(value) >= 1_000_000) {
    return { formatted: (value / 1_000_000).toFixed(1), suffix: 'M' };
  }
  if (Math.abs(value) >= 1_000) {
    return { formatted: (value / 1_000).toFixed(1), suffix: 'K' };
  }
  return { formatted: value.toFixed(0), suffix: '' };
}
