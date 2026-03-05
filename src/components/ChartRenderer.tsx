/* eslint-disable react-hooks/rules-of-hooks */
import React, { useMemo, useRef, useState } from 'react';
import { ChartSpec } from '@/lib/types';

type Props = { spec: ChartSpec };

type TooltipState = { visible: boolean; x: number; y: number; label?: string; values?: Array<{ name: string; value: number; color: string }> };

const PALETTE_DEFAULT = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444'];
const AXIS = '#cbd5e1';
const GRID = '#e5e7eb';
const TEXT_DIM = '#475569';

/**
 * Formatea un número según la configuración de meta del nuevo schema
 * Soporta: unit_type, currency, unit_label, value_prefix, value_suffix, decimals
 * Mantiene compatibilidad hacia atrás con el formato antiguo de 'unit'
 */
function formatNumber(value: number, meta?: Record<string, any>): string {
  if (!meta) {
    return abbreviateNumberLegacy(value);
  }

  const {
    unit_type = 'number',
    currency,
    unit_label,
    value_prefix = '',
    value_suffix = '',
    decimals = '0'
  } = meta;

  // Convertir decimals a número
  const decimalsNum = Math.min(6, Math.max(0, parseInt(String(decimals), 10) || 0));

  // Determinar el sufijo según unit_type
  let suffix = value_suffix;
  let prefix = value_prefix;

  if (unit_type === 'currency') {
    // Usar el símbolo de moneda si está disponible
    const currencySymbol = getCurrencySymbol(currency);
    if (currencySymbol && !prefix) {
      prefix = currencySymbol;
    } else if (currency && !prefix && !suffix) {
      suffix = ` ${currency}`;
    }
  } else if (unit_type === 'percent') {
    if (!suffix) suffix = '%';
  } else if (unit_type === 'unit' && unit_label && !suffix) {
    suffix = ` ${unit_label}`;
  }

  // Abreviar números grandes solo para tipos numéricos y currency
  const abs = Math.abs(value);
  let formattedValue: string;

  if (unit_type === 'percent') {
    // Los porcentajes se muestran como están (ya vienen en 0-100)
    formattedValue = value.toFixed(decimalsNum);
  } else if (abs >= 1_000_000_000 && (unit_type === 'number' || unit_type === 'currency')) {
    formattedValue = (value / 1_000_000_000).toFixed(decimalsNum) + 'B';
  } else if (abs >= 1_000_000 && (unit_type === 'number' || unit_type === 'currency')) {
    formattedValue = (value / 1_000_000).toFixed(decimalsNum) + 'M';
  } else if (abs >= 1_000 && (unit_type === 'number' || unit_type === 'currency')) {
    formattedValue = (value / 1_000).toFixed(decimalsNum) + 'K';
  } else {
    formattedValue = value.toFixed(decimalsNum);
    // Remover ceros innecesarios si no hay decimales requeridos
    if (decimalsNum === 0) {
      formattedValue = String(Math.round(value));
    } else {
      formattedValue = parseFloat(formattedValue).toString();
    }
  }

  return `${prefix}${formattedValue}${suffix}`;
}

/**
 * Función legacy para compatibilidad hacia atrás
 */
function abbreviateNumberLegacy(value: number, unit?: string): string {
  const abs = Math.abs(value);
  let suffix = '';
  let prefix = '';
  if (unit === 'USD' || unit === '$') prefix = '$';
  if (unit === '%') suffix = '%';
  let base: string;
  if (abs >= 1_000_000_000) base = (value / 1_000_000_000).toFixed(1) + 'B';
  else if (abs >= 1_000_000) base = (value / 1_000_000).toFixed(1) + 'M';
  else if (abs >= 1_000) base = (value / 1_000).toFixed(1) + 'K';
  else base = String(Math.round(value));
  return `${prefix}${base}${suffix}`;
}

/**
 * Obtiene el símbolo de moneda según el código ISO
 */
function getCurrencySymbol(currency?: string): string {
  if (!currency) return '';
  const symbols: Record<string, string> = {
    'USD': '$',
    'ARS': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'BRL': 'R$',
    'MXN': '$',
  };
  return symbols[currency.toUpperCase()] || '';
}

