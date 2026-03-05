'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { ChartSpec } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

type InsightStatus = 'idle' | 'loading' | 'success' | 'error';

type InsightChart = ChartSpec;

export type InsightResult = {
  replyText: string | null;
  charts: InsightChart[];
  raw: any;
  queryUsed: string;
};

export type InsightTask = {
  status: InsightStatus;
  productId: string;
  productName: string;
  result: InsightResult;
  error: string | null;
  elapsedSeconds: number;
  progressStep: string;
};

export type GenerateInsightParams = {
  prompt: string;
  productId: string;
  productName: string;
  authAccessToken: string;
};

// ── SessionStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = 'minddash-insight-task';
const PARAMS_KEY = 'minddash-insight-params';

function saveTaskToStorage(task: InsightTask) {
  try {
    // Only persist success/error/loading states (not idle)
    if (task.status === 'idle') {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    // Don't persist raw data for loading state (it's null anyway)
    const toSave = { ...task };
    if (task.status === 'loading') {
      toSave.result = { replyText: null, charts: [], raw: null, queryUsed: task.result.queryUsed };
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded or unavailable */ }
}

function saveParamsToStorage(params: GenerateInsightParams) {
  try {
    sessionStorage.setItem(PARAMS_KEY, JSON.stringify(params));
  } catch { /* ignore */ }
}

function loadTaskFromStorage(): InsightTask | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InsightTask;
  } catch { return null; }
}

function loadParamsFromStorage(): GenerateInsightParams | null {
  try {
    const raw = sessionStorage.getItem(PARAMS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GenerateInsightParams;
  } catch { return null; }
}

function clearStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PARAMS_KEY);
  } catch { /* ignore */ }
}

type InsightContextType = {
  task: InsightTask;
  generateInsight: (params: GenerateInsightParams) => void;
  clearTask: () => void;
  dismissIndicator: () => void;
  isIndicatorVisible: boolean;
};

// ── Utility functions (extracted from ClientSideInsightPage) ───────────────────

function sanitizeConfigConnection(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const obj = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return out;
}

function isValidChartSpec(spec: any): spec is ChartSpec {
  return !!spec && Array.isArray(spec.labels) && Array.isArray(spec.series) && spec.labels.length > 0 && spec.series.length > 0;
}

function parseQueryResult(raw: any): Record<string, any>[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw.replace(/'/g, '"').replace(/None/g, 'null').replace(/True/g, 'true').replace(/False/g, 'false'));
      if (Array.isArray(parsed)) return parsed;
      if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows;
    } catch { /* ignore */ }
  }
  if (typeof raw === 'object' && raw.rows && Array.isArray(raw.rows)) return raw.rows;
  return null;
}

function autoChartFromQueryResult(rows: Record<string, any>[]): InsightChart | null {
  if (!rows || rows.length === 0) return null;
  const keys = Object.keys(rows[0]);
  if (keys.length < 2) return null;

  const numericKeys = keys.filter(k => rows.every(r => typeof r[k] === 'number'));
  const labelKeys = keys.filter(k => !numericKeys.includes(k));

  if (numericKeys.length === 0) return null;

  const labelKey = labelKeys.length > 0 ? labelKeys : [keys[0]];
  const labels = rows.map(r => labelKey.map(k => String(r[k] ?? '')).join(' / '));

  const series = numericKeys.slice(0, 3).map(k => ({
    name: k.replace(/_/g, ' '),
    data: rows.map(r => Number(r[k]) || 0),
  }));

  return {
    type: rows.length > 8 ? 'line' : 'bar',
    title: numericKeys[0].replace(/_/g, ' '),
    labels,
    series,
  } as InsightChart;
}

export function extractChartsFromResponse(data: any): InsightChart[] {
  if (!data || typeof data !== 'object') return [];
  const charts: InsightChart[] = [];

  const dynamics: any[] =
    data.dashboard_preview_dynamics ??
    data.dashboardPreviewDynamics ??
    data.dashboard_preview ??
    data.charts ??
    data.dashboards ??
    [];

  if (Array.isArray(dynamics)) {
    for (const item of dynamics) {
      if (isValidChartSpec(item)) {
        charts.push(item);
      } else if (item?.chart && isValidChartSpec(item.chart)) {
        charts.push(item.chart);
      } else if (item?.spec && isValidChartSpec(item.spec)) {
        charts.push(item.spec);
      } else if (item?.data && isValidChartSpec(item.data)) {
        charts.push(item.data);
      }
    }
  }

  if (charts.length === 0) {
    if (isValidChartSpec(data)) {
      charts.push(data);
    } else if (data.chart_payload && isValidChartSpec(data.chart_payload)) {
      charts.push(data.chart_payload);
    }
  }

  if (charts.length === 0 && data.state) {
    const qr = data.state.query_result;
    const rows = parseQueryResult(qr);
    if (rows && rows.length > 0) {
      const autoChart = autoChartFromQueryResult(rows);
      if (autoChart) charts.push(autoChart);
    }
  }

  return charts;
}

