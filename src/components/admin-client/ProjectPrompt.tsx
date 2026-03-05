'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSave, FiPlus, FiTrash2, FiX, FiCheck, FiCloud, FiBarChart, FiDatabase, FiInfo } from '@/lib/icons';
import { toast } from 'sonner';
import { postBackend } from '@/lib/api-helpers';
import ModalPortal from '@/components/ui/ModalPortal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProjectPromptProps {
  projectId: string;
  projectName: string;
}

interface Metric {
  id: string;
  name: string;
  whenToUse: string;
  arguments: string;
  requiredParams?: string[];
  optionalParams?: string[];
}

interface MetricParameterV2 {
  id: string;
  parameter: string;
  meaning: string;
}

interface AdvancedMetricV2 {
  id: string;
  metric_name: string;
  metric: string;
  parameters: MetricParameterV2[];
}

interface TableSelectionLogicV2 {
  id: string;
  table_name: string;
  usage_instructions: string;
  validation: string;
  important_notes: string;
}

interface Table {
  id: string;
  name: string;
  columns?: string;
  selected?: boolean;
}

interface Example {
  id: string;
  name: string;
  description: string;
  data_query: string;
}

export default function ProjectPrompt({ projectId, projectName }: ProjectPromptProps) {
  const defaultRole = `Eres un asistente de inteligencia artificial experto en ayudar a los usuarios con sus consultas. Tu objetivo es proporcionar respuestas precisas, útiles y amigables basadas en la información disponible en las bases de datos del proyecto ${projectName}.`;
  const [agentRole, setAgentRole] = useState('');
  const [initialAgentRole, setInitialAgentRole] = useState('');

  const [useAdvancedPromptV2, setUseAdvancedPromptV2] = useState(false);
  const [v2AgentMainRole, setV2AgentMainRole] = useState('');
  const [initialV2AgentMainRole, setInitialV2AgentMainRole] = useState('');
  const [v2BusinessRules, setV2BusinessRules] = useState('');
  const [initialV2BusinessRules, setInitialV2BusinessRules] = useState('');
  const [v2AdditionalConsiderations, setV2AdditionalConsiderations] = useState('');
  const [initialV2AdditionalConsiderations, setInitialV2AdditionalConsiderations] = useState('');
  const [showBusinessRules, setShowBusinessRules] = useState(true);
  const [v2AdvancedMetrics, setV2AdvancedMetrics] = useState<AdvancedMetricV2[]>([]);
  const [v2TableSelectionLogic, setV2TableSelectionLogic] = useState<TableSelectionLogicV2[]>([]);
  const [v2SelectedMetricId, setV2SelectedMetricId] = useState<string>('');
  const [v2SelectedTableName, setV2SelectedTableName] = useState<string>('');
  const [highlightAddMetricCue, setHighlightAddMetricCue] = useState(false);
  const [highlightAddTableCue, setHighlightAddTableCue] = useState(false);
  const [v2SemanticTables, setV2SemanticTables] = useState<Table[]>([]);
  const [v2SemanticTablesByName, setV2SemanticTablesByName] = useState<Record<string, { columns: string[] }>>({});
  const [loadingSemanticTables, setLoadingSemanticTables] = useState(false);

  const [initialV2AdvancedMetricsSerialized, setInitialV2AdvancedMetricsSerialized] = useState('');
  const [initialV2TableSelectionLogicSerialized, setInitialV2TableSelectionLogicSerialized] = useState('');

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [enabledMetrics, setEnabledMetrics] = useState<string[]>([]);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [existingPromptId, setExistingPromptId] = useState<string | null>(null);
  const [existingConfigPrompt, setExistingConfigPrompt] = useState<any>(null);
  const [deployingPrompt, setDeployingPrompt] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    const storageKey = `minddash:prompt-v2:${projectId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored === '1') {
      setUseAdvancedPromptV2(true);
    }
    loadPromptData();
  }, [projectId]);

  useEffect(() => {
    const storageKey = `minddash:prompt-v2:${projectId}`;
    localStorage.setItem(storageKey, useAdvancedPromptV2 ? '1' : '0');
  }, [projectId, useAdvancedPromptV2]);

  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  const buildOptional = (value: string) => {
    const v = typeof value === 'string' ? value.trim() : '';
    return v ? v : null;
  };

  const v2BusinessRulesMissing = useAdvancedPromptV2 && (v2BusinessRules || '').trim() === '';
  const v2HasTablesWithoutName =
    useAdvancedPromptV2 &&
    Array.isArray(v2TableSelectionLogic) &&
    v2TableSelectionLogic.some(t => (t?.table_name || '').trim() === '');

  useEffect(() => {
    if (!highlightAddMetricCue) return;
    const timeout = setTimeout(() => setHighlightAddMetricCue(false), 1800);
    return () => clearTimeout(timeout);
  }, [highlightAddMetricCue]);

  useEffect(() => {
    if (!highlightAddTableCue) return;
    const timeout = setTimeout(() => setHighlightAddTableCue(false), 1800);
    return () => clearTimeout(timeout);
  }, [highlightAddTableCue]);

  const serializeAdvancedMetricsForDirtyCheck = (rows: AdvancedMetricV2[]) => {
    return JSON.stringify(
      (Array.isArray(rows) ? rows : []).map(m => ({
        metric_name: String(m.metric_name || ''),
        metric: String(m.metric || ''),
        parameters: (Array.isArray(m.parameters) ? m.parameters : []).map(p => ({
          parameter: String(p.parameter || ''),
          meaning: String(p.meaning || ''),
        })),
      }))
    );
  };

  const serializeTablesForDirtyCheck = (rows: TableSelectionLogicV2[]) => {
    return JSON.stringify(
      (Array.isArray(rows) ? rows : []).map(t => ({
        table_name: String(t.table_name || ''),
        usage_instructions: String(t.usage_instructions || ''),
        validation: String(t.validation || ''),
        important_notes: String(t.important_notes || ''),
      }))
    );
  };

  const getSemanticTableDefaults = (tableName: string) => {
    const info = v2SemanticTablesByName[tableName];
    const cols = Array.isArray(info?.columns) ? info.columns : [];
    const colsPreview = cols.slice(0, 25).join(', ');
    const colsSuffix = cols.length > 25 ? `, ... (+${cols.length - 25})` : '';

    const usage = `Tabla ${tableName} (definida en la capa semántica).`;
    const validation = `Validar consistencia de resultados usando las columnas definidas en la capa semántica para ${tableName}.`;
    const important = cols.length > 0
      ? `Columnas disponibles (capa semántica): ${colsPreview}${colsSuffix}`
      : `Columnas disponibles: ver capa semántica para ${tableName}.`;

    return {
      usage_instructions: usage,
      validation,
      important_notes: important,
    };
  };

  const validatePromptV2 = () => {
    if (!useAdvancedPromptV2) return true;
    if (!v2AgentMainRole || v2AgentMainRole.trim() === '') {
      toast.error('El campo “Rol principal del agente” es obligatorio');
      return false;
    }
    if (!v2BusinessRules || v2BusinessRules.trim() === '') {
      toast.error('El campo “Reglas de negocio” es obligatorio');
      return false;
    }
    const hasMetrics = Array.isArray(v2AdvancedMetrics) && v2AdvancedMetrics.length > 0;
    if (hasMetrics) {
      const badMetric = v2AdvancedMetrics.find(
        m => !m.metric_name || !m.metric || m.parameters.some(p => !p.parameter || !p.meaning)
      );
      if (badMetric) {
        toast.error('Completa la especificación y el significado de parámetros en todas las métricas');
        return false;
      }
    }
    if (!Array.isArray(v2TableSelectionLogic) || v2TableSelectionLogic.length === 0) {
      toast.error('Agrega al menos 1 tabla (o regla de selección)');
      return false;
    }
    const badTable = v2TableSelectionLogic.find(t => !t.table_name || t.table_name.trim() === '');
    if (badTable) {
      toast.error('Selecciona el nombre de la tabla');
      return false;
    }
    return true;
  };

  const handleAddAdvancedMetricFromCatalog = (metricId: string) => {
    const selected = metrics.find(m => m.id === metricId);
    if (!selected) return;

    const already = v2AdvancedMetrics.some(m => m.metric_name === selected.name);
    if (already) {
      toast.error('Esta métrica ya fue agregada');
      return;
    }

    const baseParams = [...(selected.requiredParams || []), ...(selected.optionalParams || [])];
    const params: MetricParameterV2[] = baseParams.map(p => ({
      id: makeId(),
      parameter: p,
      meaning: '',
    }));

    setV2AdvancedMetrics(prev => [
      ...prev,
      {
        id: makeId(),
        metric_name: selected.name,
        metric: '',
        parameters: params,
      },
    ]);
  };

  const handleRemoveAdvancedMetric = (rowId: string) => {
    setV2AdvancedMetrics(prev => prev.filter(m => m.id !== rowId));
  };

  const handleUpdateAdvancedMetric = (rowId: string, patch: Partial<AdvancedMetricV2>) => {
    setV2AdvancedMetrics(prev => prev.map(m => (m.id === rowId ? { ...m, ...patch } : m)));
  };

  const handleRemoveMetricParam = (rowId: string, paramId: string) => {
    setV2AdvancedMetrics(prev =>
      prev.map(m => {
        if (m.id !== rowId) return m;
        return { ...m, parameters: m.parameters.filter(p => p.id !== paramId) };
      })
    );
  };

  const handleUpdateMetricParam = (rowId: string, paramId: string, patch: Partial<MetricParameterV2>) => {
    setV2AdvancedMetrics(prev =>
      prev.map(m => {
        if (m.id !== rowId) return m;
        return {
          ...m,
          parameters: m.parameters.map(p => (p.id === paramId ? { ...p, ...patch } : p)),
        };
      })
    );
  };

  const handleAddTableLogic = () => {
    setV2TableSelectionLogic(prev => [
      ...prev,
      {
        id: makeId(),
        table_name: '',
        usage_instructions: '',
        validation: '',
        important_notes: '',
      },
    ]);
  };

  const handleRemoveTableLogic = (rowId: string) => {
    setV2TableSelectionLogic(prev => prev.filter(t => t.id !== rowId));
  };

  const handleUpdateTableLogic = (rowId: string, patch: Partial<TableSelectionLogicV2>) => {
    setV2TableSelectionLogic(prev => prev.map(t => (t.id === rowId ? { ...t, ...patch } : t)));
  };

  const handleAddTableLogicFromSemantic = (tableName: string) => {
    const t = (tableName || '').trim();
    if (!t) return;

    const already = v2TableSelectionLogic.some(row => (row.table_name || '').trim() === t);
    if (already) {
      toast.error('Esta tabla ya fue agregada');
      return;
    }

    const defaults = getSemanticTableDefaults(t);

    setV2TableSelectionLogic(prev => [
      ...prev,
      {
        id: makeId(),
        table_name: t,
        usage_instructions: defaults.usage_instructions,
        validation: defaults.validation,
        important_notes: defaults.important_notes,
      },
    ]);
  };

  const handleSavePromptV2 = async () => {
    try {
      if (!validatePromptV2()) return;

      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;

      const additionalConsiderations = buildOptional(v2AdditionalConsiderations);

      const config_prompt: any = {
        temperature: 0.2,
        agent_main_role: v2AgentMainRole,
        business_rules: v2BusinessRules,
        response_format: 'Responde en español, de forma clara y estructurada. Prioriza tablas cuando aplique y explica supuestos de forma breve.',
        ...(additionalConsiderations ? { additional_considerations: additionalConsiderations } : {}),
        advanced_agent_metrics: v2AdvancedMetrics.map(m => ({
          name: m.metric_name,
          metric: m.metric,
          parameters: m.parameters.map(p => ({ parameter: p.parameter, meaning: p.meaning })),
        })),
        table_selection_logic: v2TableSelectionLogic.map(t => {
          const defaults = getSemanticTableDefaults(t.table_name);
          return {
            table_name: t.table_name,
            usage_instructions: t.usage_instructions || defaults.usage_instructions,
            validation: t.validation || defaults.validation,
            important_notes: t.important_notes || defaults.important_notes,
          };
        }),
      };

      const isUpdate = existingPromptId !== null;

      const url = isUpdate
        ? '/api/backend/prompts_and_examples/prompts/sendUpdatePromptV2'
        : '/api/backend/prompts_and_examples/prompts/sendRegisterPromptV2';

      const method = isUpdate ? 'PUT' : 'POST';

      const body: any = isUpdate
        ? {
            id: existingPromptId,
            product_id: projectId,
            name: 'System Prompt',
            prompt_content: v2AgentMainRole,
            config_prompt,
          }
        : {
            product_id: projectId,
            name: 'System Prompt',
            prompt_content: v2AgentMainRole,
            config_prompt,
          };

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error((result as any)?.message || 'Error al guardar prompt V2');
        return;
      }

      if (!isUpdate) {
        const promptId = (result as any)?.id_prompt || (result as any)?.data?.id_prompt;
        if (promptId) {
          setExistingPromptId(promptId);
        }
      }

      setInitialV2AgentMainRole(v2AgentMainRole);
      setInitialV2BusinessRules(v2BusinessRules);
      setInitialV2AdditionalConsiderations(v2AdditionalConsiderations);
      setInitialV2AdvancedMetricsSerialized(serializeAdvancedMetricsForDirtyCheck(v2AdvancedMetrics));
      setInitialV2TableSelectionLogicSerialized(serializeTablesForDirtyCheck(v2TableSelectionLogic));
      toast.success('Prompt V2 guardado correctamente');
      await loadPromptData();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployPromptV2 = async () => {
    try {
      if (!existingPromptId) {
        toast.error('Primero guarda el prompt V2');
        return;
      }

      setDeployingPrompt(true);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;

      const payload: any = {
        product_id: projectId,
        bucket_name: 'gs-minddash-agent-env',
        object_path: `profiling/prompt_upload_${projectId}_v2.yaml`,
      };

      const { ok, data, error } = await postBackend('/prompts_and_examples/prompts/uploadByProductV2', payload);
      if (!ok || !data) {
        const message =
          (data && (data as any).message) || (typeof error === 'string' ? error : 'Error al desplegar prompt V2');
        toast.error(String(message));
        return;
      }

      toast.success('Prompt V2 desplegado correctamente');
    } catch (error) {
      console.error(error);
    } finally {
      setDeployingPrompt(false);
    }
  };

  const loadPromptData = async () => {
    try {
      setLoadingData(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;

      const promptV1IdStorageKey = `minddash:prompt-v1-id:${projectId}`;

      const hydrateFromDirect = async (promptId: string) => {
        const id = (promptId || '').trim();
        if (!id) return false;

        const directResponse = await fetch(`/api/backend/prompts/${id}/direct?product_id=${encodeURIComponent(projectId)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!directResponse.ok) return false;

        const directResult = await directResponse.json().catch(() => null);
        const directPrompt = (directResult as any)?.data?.prompt;
        if (!directPrompt) return false;

        const resolvedPromptId = directPrompt.id_prompt || directPrompt.prompt_id || directPrompt.id;
        if (resolvedPromptId) {
          setExistingPromptId(String(resolvedPromptId));
          localStorage.setItem(promptV1IdStorageKey, String(resolvedPromptId));
        }

        setExistingConfigPrompt(directPrompt.config_prompt);
        const content =
          directPrompt.prompt_content ||
          directPrompt.config_prompt?.prompt_content ||
          directPrompt.config_prompt?.system_prompt ||
          agentRole;
        setAgentRole(content);
        setInitialAgentRole(content);

        const cfg: any = directPrompt.config_prompt || {};
        const fallbackMainRole =
          (typeof cfg.system_prompt === 'string' && cfg.system_prompt) ||
          (typeof directPrompt.prompt_content === 'string' && directPrompt.prompt_content) ||
          '';
        if (typeof cfg.agent_main_role === 'string') {
          setV2AgentMainRole(cfg.agent_main_role);
          setInitialV2AgentMainRole(cfg.agent_main_role);
        } else if (fallbackMainRole) {
          setV2AgentMainRole(fallbackMainRole);
          setInitialV2AgentMainRole(fallbackMainRole);
        }
        if (typeof cfg.business_rules === 'string') {
          setV2BusinessRules(cfg.business_rules);
          setInitialV2BusinessRules(cfg.business_rules);
        }
        if (typeof cfg.additional_considerations === 'string') {
          setV2AdditionalConsiderations(cfg.additional_considerations);
          setInitialV2AdditionalConsiderations(cfg.additional_considerations);
        }

        const advMetricsRaw: any[] = Array.isArray(cfg.advanced_agent_metrics) ? cfg.advanced_agent_metrics : [];
        const advMetrics: AdvancedMetricV2[] = advMetricsRaw
          .filter(m => m && typeof m === 'object')
          .map(m => {
            const paramsRaw: any[] = Array.isArray((m as any).parameters) ? (m as any).parameters : [];
            const params: MetricParameterV2[] = paramsRaw
              .filter(p => p && typeof p === 'object')
              .map(p => ({
                id: makeId(),
                parameter: String((p as any).parameter || ''),
                meaning: String((p as any).meaning || ''),
              }))
              .filter(p => p.parameter || p.meaning);

            return {
              id: makeId(),
              metric_name: String((m as any).name || ''),
              metric: String((m as any).metric || ''),
              parameters: params,
            };
          })
          .filter(m => m.metric_name);
        setV2AdvancedMetrics(advMetrics);
        setInitialV2AdvancedMetricsSerialized(serializeAdvancedMetricsForDirtyCheck(advMetrics));

        const tablesRaw: any[] = Array.isArray(cfg.table_selection_logic) ? cfg.table_selection_logic : [];
        const tablesParsed: TableSelectionLogicV2[] = tablesRaw
          .filter(t => t && typeof t === 'object')
          .map(t => ({
            id: makeId(),
            table_name: String((t as any).table_name || ''),
            usage_instructions: String((t as any).usage_instructions || ''),
            validation: String((t as any).validation || ''),
            important_notes: String((t as any).important_notes || ''),
          }))
          .filter(t => t.table_name);
        setV2TableSelectionLogic(tablesParsed);
        setInitialV2TableSelectionLogicSerialized(serializeTablesForDirtyCheck(tablesParsed));

        const activeMetrics = cfg.enabled_metrics || [];
        setEnabledMetrics(Array.isArray(activeMetrics) ? activeMetrics : []);
        return true;
      };

      let hydratedFromDirect = false;
      const storedPromptId = localStorage.getItem(promptV1IdStorageKey);
      const candidateIds = [existingPromptId, storedPromptId].filter(Boolean) as string[];
      for (const id of candidateIds) {
        try {
          hydratedFromDirect = await hydrateFromDirect(id);
          if (hydratedFromDirect) break;
        } catch {
          hydratedFromDirect = false;
        }
      }

      const promptResponse = await fetch('/api/backend/prompts_and_examples/prompts/getPromptsByproduct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: projectId
        })
      });

      if (promptResponse.ok && !hydratedFromDirect) {
        const promptResult = await promptResponse.json();

        // El backend puede devolver directamente un array o un objeto con propiedad data
        const promptsArray = Array.isArray(promptResult) ? promptResult : (promptResult.data || []);

        if (promptsArray && promptsArray.length > 0) {
          // Filtrar prompts con nombre "System Prompt"
          const systemPrompts = promptsArray.filter((p: any) =>
            p.prompt_name === 'System Prompt' || p.name === 'System Prompt'
          );

          let promptData;
          if (systemPrompts.length > 0) {
            // Ordenar por created_at (el backend no devuelve updated_at) y tomar el más reciente
            const sortedSystemPrompts = [...systemPrompts].sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateB - dateA; // Más reciente primero
            });
            promptData = sortedSystemPrompts[0];
          } else {
            // Si no hay System Prompts, tomar el más reciente de todos
            const sortedPrompts = [...promptsArray].sort((a: any, b: any) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateB - dateA;
            });
            promptData = sortedPrompts[0];
          }

          const promptId = promptData.id_prompt || promptData.prompt_id || promptData.id;
          if (promptId) {
            setExistingPromptId(promptId);
            localStorage.setItem(promptV1IdStorageKey, String(promptId));
          }

          let hydratedAfterPython = false;
          if (promptId) {
            try {
              hydratedAfterPython = await hydrateFromDirect(String(promptId));
            } catch {
              hydratedAfterPython = false;
            }
          }

          if (!hydratedAfterPython) {
            setExistingConfigPrompt(promptData.config_prompt);
            const content = promptData.prompt_content || promptData.config_prompt?.prompt_content || agentRole;
            setAgentRole(content);
            setInitialAgentRole(content);

            const cfg: any = promptData.config_prompt || {};

            const fallbackMainRole =
              (typeof cfg.system_prompt === 'string' && cfg.system_prompt) ||
              (typeof promptData.prompt_content === 'string' && promptData.prompt_content) ||
              '';
            if (typeof cfg.agent_main_role === 'string') {
              setV2AgentMainRole(cfg.agent_main_role);
              setInitialV2AgentMainRole(cfg.agent_main_role);
            } else if (fallbackMainRole) {
              setV2AgentMainRole(fallbackMainRole);
              setInitialV2AgentMainRole(fallbackMainRole);
            }
            if (typeof cfg.business_rules === 'string') {
              setV2BusinessRules(cfg.business_rules);
              setInitialV2BusinessRules(cfg.business_rules);
            }
            if (typeof cfg.additional_considerations === 'string') {
              setV2AdditionalConsiderations(cfg.additional_considerations);
              setInitialV2AdditionalConsiderations(cfg.additional_considerations);
            }

            const advMetricsRaw: any[] = Array.isArray(cfg.advanced_agent_metrics) ? cfg.advanced_agent_metrics : [];
            const advMetrics: AdvancedMetricV2[] = advMetricsRaw
              .filter(m => m && typeof m === 'object')
              .map(m => {
                const paramsRaw: any[] = Array.isArray((m as any).parameters) ? (m as any).parameters : [];
                const params: MetricParameterV2[] = paramsRaw
                  .filter(p => p && typeof p === 'object')
                  .map(p => ({
                    id: makeId(),
                    parameter: String((p as any).parameter || ''),
                    meaning: String((p as any).meaning || ''),
                  }))
                  .filter(p => p.parameter || p.meaning);

                return {
                  id: makeId(),
                  metric_name: String((m as any).name || ''),
                  metric: String((m as any).metric || ''),
                  parameters: params,
                };
              })
              .filter(m => m.metric_name);
            setV2AdvancedMetrics(advMetrics);
            setInitialV2AdvancedMetricsSerialized(serializeAdvancedMetricsForDirtyCheck(advMetrics));

            const tablesRaw: any[] = Array.isArray(cfg.table_selection_logic) ? cfg.table_selection_logic : [];
            const tablesParsed: TableSelectionLogicV2[] = tablesRaw
              .filter(t => t && typeof t === 'object')
              .map(t => ({
                id: makeId(),
                table_name: String((t as any).table_name || ''),
                usage_instructions: String((t as any).usage_instructions || ''),
                validation: String((t as any).validation || ''),
                important_notes: String((t as any).important_notes || ''),
              }))
              .filter(t => t.table_name);
            setV2TableSelectionLogic(tablesParsed);
            setInitialV2TableSelectionLogicSerialized(serializeTablesForDirtyCheck(tablesParsed));

            const activeMetrics = promptData.config_prompt?.enabled_metrics || [];
            setEnabledMetrics(Array.isArray(activeMetrics) ? activeMetrics : []);
          }
        } else {
          // Si no hay prompt existente, usar el rol por defecto
          setAgentRole(defaultRole);
          setInitialAgentRole(defaultRole);
          setV2AgentMainRole(defaultRole);
          setInitialV2AgentMainRole(defaultRole);
          setV2BusinessRules('');
          setInitialV2BusinessRules('');
          setV2AdditionalConsiderations('');
          setInitialV2AdditionalConsiderations('');
          setV2AdvancedMetrics([]);
          setV2TableSelectionLogic([]);
          setInitialV2AdvancedMetricsSerialized(serializeAdvancedMetricsForDirtyCheck([]));
          setInitialV2TableSelectionLogicSerialized(serializeTablesForDirtyCheck([]));
        }
      }

      // Cargar métricas
      const metricsResponse = await fetch('/api/backend/metrics/product', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: projectId
        })
      });

      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        const metricsRaw =
          (metricsResult && metricsResult.data && metricsResult.data.data) ||
          metricsResult.data ||
          metricsResult;
        const metricsData = Array.isArray(metricsRaw) ? metricsRaw : [];
        
        // Filtrar solo métricas válidas (con metric_name y metric_id)
        const validMetrics = metricsData.filter((m: any) => m.metric_id && m.metric_name);
        
        setMetrics(validMetrics.map((m: any) => {
          // Construir string de parámetros desde metric_required_params y metric_optional_params
          const params: string[] = [];
          if (m.metric_required_params && Array.isArray(m.metric_required_params)) {
            params.push(...m.metric_required_params.map((p: string) => `${p} (requerido)`));
          }
          if (m.metric_optional_params && Array.isArray(m.metric_optional_params)) {
            params.push(...m.metric_optional_params.map((p: string) => `${p} (opcional)`));
          }
          const paramsStr = params.length > 0 ? params.join(', ') : 'Sin parámetros';
          
          return {
            id: m.metric_id,
            name: m.metric_name,
            whenToUse: m.metric_description || 'Sin descripción',
            arguments: m.metric_data_query || paramsStr,
            requiredParams: Array.isArray(m.metric_required_params) ? m.metric_required_params : [],
            optionalParams: Array.isArray(m.metric_optional_params) ? m.metric_optional_params : []
          };
        }));
      }

      // Cargar tablas desde la capa semántica (para Tablas y reglas de selección)
      try {
        setLoadingSemanticTables(true);
        const configResponse = await fetch('/api/backend/semantic', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ product_id: projectId })
        });

        if (!configResponse.ok) {
          setV2SemanticTables([]);
          setV2SemanticTablesByName({});
        } else {
          const configResult = await configResponse.json();
          const rawData = configResult?.data?.data || configResult.data || configResult;
          const configs = Array.isArray(rawData?.configs)
            ? rawData.configs
            : Array.isArray(rawData)
              ? rawData
              : [];

          if (configs.length === 0) {
            setV2SemanticTables([]);
            setV2SemanticTablesByName({});
          } else {
            const latestConfig = configs[configs.length - 1];
            const gsUri = latestConfig.object_path_saved || latestConfig.gs_uri || latestConfig.url;
            if (!gsUri) {
              setV2SemanticTables([]);
              setV2SemanticTablesByName({});
            } else {
              const describeResponse = await fetch(`/api/backend/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!describeResponse.ok) {
                setV2SemanticTables([]);
                setV2SemanticTablesByName({});
              } else {
                const describeResult = await describeResponse.json();
                const rawDatasets =
                  (describeResult && describeResult.data && describeResult.data.datasets) ||
                  describeResult?.datasets ||
                  [];

                const datasets: any[] = Array.isArray(rawDatasets)
                  ? rawDatasets
                  : rawDatasets && typeof rawDatasets === 'object'
                    ? Object.values(rawDatasets)
                    : [];

                const mappedTables: Table[] = [];
                const byName: Record<string, { columns: string[] }> = {};

                datasets.forEach((dataset: any, index: number) => {
                  const tableName = dataset.table || dataset.name || 'Unknown';
                  const schema = dataset.schema || 'public';
                  const fullName = `${schema}.${tableName}`;
                  const columnsRaw = dataset.columns || dataset.fields || [];
                  const columns: string[] = Array.isArray(columnsRaw)
                    ? columnsRaw
                        .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.column || c?.field))
                        .filter(Boolean)
                        .map((c: any) => String(c))
                    : [];

                  mappedTables.push({
                    id: `semantic-table-${index}`,
                    name: fullName,
                    selected: false,
                  });
                  byName[fullName] = { columns };
                });

                setV2SemanticTables(mappedTables);
                setV2SemanticTablesByName(byName);
              }
            }
          }
        }
      } catch {
        setV2SemanticTables([]);
        setV2SemanticTablesByName({});
      } finally {
        setLoadingSemanticTables(false);
      }

    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;
      
      // Determinar si es creación o actualización
      const isUpdate = existingPromptId !== null;
      
      // Para actualización usamos directamente el endpoint "direct" (Postgres) para evitar el bug model_dump del backend Python
      const url = isUpdate 
        ? `/api/backend/prompts/${existingPromptId}/direct`
        : '/api/backend/prompts/create';
      const method = isUpdate ? 'PUT' : 'POST';
      
      // Construir el body según el tipo de operación
      let body: any;
      if (isUpdate) {
        const config_prompt = {
          ...(existingConfigPrompt || {}), // Preservar todos los campos existentes
          system_prompt: agentRole,        // Actualizar el system_prompt
          enabled_metrics: enabledMetrics, // Guardar métricas activas
          prompt_type: 'system',
          version: '1.0'
        };
        
        body = {
          id: existingPromptId,
          product_id: projectId,
          name: 'System Prompt',
          prompt_content: agentRole,       // Requerido por el backend Python
          config_prompt,
        };
      } else {
        // Para creación: usar el formato del backend Python
        body = {
          product_id: projectId,
          prompt_content: agentRole,
          name: 'System Prompt',
          prompt_type: 'system',
          content: agentRole,
          version: '1.0'
        };
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(isUpdate ? 'Rol actualizado correctamente' : 'Rol guardado correctamente');

        if (isUpdate) {
          const updatedPrompt = (result as any)?.data?.prompt;
          if (updatedPrompt) {
            const promptId =
              updatedPrompt.id_prompt ||
              updatedPrompt.prompt_id ||
              updatedPrompt.id ||
              (result as any)?.data?.id_prompt;
            if (promptId) {
              setExistingPromptId(String(promptId));
              localStorage.setItem(`minddash:prompt-v1-id:${projectId}`, String(promptId));
            }

            setExistingConfigPrompt(updatedPrompt.config_prompt);
            const content =
              updatedPrompt.prompt_content ||
              updatedPrompt.config_prompt?.prompt_content ||
              updatedPrompt.config_prompt?.system_prompt ||
              agentRole;
            setAgentRole(content);
            setInitialAgentRole(content);
          } else {
            // Fallback mínimo si el backend no devuelve el prompt completo
            setInitialAgentRole(agentRole);
          }
        }
        
        // Si es creación, guardar el ID del nuevo prompt
        if (!isUpdate) {
          const promptId = result?.data?.id_prompt || result?.data?.prompt_id || result?.data?.id;
          if (promptId) {
            setExistingPromptId(promptId);
            localStorage.setItem(`minddash:prompt-v1-id:${projectId}`, String(promptId));
          }
        }
        
        // Recargar datos para mostrar el prompt guardado.
        // En update, evitamos el fetch a Python (getPromptsByproduct) que puede estar stale.
        if (!isUpdate) {
          await loadPromptData();
        }
      } else {
        if (isUpdate && response.status === 404) {
          const createBody = {
            product_id: projectId,
            prompt_content: agentRole,
            name: 'System Prompt',
            prompt_type: 'system',
            content: agentRole,
            version: '1.0',
          };

          const createResponse = await fetch('/api/backend/prompts/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createBody),
          });

          const createResult = await createResponse.json().catch(() => null);

          if (createResponse.ok) {
            toast.success('Rol guardado correctamente');
            const promptId =
              (createResult as any)?.data?.id_prompt ||
              (createResult as any)?.data?.prompt_id ||
              (createResult as any)?.data?.id;
            if (promptId) {
              setExistingPromptId(promptId);
              localStorage.setItem(`minddash:prompt-v1-id:${projectId}`, String(promptId));
            }
            await loadPromptData();
            return;
          }

          toast.error((createResult as any)?.message || (result as any)?.message || 'Error al guardar rol');
          console.error('Error response:', result);
          console.error('Error response (create fallback):', createResult);
          return;
        }

        toast.error((result as any)?.message || 'Error al guardar rol');
        console.error('Error response:', result);
      }
    } catch (error) {
      console.error('Error al guardar rol:', error);
      toast.error('Error al guardar rol');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployPrompt = async () => {
    try {
      if (!existingPromptId) {
        toast.error('Debes guardar el rol antes de desplegar el prompt');
        return;
      }

      if (agentRole !== initialAgentRole) {
        toast.error('Primero guarda los cambios del rol antes de desplegar');
        return;
      }

      setDeployingPrompt(true);

      const bucketName = 'gs-minddash-agent-env';
      const objectPath = `profiling/prompt_upload_${projectId}.yaml`;

      const { ok, data, error } = await postBackend('/prompts_and_examples/prompts/uploadByProduct', {
        product_id: projectId,
        bucket_name: bucketName,
        object_path: objectPath,
      });

      if (!ok || !data) {
        const message =
          (data && (data as any).message) ||
          (typeof error === 'string' ? error : 'Error al desplegar prompt');
        toast.error(String(message));
        return;
      }

      const uploadResult: any = data;
      const promptUrl: string | undefined = uploadResult.url;

      if (!promptUrl) {
        toast.success('Prompt desplegado correctamente (sin URL devuelta)');
        return;
      }

      toast.success('Prompt desplegado correctamente');
    } catch (error: any) {
      toast.error(error?.message || 'Error al desplegar prompt');
    } finally {
      setDeployingPrompt(false);
    }
  };

  const handleToggleMetric = (metricId: string) => {
    setEnabledMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleSaveMetricsSelection = async () => {
    try {
      setLoading(true);
      
      // Guardar las métricas seleccionadas
      // Nota: Guardamos directamente sin recargar porque el backend aún no persiste enabled_metrics
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }
      const token = JSON.parse(authData).accessToken;
      
      const config_prompt = {
        ...(existingConfigPrompt || {}),
        system_prompt: "",
        enabled_metrics: enabledMetrics,
        prompt_type: 'system',
        version: '1.0'
      };
      
      const response = await fetch(`/api/backend/prompts/${existingPromptId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: existingPromptId,
          product_id: projectId,
          prompt_content: agentRole,
          name: 'System Prompt',
          config_prompt
        })
      });
      
      if (response.ok) {
        // NO recargar datos para mantener las métricas seleccionadas visualmente
        // hasta que el backend las persista correctamente
        setShowMetricsModal(false);
        toast.success(`${enabledMetrics.length} métrica(s) activa(s) para este prompt`);
      } else {
        const result = await response.json();
        toast.error(result.message || 'Error al guardar métricas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar selección de métricas');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTables = async () => {
    try {
      setLoading(true);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };
  if (loadingData && !agentRole) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minddash-celeste-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando prompt del asistente...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Rol Principal del Agente */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Prompt</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400">Modo avanzado (V2)</span>
            <button
              type="button"
              onClick={() => setUseAdvancedPromptV2(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                useAdvancedPromptV2
                  ? 'bg-minddash-verde-600 border-minddash-verde-600'
                  : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  useAdvancedPromptV2 ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          {!useAdvancedPromptV2 ? (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-3">
                Define el rol y el comportamiento del asistente
              </label>
              <textarea
                value={agentRole}
                onChange={(e) => setAgentRole(e.target.value)}
                rows={15}
                className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                placeholder="Describe el rol y objetivo del asistente..."
              />
              <div className="flex justify-end mt-4 space-x-3">
                <button
                  onClick={handleSaveRole}
                  disabled={loading || agentRole === initialAgentRole}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave className="w-4 h-4" />
                  <span>{loading ? 'Guardando...' : 'Guardar Rol'}</span>
                </button>
                <button
                  onClick={handleDeployPrompt}
                  disabled={deployingPrompt}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-minddash-celeste-700 to-minddash-celeste-600 hover:from-minddash-celeste-800 hover:to-minddash-celeste-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deployingPrompt ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <FiCloud className="w-4 h-4" />
                  )}
                  <span>{deployingPrompt ? 'Desplegando...' : 'Deploy Prompt'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Rol principal del agente <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={v2AgentMainRole}
                    onChange={(e) => setV2AgentMainRole(e.target.value)}
                    rows={6}
                    className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                    placeholder="Ej: Eres un analista de datos de la empresa..."
                  />
                  <div className="mt-1 flex justify-end text-xs text-gray-500">
                    {(v2AgentMainRole || '').length} caracteres
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Este texto se guarda como `prompt_content`.
                  </p>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        Métricas del agente <span className="text-xs text-gray-400">(opcional)</span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Si agregas métricas, completa cómo se usan (especificación) y el significado de cada parámetro.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={v2SelectedMetricId || undefined}
                        onValueChange={(next) => {
                          setV2SelectedMetricId(next);
                          if (next) {
                            setHighlightAddMetricCue(false);
                            setTimeout(() => setHighlightAddMetricCue(true), 0);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[220px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Seleccionar métrica…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          {metrics.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!v2SelectedMetricId) {
                            toast.error('Por favor selecciona una métrica primero');
                            return;
                          }
                          handleAddAdvancedMetricFromCatalog(v2SelectedMetricId);
                          setV2SelectedMetricId('');
                        }}
                        disabled={!v2SelectedMetricId}
                        className={`flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors ${
                          highlightAddMetricCue ? 'semantic-cue-highlight' : ''
                        }`}
                      >
                        <FiPlus className="w-4 h-4" />
                        <span className="text-sm">Agregar</span>
                      </button>
                    </div>
                  </div>

                  {v2AdvancedMetrics.length === 0 ? (
                    <div className="text-sm text-gray-500">Todavía no agregaste métricas. Este paso es opcional.</div>
                  ) : (
                    <div className="space-y-4">
                      {v2AdvancedMetrics.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-minddash-elevated shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-minddash-celeste-100 dark:bg-minddash-celeste-900/30 rounded-lg flex items-center justify-center">
                                  <FiBarChart className="w-4 h-4 text-minddash-celeste-700 dark:text-minddash-celeste-300" />
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">{m.metric_name}</div>
                              </div>
                              <div className="mt-3">
                                <label className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2 flex items-center gap-1">
                                  Especificación de la métrica <span className="text-red-500">*</span>
                                </label>
                                <input
                                  value={m.metric}
                                  onChange={(e) => handleUpdateAdvancedMetric(m.id, { metric: e.target.value })}
                                  className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                                  placeholder="Ej: calcular el KPI usando SQL y devolver value + unit + time_range…"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAdvancedMetric(m.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar métrica"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-gray-700 dark:text-gray-400 flex items-center gap-1">
                                Parámetros <span className="text-red-500">*</span>
                              </label>
                            </div>

                            {m.parameters.length === 0 ? (
                              <p className="text-xs text-gray-500">Agrega al menos un parámetro o trae los de la métrica.</p>
                            ) : (
                              <div className="space-y-2">
                                {m.parameters.map((p) => (
                                  <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                                    <div className="md:col-span-4">
                                      <input
                                        value={p.parameter}
                                        disabled
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors disabled:opacity-80 disabled:cursor-not-allowed"
                                        placeholder="Nombre del parámetro"
                                      />
                                    </div>
                                    <div className="md:col-span-7">
                                      <input
                                        value={p.meaning}
                                        onChange={(e) => handleUpdateMetricParam(m.id, p.id, { meaning: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                                        placeholder="Qué significa y cómo debe interpretarlo el agente"
                                      />
                                    </div>
                                    <div className="md:col-span-1 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMetricParam(m.id, p.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Eliminar parámetro"
                                      >
                                        <FiTrash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        Tablas y reglas de selección <span className="text-red-500">*</span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Define qué tablas usar y cómo validarlas. Ayuda al agente a elegir correctamente la fuente de datos.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={v2SelectedTableName || undefined}
                        onValueChange={(next) => {
                          setV2SelectedTableName(next);
                          if (next) {
                            setHighlightAddTableCue(false);
                            setTimeout(() => setHighlightAddTableCue(true), 0);
                          }
                        }}
                        disabled={loadingSemanticTables}
                      >
                        <SelectTrigger className="w-[260px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                          <SelectValue placeholder="Seleccionar tabla…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          {v2SemanticTables.map((t) => (
                            <SelectItem key={t.id} value={t.name}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!v2SelectedTableName) {
                            toast.error('Por favor selecciona una tabla primero');
                            return;
                          }
                          handleAddTableLogicFromSemantic(v2SelectedTableName);
                          setV2SelectedTableName('');
                        }}
                        disabled={!v2SelectedTableName}
                        className={`flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors ${
                          highlightAddTableCue ? 'semantic-cue-highlight' : ''
                        }`}
                      >
                        <FiPlus className="w-4 h-4" />
                        <span className="text-sm">Agregar</span>
                      </button>
                    </div>
                  </div>

                  {loadingSemanticTables ? (
                    <div className="text-sm text-gray-500">Cargando tablas desde la capa semántica…</div>
                  ) : v2SemanticTables.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay tablas disponibles desde la capa semántica.</div>
                  ) : null}

                  {v2TableSelectionLogic.length === 0 ? (
                    <div className="text-sm text-gray-500">Todavía no agregaste tablas.</div>
                  ) : (
                    <div className="space-y-4">
                      {v2TableSelectionLogic.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-minddash-elevated shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-minddash-verde-100 dark:bg-minddash-verde-900/30 rounded-lg flex items-center justify-center">
                                  <FiDatabase className="w-4 h-4 text-minddash-verde-700 dark:text-minddash-verde-300" />
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.table_name || 'Nueva tabla'}</div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                                  Nombre de la tabla <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={(t.table_name || undefined) as any}
                                  onValueChange={(next) => {
                                    const defaults = getSemanticTableDefaults(next);
                                    handleUpdateTableLogic(t.id, {
                                      table_name: next,
                                      usage_instructions: t.usage_instructions || defaults.usage_instructions,
                                      validation: t.validation || defaults.validation,
                                      important_notes: t.important_notes || defaults.important_notes,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                                    <SelectValue placeholder="Seleccionar…" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                    {v2SemanticTables.map((tbl) => (
                                      <SelectItem key={tbl.id} value={tbl.name}>
                                        {tbl.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                                  Cómo usarla
                                </label>
                                <input
                                  value={t.usage_instructions}
                                  onChange={(e) => handleUpdateTableLogic(t.id, { usage_instructions: e.target.value })}
                                  className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                                  placeholder="Qué contiene y cuándo conviene consultarla"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                                  Validación
                                </label>
                                <input
                                  value={t.validation}
                                  onChange={(e) => handleUpdateTableLogic(t.id, { validation: e.target.value })}
                                  className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                                  placeholder="Reglas para validar resultados (rangos, no nulos, coherencia, etc.)"
                                />
                              </div>
                              <div>
                                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                                  Notas importantes
                                </label>
                                <input
                                  value={t.important_notes}
                                  onChange={(e) => handleUpdateTableLogic(t.id, { important_notes: e.target.value })}
                                  className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                                  placeholder="Limitaciones, columnas clave, join recomendado, warnings…"
                                />
                              </div>
                            </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTableLogic(t.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Eliminar tabla"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reglas de negocio (mover al final y expandible) */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <details
                    open={showBusinessRules}
                    onToggle={(e) => setShowBusinessRules((e.currentTarget as HTMLDetailsElement).open)}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-minddash-elevated/40"
                  >
                    <summary
                      className="flex items-center justify-between px-3 py-2 cursor-pointer select-none text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      <span>
                        Reglas de negocio <span className="text-red-500">*</span>
                      </span>
                      <span className="text-xs text-gray-500">{showBusinessRules ? 'Ocultar' : 'Mostrar'}</span>
                    </summary>
                    {showBusinessRules && (
                      <div className="px-3 pb-4">
                        <textarea
                          value={v2BusinessRules}
                          onChange={(e) => setV2BusinessRules(e.target.value)}
                          rows={6}
                          className="w-full min-h-[200px] bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-3 text-gray-900 dark:text-white resize-y focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                          placeholder="Incluye restricciones, definiciones y criterios de negocio que el agente debe respetar..."
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className={v2BusinessRulesMissing ? 'text-red-500' : 'text-gray-500'}>
                            {v2BusinessRulesMissing ? 'Obligatorio' : ' '}
                          </span>
                          <span className="text-gray-500">{(v2BusinessRules || '').length} caracteres</span>
                        </div>
                      </div>
                    )}
                  </details>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Consideraciones adicionales
                  </label>
                  <textarea
                    value={v2AdditionalConsiderations}
                    onChange={(e) => setV2AdditionalConsiderations(e.target.value)}
                    rows={4}
                    className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white resize-none focus:outline-none focus:border-minddash-celeste-600 dark:focus:border-minddash-celeste-500 transition-colors"
                    placeholder="Notas extra, supuestos, criterios especiales, limitaciones o guías adicionales para el agente..."
                  />
                  <div className="mt-1 flex justify-end text-xs text-gray-500">
                    {(v2AdditionalConsiderations || '').length} caracteres
                  </div>
                </div>

              </div>

              <div className="flex flex-col gap-3 mt-6">
                <div className="flex items-center justify-between gap-3">
                  {(v2BusinessRulesMissing || v2HasTablesWithoutName) && (
                    <div className="shrink-0">
                      <Alert className="inline-flex w-auto max-w-md items-start gap-3 border-yellow-500/40 bg-yellow-50/50 p-3 text-yellow-900 dark:border-yellow-400/30 dark:bg-yellow-950/20 dark:text-yellow-100">
                        <div className="p-1.5 rounded-md bg-yellow-500/15 text-yellow-700 dark:text-yellow-100">
                          <FiInfo className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <AlertTitle className="flex items-center gap-2">
                            Antes de guardar
                          </AlertTitle>
                          <AlertDescription className="space-y-1">
                            {v2BusinessRulesMissing && (
                              <div>
                                Completa <span className="font-medium">Reglas de negocio</span> (obligatorio).
                              </div>
                            )}
                            {v2HasTablesWithoutName && (
                              <div>
                                Revisa <span className="font-medium">Tablas y reglas de selección</span>: hay al menos una fila sin
                                <span className="font-medium"> Nombre de la tabla</span>.
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                      </Alert>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={
                        loading ||
                        (
                          v2AgentMainRole === initialV2AgentMainRole &&
                          v2BusinessRules === initialV2BusinessRules &&
                          v2AdditionalConsiderations === initialV2AdditionalConsiderations &&
                          serializeAdvancedMetricsForDirtyCheck(v2AdvancedMetrics) === initialV2AdvancedMetricsSerialized &&
                          serializeTablesForDirtyCheck(v2TableSelectionLogic) === initialV2TableSelectionLogicSerialized
                        )
                      }
                      onClick={handleSavePromptV2}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSave className="w-4 h-4" />
                      <span>{loading ? 'Guardando...' : 'Guardar (V2)'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={deployingPrompt}
                      onClick={handleDeployPromptV2}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-minddash-celeste-700 to-minddash-celeste-600 hover:from-minddash-celeste-800 hover:to-minddash-celeste-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deployingPrompt ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <FiCloud className="w-4 h-4" />
                      )}
                      <span>{deployingPrompt ? 'Desplegando...' : 'Deploy Prompt'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Selección de Métricas */}
      <ModalPortal>
        <AnimatePresence>
          {showMetricsModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-minddash-card rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Seleccionar Métricas para el Agente</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Elige qué métricas estarán disponibles en este prompt
                  </p>
                </div>
                <button 
                  onClick={() => setShowMetricsModal(false)} 
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {metrics.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No hay métricas disponibles.</p>
                    <p className="text-sm text-gray-500 mt-2">Crea métricas en la sección &quot;Métricas&quot; primero.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.map((metric, idx) => {
                      const isEnabled = enabledMetrics.includes(metric.id);
                      return (
                        <motion.div
                          key={`metric-${metric.id}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-lg border transition-all cursor-pointer ${
                            isEnabled 
                              ? 'bg-minddash-verde-900/20 border-minddash-verde-700/50 hover:bg-minddash-verde-900/30' 
                              : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                          }`}
                          onClick={() => handleToggleMetric(metric.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isEnabled 
                                  ? 'bg-minddash-verde-600 border-minddash-verde-600' 
                                  : 'border-gray-600'
                              }`}>
                                {isEnabled && <FiCheck className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-white mb-1">{metric.name}</h4>
                              <p className="text-sm text-gray-400 mb-2">
                                {metric.whenToUse || 'Sin descripción'}
                              </p>
                              {metric.arguments && (
                                <p className="text-xs text-gray-500 font-mono truncate">
                                  {metric.arguments}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {enabledMetrics.length} métrica(s) seleccionada(s)
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setShowMetricsModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMetricsSelection}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Guardando...' : 'Guardar Selección'}
                  </button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </motion.div>
  );
}
