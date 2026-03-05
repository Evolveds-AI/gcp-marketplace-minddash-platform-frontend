'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiEdit2,
  FiPlus,
  FiX,
  FiEye,
  FiTrash2,
  FiCloud,
} from '@/lib/icons';
import { toast } from 'sonner';
import { postBackend } from '@/lib/api-helpers';
import ModalPortal from '@/components/ui/ModalPortal';

interface ChatbotMetricsProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface MetricDefinition {
  id: string;
  name: string;
  type: string;
  description?: string;
  data_query?: string;
  required_params?: string[];
  optional_params?: string[];
}

interface Table {
  id: string;
  name: string;
  columns: string;
}

interface SemanticConfig {
  id: string;
  schema_name: string;
  table_name: string;
  columns: any[];
}

interface MetricVariablesSectionProps {
  title: string;
  vars: string[];
  newVar: string;
  onNewVarChange: (value: string) => void;
  onAddVar: () => void;
  onRemoveVar: (value: string) => void;
}

const MetricVariablesSection: React.FC<MetricVariablesSectionProps> = ({
  title,
  vars,
  newVar,
  onNewVarChange,
  onAddVar,
  onRemoveVar,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</label>
    <div className="space-y-2">
      {vars.map((varName) => (
        <div
          key={varName}
          className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4"
        >
          <span className="text-gray-900 dark:text-white text-sm">{varName}</span>
          <button
            onClick={() => onRemoveVar(varName)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newVar}
          onChange={(e) => onNewVarChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddVar()}
          placeholder="Nueva variable"
          className="flex-1 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 text-sm"
        />
        <button
          onClick={onAddVar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

export default function ChatbotMetrics({ chatbotId, chatbotName, showNotification }: ChatbotMetricsProps) {
  const [loading, setLoading] = useState(true);
  const [searchMetric, setSearchMetric] = useState('');
  const [metricsDefinitions, setMetricsDefinitions] = useState<MetricDefinition[]>([]);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [metricName, setMetricName] = useState('');
  const [metricDescription, setMetricDescription] = useState('');
  const [queryText, setQueryText] = useState('');
  const [requiredVars, setRequiredVars] = useState<string[]>([]);
  const [optionalVars, setOptionalVars] = useState<string[]>([]);
  const [newRequiredVar, setNewRequiredVar] = useState('');
  const [newOptionalVar, setNewOptionalVar] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [metricToDelete, setMetricToDelete] = useState<MetricDefinition | null>(null);
  const [deployingMetrics, setDeployingMetrics] = useState(false);

  const sqlCommands = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY'];

  // Cargar métricas y tablas al montar
  useEffect(() => {
    loadMetrics();
    loadSemanticTables();
  }, [chatbotId]);

  // Función helper para parsear datasets del YAML
  const parseYAMLDatasets = (yamlContent: string): Table[] => {
    try {
      // Extraer la sección de datasets del YAML
      const datasetsMatch = yamlContent.match(/datasets:\s*([\s\S]*?)(?=\n\S|$)/);
      if (!datasetsMatch) return [];

      const datasetsSection = datasetsMatch[1];
      const tableMatches = Array.from(datasetsSection.matchAll(/^\s{2}([^:]+):/gm));
      
      const tables: Table[] = [];
      let index = 0;
      
      for (const match of tableMatches) {
        const fullTableName = match[1].trim();
        
        // Contar columnas (dimensions + measures)
        const tableRegex = new RegExp(`${fullTableName.replace(/\./g, '\\.')}:[\\s\\S]*?(?=\\n  \\S|$)`);
        const tableSection = yamlContent.match(tableRegex)?.[0] || '';
        
        const dimensionsMatch = tableSection.match(/dimensions:\s*([\s\S]*?)(?=\n\s{4}\S|measures:|$)/);
        const measuresMatch = tableSection.match(/measures:\s*([\s\S]*?)(?=\n  \S|$)/);
        
        let columnCount = 0;
        if (dimensionsMatch) {
          const dimensions = dimensionsMatch[1].match(/^\s{6}\S+:/gm) || [];
          columnCount += dimensions.length;
        }
        if (measuresMatch) {
          const measures = measuresMatch[1].match(/^\s{6}\S+:/gm) || [];
          columnCount += measures.length;
        }
        
        tables.push({
          id: `table-${index}`,
          name: fullTableName,
          columns: `${columnCount} cols`
        });
        index++;
      }
      
      return tables;
    } catch (error) {
      console.error('[parseYAMLDatasets] Error:', error);
      return [];
    }
  };

  const loadSemanticTables = async () => {
    try {
      setLoadingTables(true);
      setTablesError(null);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;
      
      const parsedAuth = JSON.parse(authData);
      const token = parsedAuth.accessToken;
      
      // Paso 1: Obtener las configuraciones para conseguir el gs_uri
      const configResponse = await fetch('/api/backend/semantic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: chatbotId
        })
      });

      if (!configResponse.ok) {
        console.error('[ChatbotMetrics] Error obteniendo configs:', configResponse.status);
        setTables([]);
        setTablesError('No se pudieron cargar las configuraciones de la capa semántica.');
        return;
      }

      const configResult = await configResponse.json();
      
      // Normalización robusta igual que en ChatbotSemanticLayer
      const rawData = configResult.data;
      const configs = Array.isArray(rawData?.configs)
        ? rawData.configs
        : Array.isArray(rawData)
          ? rawData
          : [];

      if (configs.length === 0) {
        // Intentar cargar desde localStorage como fallback
        const yamlFromStorage = localStorage.getItem(`semantic-yaml-${chatbotId}`);
        if (yamlFromStorage) {
          try {
            // Parsear el YAML para extraer las tablas
            const datasets = parseYAMLDatasets(yamlFromStorage);
            setTables(datasets);
            return;
          } catch (error) {
            console.error('[ChatbotMetrics] Error parseando YAML:', error);
          }
        }

        setTables([]);
        return;
      }

      // Usar la última configuración (la más reciente)
      // Buscar la URI en cualquiera de las propiedades posibles (paridad con ChatbotSemanticLayer)
      const latestConfig = configs[configs.length - 1];
      const gsUri = latestConfig.object_path_saved || latestConfig.gs_uri || latestConfig.url;
      
      if (!gsUri) {
        console.error('[ChatbotMetrics] No se encontró URI válida (object_path_saved/gs_uri/url)');
        setTables([]);
        setTablesError('No se encontró la ruta de la capa semántica activa.');
        return;
      }

      // Paso 2: Obtener la descripción del YAML parseado
      const describeResponse = await fetch(`/api/backend/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!describeResponse.ok) {
        console.error('[ChatbotMetrics] Error obteniendo describe:', describeResponse.status);
        setTables([]);
        setTablesError('No se pudo leer el detalle de la capa semántica activa.');
        return;
      }

      const describeResult = await describeResponse.json();
      
      // Lógica robusta copiada de ChatbotSemanticLayer.tsx para extraer datasets
      const rawDatasets = 
        (describeResult && describeResult.data && describeResult.data.datasets) ||
        describeResult?.datasets || 
        [];
        
      const datasets: any[] = Array.isArray(rawDatasets)
        ? rawDatasets
        : rawDatasets && typeof rawDatasets === 'object'
          ? Object.values(rawDatasets)
          : [];
      
      // Mapear datasets a tablas
      const mappedTables: Table[] = datasets.map((dataset: any, index: number) => {
        const tableName = dataset.table || dataset.name || 'Unknown';
        const schema = dataset.schema || 'public';
        const columns = dataset.columns || dataset.fields || [];
        const columnCount = Array.isArray(columns) ? columns.length : 0;
        
        return {
          id: `table-${index}`,
          name: `${schema}.${tableName}`,
          columns: `${columnCount} cols`
        };
      });
      
      setTables(mappedTables);
      
    } catch (error) {
      console.error('[ChatbotMetrics] Error al cargar tablas semánticas:', error);
      setTables([]);
      setTablesError('Error al cargar tablas de la capa semántica.');
    } finally {
      setLoadingTables(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        console.error('No se encontró evolve-auth en localStorage');
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      
      const parsedAuth = JSON.parse(authData);
      const token = parsedAuth.accessToken;
      
      const response = await fetch('/api/backend/metrics/product', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: chatbotId
        })
      });

      if (response.ok) {
        const result = await response.json();
        const metricsData = Array.isArray(result.data) ? result.data : [];
        
        // El backend Python devuelve: metric_id, metric_name, metric_description, metric_data_query
        const filteredMetrics = metricsData.filter((m: any) => 
          m && (m.metric_id || m.id) && (m.metric_name || m.name)
        );
        
        const mappedMetrics = filteredMetrics.map((m: any) => ({
          id: m.metric_id || m.id,
          name: m.metric_name || m.name || 'Sin nombre',
          type: m.metric_type || m.data_type || 'Número',
          description: m.metric_description || m.description,
          data_query: cleanBackendQueryText(m.metric_data_query || m.data_query),
          required_params: m.metric_required_params || m.required_params || [],
          optional_params: m.metric_optional_params || m.optional_params || []
        }));
        
        setMetricsDefinitions(mappedMetrics);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        if (response.status === 401) {
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        setMetricsDefinitions([]);
      }
    } catch (error) {
      console.error('Error al cargar métricas:', error);
      toast.error('Error al cargar métricas');
      setMetricsDefinitions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMetrics = metricsDefinitions.filter(metric =>
    metric?.name?.toLowerCase().includes(searchMetric.toLowerCase())
  );

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, [chatbotId]);

  const normalizeQueryText = (q: string): string => {
    if (!q) return '';
    return q
      .replace(/\r\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/[\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanBackendQueryText = (raw: any): string => {
    if (raw === null || raw === undefined) return '';
    let s = String(raw).trim();

    // Quitar comillas exteriores si el backend guardó el string JSON serializado
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1);
    }

    // Reemplazar secuencias escapadas comunes por espacios y normalizar
    return s
      .replace(/\\n/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleCommandClick = (command: string) => {
    setQueryText(prev => prev + ` ${command} `);
  };

  const handleInsertFromTable = (tableName: string) => {
    setQueryText(prev => {
      const trimmed = prev.trimEnd();
      const snippet = `\nFROM ${tableName}`;
      if (trimmed.includes(`FROM ${tableName}`)) {
        return trimmed;
      }
      return `${trimmed}${snippet}\n`;
    });
  };

  const handleInsertJoinTable = (tableName: string) => {
    setQueryText(prev => {
      const trimmed = prev.trimEnd();
      const snippet = `\nJOIN ${tableName} ON `;
      if (trimmed.includes(`JOIN ${tableName}`)) {
        return trimmed;
      }
      return `${trimmed}${snippet}`;
    });
  };

  const handleEditMetric = (metric: MetricDefinition) => {
    if (!metric || !metric.name) {
      toast.error('Métrica inválida');
      return;
    }
    setEditingMetric(metric);
    setMetricName(metric.name);
    setMetricDescription(metric.description || '');
    setQueryText(metric.data_query || '');
    setRequiredVars(Array.isArray(metric.required_params) ? metric.required_params : []);
    setOptionalVars(Array.isArray(metric.optional_params) ? metric.optional_params : []);
    setShowModal(true);
  };

  const handleCreateMetric = () => {
    setEditingMetric(null);
    setMetricName('');
    setMetricDescription('');
    setQueryText('SELECT user_id, saved_money WHERE BETWEEN {{date_start}} AND {{date_end}} AND country = {{filter_list_1}}');
    setRequiredVars(['filter_list_1', 'filter_list_2', 'date_start', 'date_end', 'group_fields']);
    setOptionalVars([]);
    setShowModal(true);
  };

  const handleViewMetric = (metric: MetricDefinition) => {
    if (!metric || !metric.name) {
      toast.error('Métrica inválida');
      return;
    }
    setSelectedMetric(metric);
    setShowDetailModal(true);
  };

  const handleDeleteMetric = (metric: MetricDefinition) => {
    if (!metric || !metric.id) {
      toast.error('Métrica inválida');
      return;
    }
    setMetricToDelete(metric);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!metricToDelete?.id) return;

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/backend/metrics/${metricToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Métrica eliminada correctamente');
        setShowDeleteModal(false);
        setMetricToDelete(null);
        loadMetrics();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Error al eliminar métrica');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar métrica');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setMetricToDelete(null);
  };

  const handleDeployMetrics = async () => {
    try {
      setDeployingMetrics(true);

      const bucketName = 'gs-minddash-agent-env';
      const objectPath = `profiling/metrics_upload_${chatbotId}.yaml`;

      const { ok, data, error } = await postBackend('/metrics/upload-by-product', {
        product_id: chatbotId,
        bucket_name: bucketName,
        object_path: objectPath,
      });

      if (!ok || !data?.success || !data.data) {
        const message =
          (data && (data.message || (data as any).error)) ||
          (typeof error === 'string' ? error : 'Error al desplegar métricas');
        showNotification('error', String(message));
        toast.error(String(message));
        return;
      }

      const result = data.data as { status?: string; url?: string };
      const metricsUrl = result.url;

      const msg = metricsUrl
        ? 'Métricas desplegadas correctamente usando upload-by-product'
        : 'Métricas generadas y publicadas en YAML (sin URL de configuración devuelta)';

      showNotification('success', msg);
      toast.success(msg);
    } catch (e: any) {
      const msg = e?.message || 'Error al desplegar métricas';
      showNotification('error', msg);
      toast.error(msg);
    } finally {
      setDeployingMetrics(false);
    }
  };

  const handleSaveMetric = async () => {
    if (!metricName.trim()) {
      toast.error('El nombre de la métrica es requerido');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;
      const endpoint = editingMetric 
        ? `/api/backend/metrics/${editingMetric.id}`
        : '/api/backend/metrics/create';
      
      // El backend espera null o array con elementos, no array vacío
      const autoDescription = `Variables obligatorias: ${requiredVars.join(', ') || 'ninguna'}. Variables opcionales: ${optionalVars.join(', ') || 'ninguna'}`;
      const finalDescription = metricDescription.trim() || autoDescription;

      const requestBody = editingMetric ? {
        id: editingMetric.id,
        product_id: chatbotId,
        name: metricName,
        description: finalDescription,
        data_query: normalizeQueryText(queryText),
        required_params: requiredVars.length > 0 ? requiredVars : null,
        optional_params: optionalVars.length > 0 ? optionalVars : null
      } : {
        product_id: chatbotId,
        name: metricName,
        description: finalDescription,
        data_query: normalizeQueryText(queryText),
        required_params: requiredVars.length > 0 ? requiredVars : null,
        optional_params: optionalVars.length > 0 ? optionalVars : null
      };

      const response = await fetch(endpoint, {
        method: editingMetric ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        toast.success(editingMetric ? 'Métrica actualizada' : 'Métrica creada');
        setShowModal(false);
        loadMetrics();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al guardar:', errorData);
        toast.error(errorData.message || 'Error al guardar métrica');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar métrica');
    }
  };

  const handleAddRequiredVar = () => {
    if (newRequiredVar.trim() && !requiredVars.includes(newRequiredVar.trim())) {
      setRequiredVars([...requiredVars, newRequiredVar.trim()]);
      setNewRequiredVar('');
    }
  };

  const handleAddOptionalVar = () => {
    if (newOptionalVar.trim() && !optionalVars.includes(newOptionalVar.trim())) {
      setOptionalVars([...optionalVars, newOptionalVar.trim()]);
      setNewOptionalVar('');
    }
  };

  const handleRemoveRequiredVar = (varName: string) => {
    setRequiredVars(requiredVars.filter(v => v !== varName));
  };

  const handleRemoveOptionalVar = (varName: string) => {
    setOptionalVars(optionalVars.filter(v => v !== varName));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchMetric}
                onChange={(e) => setSearchMetric(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-minddash-elevated py-2 pl-9 pr-4 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder-gray-500 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="Buscar métricas..."
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleDeployMetrics}
                disabled={deployingMetrics}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generar y publicar el YAML de métricas en el agente"
              >
                {deployingMetrics ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <FiCloud className="w-4 h-4" />
                )}
                <span>{deployingMetrics ? 'Deploy en curso' : 'Deploy métricas'}</span>
              </button>
              <button
                onClick={handleCreateMetric}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-minddash-elevated dark:hover:bg-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                <span>Nueva métrica</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              {metricsDefinitions.length} métrica{metricsDefinitions.length === 1 ? '' : 's'} definida{metricsDefinitions.length === 1 ? '' : 's'}
            </span>
            <span className="mt-1 sm:mt-0">
              {tables.length > 0
                ? `${tables.length} tabla${tables.length === 1 ? '' : 's'} disponibles desde la capa semántica`
                : 'Sin tablas de capa semántica disponibles'}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50/50 dark:bg-minddash-elevated/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nombre de métrica</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tipo de Métrica</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-minddash-elevated">
                {filteredMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <FiSearch className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {searchMetric ? 'No se encontraron métricas' : 'No hay métricas definidas'}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4">
                        {searchMetric ? 'Intenta con otros términos de búsqueda' : 'Crea la primera métrica para este chatbot'}
                      </p>
                      {!searchMetric && (
                        <button
                          onClick={() => setShowModal(true)}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors text-sm"
                        >
                          <FiPlus className="w-4 h-4" />
                          Crear Métrica
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMetrics.map((metric) => (
                    <tr key={metric.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {metric.name || 'Sin nombre'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {metric.type || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleViewMetric(metric)}
                            className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            title="Ver detalles"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditMetric(metric)}
                            className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            title="Editar"
                          >
                            <FiEdit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMetric(metric)}
                            className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                            title="Eliminar"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Modal Crear/Editar */}
      <ModalPortal>
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {editingMetric ? 'Editar Métrica' : 'Crear/Editar Métrica'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Define una nueva métrica para tu chatbot.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de la Métrica</label>
                    <input
                      type="text"
                      value={metricName}
                      onChange={(e) => setMetricName(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                      placeholder="Ej. Usuarios Activos Diarios"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción de la Métrica</label>
                    <textarea
                      value={metricDescription}
                      onChange={(e) => setMetricDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-4 text-gray-900 dark:text-white text-sm"
                      placeholder="Ej. Número de usuarios únicos que interactúan con el producto cada día"
                    />
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Se usa para documentar la métrica en el panel y compartir contexto con otros equipos.
                    </p>
                  </div>

                  <MetricVariablesSection
                    title="Variables de la Métrica Obligatoria"
                    vars={requiredVars}
                    newVar={newRequiredVar}
                    onNewVarChange={setNewRequiredVar}
                    onAddVar={handleAddRequiredVar}
                    onRemoveVar={handleRemoveRequiredVar}
                  />

                  <MetricVariablesSection
                    title="Variables de la Métrica Opcionales"
                    vars={optionalVars}
                    newVar={newOptionalVar}
                    onNewVarChange={setNewOptionalVar}
                    onAddVar={handleAddOptionalVar}
                    onRemoveVar={handleRemoveOptionalVar}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Query Builder</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sqlCommands.map((command) => (
                        <button
                          key={command}
                          onClick={() => handleCommandClick(command)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-minddash-elevated dark:hover:bg-gray-700 dark:text-gray-300 text-xs font-medium rounded"
                        >
                          {command}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      rows={8}
                      className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 px-4 text-gray-900 dark:text-white font-mono text-sm"
                      placeholder="SELECT ..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tablas Accesibles</label>
                    <div className="space-y-2">
                      {loadingTables ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2" />
                          <p className="text-gray-600 dark:text-gray-400 text-xs">Cargando tablas...</p>
                        </div>
                      ) : tablesError ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg py-3 px-4 text-red-700 dark:bg-red-900/20 dark:border-red-700/50 dark:text-red-400 text-xs">
                          {tablesError}
                        </div>
                      ) : tables.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg py-3 px-4 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-yellow-400 text-xs">
                          No hay tablas configuradas. Primero configura la capa semántica.
                        </div>
                      ) : (
                        tables.map((table) => (
                          <div
                            key={table.id}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4 gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => handleInsertFromTable(table.name)}
                              className="flex-1 text-left"
                              title="Insertar FROM con esta tabla"
                            >
                              <span className="block text-gray-900 dark:text-white text-sm font-medium">{table.name}</span>
                              <span className="block text-gray-600 dark:text-gray-400 text-xs">{table.columns}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertJoinTable(table.name)}
                              className="px-2 py-1 text-[11px] rounded-md border border-blue-600 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-600/20 transition-colors"
                              title="Insertar JOIN con esta tabla"
                            >
                              JOIN
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                <button onClick={() => setShowModal(false)} className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSaveMetric}
                  disabled={
                    !metricName.trim() ||
                    Boolean(editingMetric &&
                      metricName === editingMetric.name &&
                      queryText === (editingMetric.data_query || '') &&
                      metricDescription === (editingMetric.description || '') &&
                      JSON.stringify(requiredVars) === JSON.stringify(editingMetric.required_params || []) &&
                      JSON.stringify(optionalVars) === JSON.stringify(editingMetric.optional_params || []))
                  }
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingMetric ? 'Actualizar Métrica' : 'Crear Métrica'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalles de Métrica */}
      <AnimatePresence>
        {showDetailModal && selectedMetric && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <p className="text-sm uppercase tracking-wide text-blue-400">Detalles de la métrica</p>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{selectedMetric.name}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {selectedMetric.id}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedMetric(null);
                  }}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <section className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300 mb-2">Descripción</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {selectedMetric.description || 'Sin descripción registrada'}
                  </p>
                </section>

                <section className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300">Query SQL</h3>
                    <span className="text-xs text-gray-500">Solo lectura</span>
                  </div>
                  <pre className="bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-xs text-gray-800 dark:text-blue-100 overflow-auto">
                    {selectedMetric.data_query || 'Sin query definido'}
                  </pre>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300 mb-2">Parámetros requeridos</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMetric.required_params?.length
                        ? selectedMetric.required_params.map((param) => (
                            <span
                              key={`req-${param}`}
                              className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                            >
                              {param}
                            </span>
                          ))
                        : <span className="text-xs text-gray-500">Ninguno</span>}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300 mb-2">Parámetros opcionales</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMetric.optional_params?.length
                        ? selectedMetric.optional_params.map((param) => (
                            <span
                              key={`opt-${param}`}
                              className="px-3 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20"
                            >
                              {param}
                            </span>
                          ))
                        : <span className="text-xs text-gray-500">Ninguno</span>}
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Confirmación de Eliminación */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && metricToDelete && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-minddash-card rounded-lg shadow-2xl border border-red-200 dark:border-red-500/30 w-full max-w-md"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10 text-red-400">
                    <FiTrash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-red-600 dark:text-red-400">Eliminar métrica</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{metricToDelete.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  ¿Estás seguro que deseas eliminar esta métrica? Esta acción no se puede deshacer y podría afectar dashboards que dependan de ella.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={handleCancelDelete}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
                  >
                    Eliminar definitivamente
                  </button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </>
  );
}