export function extractReplyText(data: any): string {
  if (!data || typeof data !== 'object') return typeof data === 'string' ? data : '';

  if (data.isError) return '';

  const explicit = data.reply ?? data.explanation ?? data.description ?? data.message;
  if (explicit && typeof explicit === 'string' && explicit !== 'NO RESPONSE') {
    return explicit;
  }

  if (data.text && typeof data.text === 'string' && data.text !== 'NO RESPONSE') {
    return data.text;
  }

  if (data.state) {
    const parts: string[] = [];
    if (data.state.query_success) {
      const rows = parseQueryResult(data.state.query_result);
      if (rows && rows.length > 0) {
        parts.push(`Se encontraron ${rows.length} registros en el análisis.`);
      }
    } else {
      parts.push('No se encontraron resultados para esta consulta. Intenta con un análisis diferente.');
    }
    if (parts.length > 0) return parts.join('\n');
  }

  return data.text ?? data.reply ?? '';
}

function getFriendlyErrorMessage(data: any): string {
  if (!data) return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';

  if (data.upstreamStatus === 500 || data.upstreamStatus === 502 || data.upstreamStatus === 503) {
    return 'El servicio de análisis no está disponible en este momento. Por favor intenta de nuevo en unos minutos.';
  }

  if (data.error?.includes('Timeout') || data.error?.includes('AbortError')) {
    return 'El análisis está tardando más de lo esperado. Por favor intenta con una consulta más específica o inténtalo de nuevo.';
  }

  if (data.upstreamStatus && data.upstreamStatus >= 400) {
    return 'No fue posible completar el análisis. Por favor intenta de nuevo o prueba con una consulta diferente.';
  }

  if (data.reply && typeof data.reply === 'string' && !data.reply.includes('Upstream') && !data.reply.includes('500')) {
    return data.reply;
  }

  return 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.';
}

// ── Progress step messages ─────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { at: 0, label: 'Conectando con el agente...' },
  { at: 5, label: 'Analizando tu consulta...' },
  { at: 15, label: 'Consultando la base de datos...' },
  { at: 30, label: 'Procesando datos...' },
  { at: 60, label: 'Generando visualizaciones...' },
  { at: 90, label: 'Finalizando análisis...' },
  { at: 120, label: 'Tomando más tiempo de lo usual...' },
  { at: 180, label: 'Aún trabajando, por favor espera...' },
];

function getProgressStep(seconds: number): string {
  let step = PROGRESS_STEPS[0].label;
  for (const s of PROGRESS_STEPS) {
    if (seconds >= s.at) step = s.label;
  }
  return step;
}

// ── Default state ──────────────────────────────────────────────────────────────

const DEFAULT_TASK: InsightTask = {
  status: 'idle',
  productId: '',
  productName: '',
  result: { replyText: null, charts: [], raw: null, queryUsed: '' },
  error: null,
  elapsedSeconds: 0,
  progressStep: '',
};

// ── Context ────────────────────────────────────────────────────────────────────

const InsightContext = createContext<InsightContextType | null>(null);