function truncateLabel(label: string, max = 22): string {
  const s = String(label ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * Calcula valores "bonitos" para el eje Y que sean de la misma familia
 * Por ejemplo: 10k, 20k, 30k, 40k o 0.5m, 1m, 1.5m, 2m, etc.
 */
function calculateNiceYAxisValues(maxValue: number, numTicks: number = 4): number[] {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  
  // Calcular el paso ideal
  const rawStep = maxValue / numTicks;
  
  // Encontrar el orden de magnitud del paso
  const stepMagnitude = Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / Math.pow(10, stepMagnitude);
  
  // Redondear el paso a un valor "bonito" (1, 2, 2.5, 5, 10, etc.)
  let niceStepMultiplier: number;
  if (normalizedStep <= 1) niceStepMultiplier = 1;
  else if (normalizedStep <= 2) niceStepMultiplier = 2;
  else if (normalizedStep <= 2.5) niceStepMultiplier = 2.5;
  else if (normalizedStep <= 5) niceStepMultiplier = 5;
  else niceStepMultiplier = 10;
  
  const step = niceStepMultiplier * Math.pow(10, stepMagnitude);
  
  // Redondear el máximo hacia arriba al siguiente múltiplo del paso
  const niceMax = Math.ceil(maxValue / step) * step;
  
  // Generar los valores del eje con incrementos consistentes
  const values: number[] = [];
  for (let i = 0; i <= numTicks; i++) {
    const value = i * step;
    if (value <= niceMax) {
      values.push(value);
    }
  }
  
  // Si el último valor es menor que niceMax y hay espacio, agregar niceMax
  if (values.length > 0 && values[values.length - 1] < niceMax) {
    values.push(niceMax);
  }
  
  return values;
}

export default function ChartRenderer({ spec }: Props) {
  if (!spec || !spec.labels?.length || !spec.series?.length) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });

  const width = 820;
  const height = 500;
  const padL = 90;
  const padR = 32;
  const padT = 50;
  const padB = 140;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const meta = (spec.meta || {}) as any;
  
  // Soporte para nuevo schema y compatibilidad hacia atrás
  // Nuevo schema no incluye palette, usa default
  // Compatibilidad: si viene palette en meta antiguo, usarlo
  const palette: string[] = Array.isArray(meta?.palette) && meta.palette.length > 0 ? meta.palette : PALETTE_DEFAULT;
  
  // Función helper para formatear números con nuevo o viejo schema
  const formatValue = (value: number) => {
    // Si existe unit_type, usar el nuevo formato
    if (meta?.unit_type) {
      return formatNumber(value, meta);
    }
    // Compatibilidad hacia atrás: usar unit si existe
    return abbreviateNumberLegacy(value, meta?.unit);
  };

  // Función para formatear valores del eje Y siempre con la misma unidad
  const formatYAxisValue = (value: number, maxValue: number) => {
    if (value === 0) {
      // El cero siempre se muestra sin unidad
      if (meta?.unit_type === 'currency') {
        const currencySymbol = meta?.currency ? getCurrencySymbol(meta.currency) : (meta?.value_prefix || '$');
        return `${currencySymbol}0`;
      }
      return '0';
    }

    // Determinar la unidad del valor máximo
    const absMax = Math.abs(maxValue);
    let divisor = 1;
    let unitSuffix = '';
    
    if (absMax >= 1_000_000_000) {
      divisor = 1_000_000_000;
      unitSuffix = 'B';
    } else if (absMax >= 1_000_000) {
      divisor = 1_000_000;
      unitSuffix = 'M';
    } else if (absMax >= 1_000) {
      divisor = 1_000;
      unitSuffix = 'K';
    }

    // Convertir el valor a la misma unidad que el máximo
    const normalizedValue = value / divisor;
    
    // Obtener configuración de decimales
    const decimalsNum = meta?.decimals ? Math.min(6, Math.max(0, parseInt(String(meta.decimals), 10) || 0)) : 2;
    
    // Formatear el número
    let formattedNumber = normalizedValue.toFixed(decimalsNum);
    // Remover ceros innecesarios
    if (decimalsNum === 0) {
      formattedNumber = String(Math.round(normalizedValue));
    } else {
      formattedNumber = parseFloat(formattedNumber).toString();
    }
    
    // Aplicar prefijos y sufijos según meta
    let prefix = '';
    let suffix = unitSuffix;
    
    if (meta?.unit_type === 'currency') {
      const currencySymbol = meta?.currency ? getCurrencySymbol(meta.currency) : (meta?.value_prefix || '$');
      prefix = currencySymbol;
      if (meta?.value_suffix) suffix = ` ${meta.value_suffix}`;
    } else {
      if (meta?.value_prefix) prefix = meta.value_prefix;
      if (meta?.value_suffix) suffix = `${unitSuffix} ${meta.value_suffix}`;
      else if (meta?.unit_label) suffix = `${unitSuffix} ${meta.unit_label}`;
    }
    
    return `${prefix}${formattedNumber}${suffix}`;
  };

  const series = useMemo(() => (
    spec.series.map((s, i) => ({ ...s, color: s.color || palette[i % palette.length] }))
  ), [spec.series, palette]);

  // Calcular maxVal según el tipo de gráfico
  // Para barras apiladas, necesitamos el máximo de las sumas totales por label
  // Para otros gráficos, el máximo de los valores individuales
  const maxVal = useMemo(() => {
    if (spec.type === 'bar') {
      const isStacked = meta?.stacked === true || meta?.stacked === 'true' || meta?.stacked === 'True';
      if (isStacked) {
        // Para barras apiladas, calcular la suma total de cada barra
        const sums = spec.labels.map((_, i) => 
          series.reduce((sum, s) => sum + (Number(s.data[i]) || 0), 0)
        );
        return Math.max(1, ...sums);
      }
    }
    // Para otros tipos, usar el máximo de valores individuales
    return Math.max(1, ...series.flatMap(s => s.data.map(v => Number(v) || 0)));
  }, [series, spec.type, spec.labels, meta?.stacked]);

  const n = spec.labels.length;
  const xStep = plotW / Math.max(1, n);
  
  // Calcular valores "bonitos" para el eje Y
  const yAxisValues = useMemo(() => calculateNiceYAxisValues(maxVal, 4), [maxVal]);
  const actualMaxVal = useMemo(() => Math.max(...yAxisValues, maxVal), [yAxisValues, maxVal]);
  
  // Usar actualMaxVal para la escala Y para que todos los elementos se ajusten correctamente
  const yScale = (v: number) => plotH - (v / actualMaxVal) * plotH;

  const bandPadding = Math.max(10, xStep * 0.14);
  const bandWidth = Math.max(0, xStep - bandPadding * 2);

  const bandCenter = (i: number) => padL + i * xStep + xStep / 2;
  const bandLeft = (i: number) => padL + i * xStep + bandPadding;

  const showTooltip = (clientX: number, clientY: number, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const label = spec.labels[index];
    const values = series.map(s => ({ name: s.name, value: Number(s.data[index]) || 0, color: s.color as string }));
    setTooltip({ visible: true, x: clientX - rect.left, y: clientY - rect.top, label, values });
  };
  const hideTooltip = () => setTooltip(t => ({ ...t, visible: false }));

  const GridAxes = (
    <g>
      <rect x={0} y={0} width={width} height={height} fill="none" rx={14} />
      {yAxisValues.map((value, i) => {
        const y = padT + yScale(value);
        return <line key={i} x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={GRID} strokeDasharray="4 4" strokeOpacity={0.5} />;
      })}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={AXIS} strokeWidth={1.5} />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={AXIS} strokeWidth={1.5} />
      {yAxisValues.map((value, i) => {
        const y = padT + yScale(value);
        return <text key={i} x={80} y={y + 5} textAnchor="end" fill={TEXT_DIM} fontSize={12} fontWeight={500}>{formatYAxisValue(value, actualMaxVal)}</text>;
      })}
    </g>
  );

  // ----- BARRAS ----- //
  const BarsGrouped = (
    <g>
      <defs>
        <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      {series.map((s, si) => {
        const color = s.color as string;
        const perBarW = bandWidth / series.length;
        return s.data.map((v, i) => {
          const value = Number(v) || 0;
          const x = bandLeft(i) + si * perBarW;
          const y = padT + yScale(value);
          const h = plotH - yScale(value);
          const barCenterX = x + perBarW / 2;
          const textY = y + h / 2;
          const displayValue = formatYAxisValue(value, actualMaxVal);
          
          return (
            <g key={`${si}-${i}`} onMouseMove={(e) => showTooltip(e.clientX, e.clientY, i)} onMouseLeave={hideTooltip}>
              <defs>
                <linearGradient id={`barGrad-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <rect x={x} y={y} width={perBarW} height={h} fill={`url(#barGrad-${si})`} rx={4} filter="url(#barShadow)" />
              {h > 20 && (
                <text
                  x={barCenterX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={600}
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    pointerEvents: 'none'
                  }}
                >
                  {displayValue}
                </text>
              )}
            </g>
          );
        });
      })}
    </g>
  );

  const BarsStacked = (
    <g>
      <defs>
        <filter id="barShadowS" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      {spec.labels.map((_, i) => {
        let acc = 0;
        const barCenterX = bandLeft(i) + bandWidth / 2;
        
        return (
          <g key={i}>
            {series.map((s, si) => {
              const color = s.color as string;
              const value = Number(s.data[i]) || 0;
              const yTop = padT + yScale(acc + value);
              const yBottom = padT + yScale(acc);
              const h = yBottom - yTop;
              const segmentCenterY = yTop + h / 2;
              const segmentDisplayValue = formatYAxisValue(value, actualMaxVal);
              const showSegmentLabel = h > 18 && value > 0;
              acc += value;
              return (
                <g key={`${si}-${i}`}>
                  <rect 
                    x={bandLeft(i)} 
                    y={yTop} 
                    width={bandWidth} 
                    height={h} 
                    fill={color} 
                    rx={2} 
                    filter="url(#barShadowS)"
                    onMouseMove={(e) => showTooltip(e.clientX, e.clientY, i)}
                    onMouseLeave={hideTooltip}
                    style={{ cursor: 'pointer' }}
                  />
                  {showSegmentLabel && (
                    <text
                      x={barCenterX}
                      y={segmentCenterY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={11}
                      fontWeight={600}
                      style={{
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none'
                      }}
                    >
                      {segmentDisplayValue}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );

  const BarsHorizontal = (
    <g>
      <line x1={padL} y1={padT} x2={padL + plotW} y2={padT} stroke={AXIS} strokeWidth={1.5} />
      {series.map((s, si) => {
        const color = s.color as string;
        const perBarH = (plotH / n) * (series.length > 1 ? 0.7 / series.length : 0.6);
        return s.data.map((v, i) => {
          const value = Number(v) || 0;
          const w = (value / maxVal) * plotW;
          const y = padT + i * (plotH / n) + (si * perBarH) + (plotH / n) * 0.2;
          const barCenterY = y + perBarH / 2;
          const textX = padL + w / 2;
          const displayValue = formatYAxisValue(value, actualMaxVal);
          const showLabel = w > 60;
          
          return (
            <g key={`${si}-${i}`}>
              <rect x={padL} y={y} width={w} height={perBarH} fill={color} rx={4} />
              {showLabel && (
                <text
                  x={textX}
                  y={barCenterY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize={12}
                  fontWeight={600}
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    pointerEvents: 'none'
                  }}
                >
                  {displayValue}
                </text>
              )}
            </g>
          );
        });
      })}
    </g>
  );

  // ----- LÍNEA / ÁREA ----- //
  const LinesOrArea = (
    <g>
      {series.map((s, si) => {
        const color = s.color as string;
        const points = s.data.map((v, i) => ({ x: bandCenter(i), y: padT + yScale(Number(v) || 0) }));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const area = `M ${bandCenter(0)} ${padT + plotH} ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${bandCenter(n - 1)} ${padT + plotH} Z`;
        
        const showArea = meta?.area !== false;
        
        return (
          <g key={si}>
            <defs>
              <linearGradient id={`areaGrad-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            {showArea && (
              <path 
                d={area} 
                fill={`url(#areaGrad-${si})`}
                onMouseMove={(e) => {
                  const svgElement = e.currentTarget.closest('svg');
                  if (!svgElement || !containerRef.current) return;
                  const svgRect = svgElement.getBoundingClientRect();
                  const mouseXRelativeToSvg = e.clientX - svgRect.left;
                  const scaleX = width / svgRect.width;
                  const xInViewBox = mouseXRelativeToSvg * scaleX;
                  const xPositionInPlot = xInViewBox - padL;
                  const index = Math.round(xPositionInPlot / xStep);
                  const validIndex = Math.max(0, Math.min(index, spec.labels.length - 1));
                  if (validIndex >= 0 && validIndex < spec.labels.length) {
                    showTooltip(e.clientX, e.clientY, validIndex);
                  }
                }}
                onMouseLeave={hideTooltip}
              />
            )}
            <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => {
              const value = Number(s.data[i]) || 0;
              const displayValue = formatYAxisValue(value, actualMaxVal);
              return (
                <g key={i}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={5} 
                    fill="#1e293b"
                    stroke={color}
                    strokeWidth={2}
                    onMouseMove={(e) => showTooltip(e.clientX, e.clientY, i)}
                    onMouseLeave={hideTooltip}
                  />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    dominantBaseline="text-before-edge"
                    fill={TEXT_DIM}
                    fontSize={11}
                    fontWeight={600}
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      pointerEvents: 'none'
                    }}
                  >
                    {displayValue}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );

  // ----- PIE / DONUT ----- //
  const PieOrDonut = (() => {
    const s0 = series[0];
    const total = s0.data.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
    let angleAcc = 0;
    const cx = width / 2;
    const cy = height / 2;
    const outer = Math.min(width, height) / 2 - Math.max(padL, padT);
    const inner = meta?.donut === true ? outer * 0.6 : 0;
    const labelRadius = inner > 0 ? (inner + outer) / 2 : outer * 0.7;

    const arcs = spec.labels.map((_, i) => {
      const val = Number(s0.data[i] || 0);
      const angle = (val / total) * Math.PI * 2;
      const midAngle = angleAcc + angle / 2;
      
      const textX = cx + labelRadius * Math.cos(midAngle);
      const textY = cy + labelRadius * Math.sin(midAngle);
      
      const tooltipRadius = outer * 0.85;
      const tooltipCenterX = cx + tooltipRadius * Math.cos(midAngle);
      const tooltipCenterY = cy + tooltipRadius * Math.sin(midAngle);
      
      const x1 = cx + outer * Math.cos(angleAcc);
      const y1 = cy + outer * Math.sin(angleAcc);
      const x2 = cx + outer * Math.cos(angleAcc + angle);
      const y2 = cy + outer * Math.sin(angleAcc + angle);
      const large = angle > Math.PI ? 1 : 0;
      const pathOuter = `M ${cx} ${cy} L ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} Z`;
      const pathDonut = `M ${cx} ${cy} m ${-inner},0 a ${inner},${inner} 0 1,0 ${inner * 2},0 a ${inner},${inner} 0 1,0 ${-inner * 2},0`;
      const d = inner > 0 ? `${pathOuter} ${pathDonut}` : pathOuter;
      const fill = palette[i % palette.length];
      const displayValue = formatValue(val);
      const showLabel = angle > 0.1;
      
      angleAcc += angle;
      
      return (
        <g key={i}>
          <path 
            d={d} 
            fill={fill} 
            opacity={0.9} 
            stroke="#1e293b" 
            strokeWidth={2} 
            fillRule={inner > 0 ? 'evenodd' : 'nonzero'}
            onMouseMove={(e) => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const svgElement = e.currentTarget.closest('svg');
                if (svgElement) {
                  const svgRect = svgElement.getBoundingClientRect();
                  const scaleX = svgRect.width / width;
                  const scaleY = svgRect.height / height;
                  
                  const tooltipXRelative = tooltipCenterX * scaleX;
                  const tooltipYRelative = tooltipCenterY * scaleY;
                  
                  const offsetDistance = 40;
                  const offsetX = Math.cos(midAngle) * offsetDistance * scaleX;
                  const offsetY = Math.sin(midAngle) * offsetDistance * scaleY;
                  
                  const tooltipX = rect.left + tooltipXRelative + offsetX;
                  const tooltipY = rect.top + tooltipYRelative + offsetY;
                  
                  showTooltip(tooltipX, tooltipY, i);
                }
              }
            }}
            onMouseLeave={hideTooltip}
            style={{ cursor: 'pointer' }}
          />
          {showLabel && (
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={13}
              fontWeight={700}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none'
              }}
            >
              {displayValue}
            </text>
          )}
        </g>
      );
    });

    return <g>{arcs}</g>;
  })();

  // ----- SCATTER ----- //
  const Scatter = (() => {
    const xValues: number[] | undefined = Array.isArray(meta?.xValues) ? meta.xValues : undefined;
    const parsedX: number[] = xValues ? xValues : spec.labels.map((l, i) => {
      const num = Number(l);
      return isNaN(num) ? i : num;
    });
    const y = series[0];
    const minX = Math.min(...parsedX);
    const maxX = Math.max(...parsedX);
    const xScale = (vx: number) => padL + ((vx - minX) / Math.max(1, (maxX - minX))) * plotW;

    return (
      <g>
        {y.data.map((vy, i) => {
          const px = xScale(parsedX[i]);
          const py = padT + yScale(Number(vy) || 0);
          return <circle key={i} cx={px} cy={py} r={5} fill={y.color as string} stroke="#1e293b" strokeWidth={1} />;
        })}
      </g>
    );
  })();

  // ----- X LABELS (anti-overlap) ----- //
  const XLabels = (() => {
    const charW = 8;
    const needRotateByCount = n > 6;
    const needRotateByWidth = spec.labels.some(lbl => String(lbl).length * charW > xStep * 0.8);
    const shouldRotate = needRotateByCount || needRotateByWidth;

    const maxToShow = 14;
    const step = n > maxToShow ? Math.ceil(n / maxToShow) : 1;
    return (
      <g>
        {spec.labels.map((lbl, i) => {
          if (i % step !== 0) return null;
          const x = bandCenter(i);
          const text = truncateLabel(String(lbl), 28);
          if (shouldRotate) {
            return (
              <g key={i} transform={`translate(${x}, ${padT + plotH + 44}) rotate(-20)`}>
                <text textAnchor="end" fill={TEXT_DIM} fontSize={12} fontWeight={500}>{text}</text>
              </g>
            );
          }
          return (
            <text key={i} x={x} y={padT + plotH + 36} textAnchor="middle" fill={TEXT_DIM} fontSize={12} fontWeight={500}>{text}</text>
          );
        })}
      </g>
    );
  })();

  // Mantener el tipo recibido; solo usar horizontal si lo pide meta.orientation
  const effectiveType = spec.type;

  const Legend = (
    <div className="mt-4 flex flex-wrap gap-2 justify-center">
      {effectiveType === 'pie' ? (
        spec.labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 shadow-sm backdrop-blur-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: palette[i % palette.length] }} />
            {String(label)}
          </div>
        ))
      ) : (
        series.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 shadow-sm backdrop-blur-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: s.color as string }} />
            {s.name}
          </div>
        ))
      )}
    </div>
  );

  const body = (() => {
    switch (effectiveType as any) {
      case 'bar':
        const isStacked = meta?.stacked === true || meta?.stacked === 'true' || meta?.stacked === 'True';
        if (meta?.orientation === 'horizontal') return BarsHorizontal;
        return isStacked ? BarsStacked : BarsGrouped;
      case 'line':
        return LinesOrArea;
      case 'pie':
        return PieOrDonut;
      case 'scatter':
        return Scatter;
      default:
        return BarsGrouped;
    }
  })();

  return (
    <div ref={containerRef} className="relative rounded-2xl border border-white/5 bg-[#121212]/80 backdrop-blur-md px-6 py-6 shadow-xl ring-1 ring-white/10">
      {spec.title && <div className="text-[16px] font-semibold tracking-wide text-gray-200 mb-4 ml-2">{spec.title}</div>}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ borderRadius: 12 }}>
        {effectiveType !== 'pie' && GridAxes}
        {body}
        {effectiveType !== 'pie' && effectiveType !== 'scatter' && XLabels}
      </svg>
      {Legend}
      {tooltip.visible && (
        <div className="pointer-events-none absolute rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-xl px-4 py-3 text-xs text-white shadow-2xl z-50 ring-1 ring-white/20" style={{ left: Math.min(Math.max(tooltip.x + 12, 8), (containerRef.current?.clientWidth || 0) - 200), top: Math.max(tooltip.y - 8, 8), width: 220 }}>
          {effectiveType === 'pie' ? (() => {
            if (!tooltip.values || tooltip.values.length === 0) return null;
            
            const total = series[0].data.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
            const percentage = ((tooltip.values[0].value / total) * 100).toFixed(2);
            const formattedValue = formatValue(tooltip.values[0].value);
            
            const valueNum = parseFloat(formattedValue.replace(/[^0-9.]/g, '')) || 0;
            const percentageNum = parseFloat(percentage);
            const areEqual = Math.abs(valueNum - percentageNum) < 0.1;
            
            return (
              <>
                <div className="mb-1 text-xs text-gray-400 font-medium uppercase tracking-wider">{tooltip.label}</div>
                <div className="text-white font-bold text-sm">
                  {areEqual ? `${percentage}%` : `${formattedValue} (${percentage}%)`}
                </div>
              </>
            );
          })() : (
            <>
              <div className="mb-1 text-[13px] text-slate-500 font-medium">{tooltip.label}</div>
              {tooltip.values?.map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-sm" style={{ background: v.color }} />
                    <span className="text-slate-700 text-[13px]">{v.name}</span>
                  </div>
                  <span className="text-slate-900 font-semibold text-[13px]">{formatValue(v.value)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}