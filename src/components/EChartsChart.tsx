'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import * as echarts from 'echarts';
import waldenTheme from '@/lib/echarts/theme.json';
import { FiMaximize2, FiMinimize2, FiDownload, FiRefreshCw, FiFileText, FiGrid } from '@/lib/icons';
import { exportToCSV, exportToXLSX } from '@/lib/export-utils';

let waldenRegistered = false;

function formatAbbreviated(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toString();
}

function formatFullNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  return value.toLocaleString('es-CL');
}

type Props = {
  option: Record<string, any>;
  width?: number | string;
  height?: number | string;
  className?: string;
  title?: string;
  showToolbar?: boolean;
  onRefresh?: () => void;
};

export default function EChartsChart({
  option,
  width = '100%',
  height = 320,
  className = '',
  title,
  showToolbar = true,
  onRefresh,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuId = useId();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const stableOption = useMemo(() => option, [option]);

  const enhancedOption = useMemo(() => {
    const enhancedSeries = (stableOption.series || []).map((s: any) => ({
      ...s,
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          const val = typeof params === 'object' ? (params.value ?? params.data) : params;
          const numVal = typeof val === 'number' ? val : (Array.isArray(val) ? val[1] : parseFloat(val));
          if (isNaN(numVal)) return '';
          return formatAbbreviated(numVal);
        },
        fontSize: 11,
        color: '#333',
        ...(s.label || {}),
      },
    }));

    // Enhance xAxis for better label display
    const enhancedXAxis = stableOption.xAxis ? {
      ...stableOption.xAxis,
      axisLabel: {
        rotate: 30,
        fontSize: 10,
        color: '#888',
        overflow: 'truncate',
        width: 80,
        ...(stableOption.xAxis?.axisLabel || {}),
      },
    } : undefined;

    // Enhance yAxis for abbreviated numbers
    const enhancedYAxis = stableOption.yAxis ? {
      ...stableOption.yAxis,
      axisLabel: {
        fontSize: 10,
        color: '#888',
        formatter: (value: number) => formatAbbreviated(value),
        ...(stableOption.yAxis?.axisLabel || {}),
      },
    } : undefined;

    return {
      ...stableOption,
      series: enhancedSeries,
      xAxis: enhancedXAxis,
      yAxis: enhancedYAxis,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderColor: '#333',
        textStyle: { color: '#fff', fontSize: 12 },
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#666' },
          lineStyle: { color: '#3b82f6', type: 'dashed' },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) params = [params];
          const lines = params.map((p: any) => {
            const marker = p.marker || '';
            const name = p.seriesName || '';
            const rawVal = p.value ?? p.data;
            const numVal = typeof rawVal === 'number' ? rawVal : (Array.isArray(rawVal) ? rawVal[1] : parseFloat(rawVal));
            const val = formatFullNumber(numVal);
            return `${marker} ${name}: <strong>${val}</strong>`;
          });
          const axisLabel = params[0]?.axisValueLabel || params[0]?.name || '';
          return `<div style="font-weight:600;margin-bottom:4px">${axisLabel}</div>${lines.join('<br/>')}`;
        },
        confine: true,
        ...(stableOption.tooltip || {}),
      },
      grid: {
        containLabel: true,
        left: 16,
        right: 16,
        top: title ? 48 : 32,
        bottom: 48,
        ...(stableOption.grid || {}),
      },
      dataZoom: stableOption.dataZoom ?? [
        {
          type: 'inside',
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
      ],
    };
  }, [stableOption, title]);

  useEffect(() => {
    if (!elRef.current) return;

    if (!waldenRegistered) {
      echarts.registerTheme('walden', waldenTheme as any);
      waldenRegistered = true;
    }

    const chart = echarts.init(elRef.current, 'walden');
    chartRef.current = chart;

    chart.setOption(enhancedOption, { notMerge: true });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(elRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [enhancedOption]);

  const handleDownloadImage = useCallback(() => {
    if (!chartRef.current) return;
    const url = chartRef.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#0c0c0c',
    });
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'chart'}-${Date.now()}.png`;
    link.click();
  }, [title]);

  const handleExportCSV = useCallback(() => {
    const filename = (title || 'datos').replace(/[^a-zA-Z0-9-_]/g, '_');
    exportToCSV(stableOption, filename);
    setShowExportMenu(false);
  }, [stableOption, title]);

  const handleExportXLSX = useCallback(async () => {
    const filename = (title || 'datos').replace(/[^a-zA-Z0-9-_]/g, '_');
    await exportToXLSX(stableOption, filename, title || 'Datos');
    setShowExportMenu(false);
  }, [stableOption, title]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => chartRef.current?.resize(), 100);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowExportMenu(false);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showExportMenu]);

  return (
    <div
      ref={containerRef}
      className={`relative group ${isFullscreen ? 'bg-[#0c0c0c] p-4' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsHovered(false);
        }
      }}
    >
      {showToolbar && (
        <div
          className={`absolute top-2 right-2 z-10 flex items-center gap-1 transition-opacity duration-200 ${
            isHovered || isFullscreen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          )}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              title="Exportar datos"
              aria-label="Exportar datos"
              aria-haspopup="menu"
              aria-expanded={showExportMenu}
              aria-controls={exportMenuId}
            >
              <FiDownload className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div 
                id={exportMenuId}
                role="menu"
                aria-label="Opciones de exportación"
                className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px] z-20"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportXLSX}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <FiGrid className="w-3.5 h-3.5 text-green-400" />
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <FiFileText className="w-3.5 h-3.5 text-yellow-400" />
                  CSV (.csv)
                </button>
                <div className="border-t border-gray-700 my-1" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { handleDownloadImage(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <FiDownload className="w-3.5 h-3.5 text-purple-400" />
                  Imagen (.png)
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
          </button>
        </div>
      )}
      <div
        ref={elRef}
        className="cursor-crosshair"
        role="img"
        aria-label={title ? `Gráfico: ${title}` : 'Gráfico'}
        style={{ width: isFullscreen ? '100%' : width, height: isFullscreen ? '100vh' : height }}
      />
    </div>
  );
}