export function useInsightContext() {
  const ctx = useContext(InsightContext);
  if (!ctx) {
    throw new Error('useInsightContext must be used within InsightProvider');
  }
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function InsightProvider({ children }: { children: React.ReactNode }) {
  // Always start with defaults to match server-rendered HTML (avoids hydration mismatch)
  const [task, setTask] = useState<InsightTask>(DEFAULT_TASK);
  const [isIndicatorVisible, setIsIndicatorVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasAutoRestarted = useRef(false);

  // Restore from sessionStorage after hydration
  useEffect(() => {
    const saved = loadTaskFromStorage();
    if (saved && saved.status !== 'idle') {
      if (saved.status === 'loading') {
        // Was loading when page closed — will auto-restart below
        setTask({ ...saved, progressStep: 'Reanudando generación...' });
      } else {
        setTask(saved);
      }
      setIsIndicatorVisible(true);
    }
    setHydrated(true);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearTask = useCallback(() => {
    stopTimer();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setTask(DEFAULT_TASK);
    setIsIndicatorVisible(false);
    clearStorage();
  }, [stopTimer]);

  const dismissIndicator = useCallback(() => {
    setIsIndicatorVisible(false);
  }, []);

  const generateInsight = useCallback((params: GenerateInsightParams) => {
    const { prompt, productId, productName, authAccessToken } = params;
    if (!prompt.trim()) return;

    // Abort any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    stopTimer();

    const controller = new AbortController();
    abortRef.current = controller;

    // Save params so we can auto-restart on page reload
    saveParamsToStorage(params);

    // Reset task to loading
    const loadingTask: InsightTask = {
      status: 'loading',
      productId,
      productName,
      result: { replyText: null, charts: [], raw: null, queryUsed: prompt },
      error: null,
      elapsedSeconds: 0,
      progressStep: getProgressStep(0),
    };
    setTask(loadingTask);
    saveTaskToStorage(loadingTask);
    setIsIndicatorVisible(true);

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTask(prev => ({
        ...prev,
        elapsedSeconds: elapsed,
        progressStep: getProgressStep(elapsed),
      }));
    }, 1000);

    // Run the async flow without blocking
    (async () => {
      try {
        // Step 1: Get user agent data
        const authData = typeof window !== 'undefined' ? localStorage.getItem('evolve-auth') : null;
        if (!authData) throw new Error('No se encontró información de autenticación. Inicia sesión nuevamente.');

        const auth = JSON.parse(authData);
        const authUserId = auth.userId;
        const token = auth.accessToken || '';

        if (!authUserId) throw new Error('No se encontró el userId del usuario. Inicia sesión nuevamente.');
        if (!token) throw new Error('No se encontró el token de autenticación. Inicia sesión nuevamente.');

        console.log('[InsightContext] getUserAgentData → userId:', authUserId, 'productId:', productId);

        const agentDataRes = await fetch('/api/user/agent-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: authUserId, productId }),
          signal: controller.signal,
        });

        if (!agentDataRes.ok) {
          if (agentDataRes.status === 404) throw new Error('No se encontró la configuración para este producto.');
          if (agentDataRes.status === 401) throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
          throw new Error('No fue posible cargar la configuración. Por favor intenta de nuevo.');
        }

        const agentJson = await agentDataRes.json();
        if (!agentJson.success || !agentJson.data) throw new Error('No se pudieron obtener los datos del usuario');

        const userDataDB = agentJson.data;
        const configConnection = sanitizeConfigConnection(userDataDB.config_connection);

        const tableNames = userDataDB.table_names;
        if (!tableNames || (Array.isArray(tableNames) && tableNames.length === 0)) {
          console.warn('[InsightContext] table_names is empty — upstream may fail. Product:', userDataDB.product_id);
        }

        const requestBody = {
          message: prompt,
          client: userDataDB.client,
          client_schema: 'public',
          table_names: tableNames || [],
          role_name: userDataDB.role_name,
          data_access: userDataDB.data_access || {},
          metrics_access: userDataDB.metrics_access || [],
          user_id: authUserId || userDataDB.id_user,
          client_id: userDataDB.client_id,
          product_id: userDataDB.product_id || productId,
          bucket_config: userDataDB.bucket_config,
          gs_prompt_sql: userDataDB.gs_prompt_sql,
          gs_profiling_agent: userDataDB.gs_profiling_agent || '',
          gs_metrics_config_agent: userDataDB.gs_metrics_config_agent || '',
          gs_semantic_config: userDataDB.gs_semantic_config,
          config_connection: configConnection,
        };

        // Step 2: Call insights proxy
        const response = await fetch('/api/agent/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authAccessToken ? { Authorization: `Bearer ${authAccessToken}` } : {}),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const text = await response.text();
        let data: any = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }

        if (!response.ok) {
          throw new Error('No fue posible completar el análisis. Por favor intenta de nuevo.');
        }

        if (data?.isError) {
          const friendlyMsg = getFriendlyErrorMessage(data);
          throw new Error(friendlyMsg);
        }

        const replyText = extractReplyText(data);
        const charts = extractChartsFromResponse(data);

        stopTimer();
        const successTask: InsightTask = {
          status: 'success',
          productId,
          productName,
          result: { replyText: replyText || null, charts, raw: data, queryUsed: prompt },
          error: null,
          elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
          progressStep: '',
        };
        setTask(successTask);
        saveTaskToStorage(successTask);
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          // User cancelled or new request started — don't update state
          return;
        }
        stopTimer();
        const errorTask: InsightTask = {
          status: 'error',
          productId,
          productName,
          result: { replyText: null, charts: [], raw: null, queryUsed: prompt },
          error: e?.message || 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
          elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
          progressStep: '',
        };
        setTask(errorTask);
        saveTaskToStorage(errorTask);
      }
    })();
  }, [stopTimer]);

  // Auto-restart generation if page was reloaded during loading (runs after hydration restore)
  useEffect(() => {
    if (!hydrated) return;
    if (hasAutoRestarted.current) return;
    if (task.status !== 'loading') return;

    const savedParams = loadParamsFromStorage();
    if (!savedParams) {
      // No params to restart with — mark as error
      const errorTask: InsightTask = {
        ...task,
        status: 'error',
        error: 'La generación fue interrumpida por la recarga de la página. Intenta de nuevo.',
      };
      setTask(errorTask);
      saveTaskToStorage(errorTask);
      return;
    }

    hasAutoRestarted.current = true;
    console.log('[InsightContext] Auto-restarting insight generation after page reload');
    generateInsight(savedParams);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <InsightContext.Provider value={{ task, generateInsight, clearTask, dismissIndicator, isIndicatorVisible }}>
      {children}
    </InsightContext.Provider>
  );
}
