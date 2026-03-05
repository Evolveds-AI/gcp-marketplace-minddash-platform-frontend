'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiServer, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiSearch, FiCode, FiCloud, FiClock, FiExternalLink, FiRefreshCw, FiAlertTriangle } from '@/lib/icons';
import { useThemeMode } from '@/hooks/useThemeMode';
import { StatusBadge } from './StatusBadge';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DeployConfig {
  id: string;
  product_id: string;
  environment: string;
  deploy_url?: string;
  api_endpoint?: string;
  config_json?: Record<string, any>;
  version?: string;
  is_active: boolean;
  created_at?: string;
}

interface AgentDeployData {
  id: string;
  product_id: string;
  bucket_config: string | null;
  gs_examples_agent: string | null;
  gs_prompt_agent: string | null;
  gs_prompt_sql: string | null;
  gs_profiling_agent: string | null;
  gs_metrics_config_agent: string | null;
  client: string | null;
  created_at: string;
  updated_at: string;
}

interface DeploysViewProps {
  productId: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

const ENVIRONMENTS = [
  { value: 'dev', label: 'Desarrollo', icon: '🔧', color: 'blue' },
  { value: 'staging', label: 'Pruebas', icon: '🧪', color: 'yellow' },
  { value: 'production', label: 'Producción', icon: '🚀', color: 'green' },
];

export default function DeploysView({ productId, showNotification }: DeploysViewProps) {
  const [deploys, setDeploys] = useState<DeployConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentDeploys, setAgentDeploys] = useState<AgentDeployData[]>([]);
  const [loadingAgentDeploys, setLoadingAgentDeploys] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<DeployConfig | null>(null);
  const [showConfigJson, setShowConfigJson] = useState(false);
  const [hasSemanticConfig, setHasSemanticConfig] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    environment: 'dev',
    deploy_url: '',
    api_endpoint: '',
    config_json: '{}',
    version: '',
    is_active: true,
  });

  useEffect(() => {
    loadDeploys();
    loadAgentDeploys();
    loadSemanticConfigs();
  }, [productId]);

  const loadAgentDeploys = async () => {
    try {
      setLoadingAgentDeploys(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const { accessToken } = JSON.parse(authData);

      const response = await fetch(`/api/admin-client/chatbots/${productId}/deploys`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAgentDeploys(data.deploys || []);
      }
    } catch (error) {
      console.error('Error loading agent deploys:', error);
    } finally {
      setLoadingAgentDeploys(false);
    }
  };

  const loadSemanticConfigs = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setHasSemanticConfig(false);
        return;
      }

      const { accessToken } = JSON.parse(authData);

      const response = await fetch('/api/backend/semantic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId }),
      });

      if (!response.ok) {
        setHasSemanticConfig(false);
        return;
      }

      const data = await response.json();
      const configs = Array.isArray(data.data?.configs)
        ? data.data.configs
        : Array.isArray(data.data)
          ? data.data
          : [];

      setHasSemanticConfig(configs.length > 0);
    } catch (error) {
      console.error('Error al cargar configuraciones de capa semántica:', error);
      setHasSemanticConfig(false);
    }
  };

  const loadDeploys = async () => {
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setLoading(false);
        return;
      }

      const auth = JSON.parse(authData);
      const response = await fetch('/api/backend/deploys/by-product', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Asegurar que siempre sea un array
        const deploysData = Array.isArray(data.data) ? data.data : [];
        setDeploys(deploysData);
      } else {
        setDeploys([]);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      setDeploys([]);
      showNotification('error', 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeploy = async () => {
    if (!formData.environment) {
      showNotification('error', 'El ambiente es requerido');
      return;
    }

    // Validar JSON
    let configJson = {};
    if (formData.config_json.trim()) {
      try {
        configJson = JSON.parse(formData.config_json);
      } catch (e) {
        showNotification('error', 'El JSON de configuración no es válido');
        return;
      }
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);
      const response = await fetch('/api/backend/deploys/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          environment: formData.environment,
          deploy_url: formData.deploy_url.trim() || undefined,
          api_endpoint: formData.api_endpoint.trim() || undefined,
          config_json: Object.keys(configJson).length > 0 ? configJson : undefined,
          version: formData.version.trim() || undefined,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('success', 'Configuración creada exitosamente');
        setShowCreateModal(false);
        resetForm();
        loadDeploys();
      } else {
        showNotification('error', data.message || 'Error al crear configuración');
      }
    } catch (error) {
      showNotification('error', 'Error al crear la configuración');
    }
  };

  const handleUpdateDeploy = async () => {
    if (!selectedDeploy) return;

    // Validar JSON
    let configJson = undefined;
    if (formData.config_json.trim()) {
      try {
        configJson = JSON.parse(formData.config_json);
      } catch (e) {
        showNotification('error', 'El JSON de configuración no es válido');
        return;
      }
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);
      const response = await fetch(`/api/backend/deploys/${selectedDeploy.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: formData.environment,
          deploy_url: formData.deploy_url.trim() || undefined,
          api_endpoint: formData.api_endpoint.trim() || undefined,
          config_json: configJson,
          version: formData.version.trim() || undefined,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();
      if (data.success || response.ok) {
        showNotification('success', 'Configuración actualizada exitosamente');
        setShowEditModal(false);
        setSelectedDeploy(null);
        resetForm();
        loadDeploys();
      }
    } catch (error) {
      showNotification('error', 'Error al actualizar la configuración');
    }
  };

  const confirmDeleteDeploy = async () => {
    if (!selectedDeploy) return;

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);
      const response = await fetch(`/api/backend/deploys/${selectedDeploy.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      const data = await response.json();
      if (data.success || response.ok) {
        showNotification('success', 'Configuración eliminada exitosamente');
        setShowDeleteModal(false);
        setSelectedDeploy(null);
        loadDeploys();
      }
    } catch (error) {
      showNotification('error', 'Error al eliminar la configuración');
    }
  };

  const resetForm = () => {
    setFormData({
      environment: 'dev',
      deploy_url: '',
      api_endpoint: '',
      config_json: '{}',
      version: '',
      is_active: true,
    });
  };

  const filteredDeploys = (Array.isArray(deploys) ? deploys : []).filter((deploy) => {
    const matchesSearch = 
      deploy.deploy_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deploy.api_endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deploy.version?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEnv = selectedEnv === 'all' || deploy.environment === selectedEnv;
    
    return matchesSearch && matchesEnv;
  });

  const hasProductionDeploy = (Array.isArray(deploys) ? deploys : []).some(
    (d) => d.environment === 'production' && d.is_active
  );

  const mainAgent = Array.isArray(agentDeploys) && agentDeploys.length > 0 ? agentDeploys[0] : null;
  const hasPromptResource = !!mainAgent?.gs_prompt_agent;
  const hasExamplesResource = !!mainAgent?.gs_examples_agent;
  const hasMetricsResource = !!mainAgent?.gs_metrics_config_agent;
  const resourcesReady = hasPromptResource && hasExamplesResource && hasMetricsResource;

  const checklistItems = [
    {
      key: 'prod',
      label: 'Ambiente de producción activo',
      done: hasProductionDeploy,
    },
    {
      key: 'prompt',
      label: 'Instrucciones del asistente configuradas',
      done: hasPromptResource,
    },
    {
      key: 'examples',
      label: 'Ejemplos de entrenamiento configurados',
      done: hasExamplesResource,
    },
    {
      key: 'metrics',
      label: 'Configuración de métricas conectada',
      done: hasMetricsResource,
    },
  ];

  const completedChecklist = checklistItems.filter((item) => item.done).length;
  const allChecklistDone = completedChecklist === checklistItems.length && checklistItems.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Estado de Despliegue */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiServer className="text-blue-500" />
            <span>Estado de Despliegue</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
            Aquí ves en qué ambientes está publicado el chatbot y si los recursos del asistente están listos para usarse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
              hasProductionDeploy
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300'
                : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/60 dark:bg-yellow-500/10 dark:text-yellow-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${hasProductionDeploy ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span>
              Producción: {hasProductionDeploy ? 'Activo' : 'Pendiente'}
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
              resourcesReady
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300'
                : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-minddash-elevated/60 dark:text-gray-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${resourcesReady ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span>
              Recursos del asistente: {resourcesReady ? 'Completos' : 'Incompletos'}
            </span>
          </span>
          {hasSemanticConfig !== null && (
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                hasSemanticConfig
                  ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300'
                  : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-minddash-elevated/60 dark:text-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${hasSemanticConfig ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span>
                Capa semántica: {hasSemanticConfig ? 'Configurada' : 'Pendiente'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Sección: Recursos del Asistente */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiCloud className="text-green-500" />
              <span>Recursos del Asistente</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Archivos de configuración que definen el comportamiento del chatbot
            </p>
          </div>
          <button
            onClick={loadAgentDeploys}
            disabled={loadingAgentDeploys}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loadingAgentDeploys ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {loadingAgentDeploys ? (
          <div className="bg-white dark:bg-minddash-card rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
              <span>Cargando recursos...</span>
            </div>
          </div>
        ) : agentDeploys.length > 0 ? (
          (() => {
            const deploy = agentDeploys[0];
            const hasPrompt = Boolean(deploy.gs_prompt_agent);
            const hasExamples = Boolean(deploy.gs_examples_agent);
            const hasMetrics = Boolean(deploy.gs_metrics_config_agent);
            const hasProfiling = Boolean(deploy.gs_profiling_agent);

            const rows = [
              { key: 'prompt', label: 'Instrucciones del asistente', done: hasPrompt },
              { key: 'examples', label: 'Ejemplos de entrenamiento', done: hasExamples },
              { key: 'metrics', label: 'Configuración de métricas', done: hasMetrics },
              { key: 'profiling', label: 'Perfilamiento de datos', done: hasProfiling },
            ];

            return (
              <div className="bg-white dark:bg-minddash-card rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {deploy.client || 'Configuración principal del asistente'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Última actualización:{' '}
                    {new Date(deploy.updated_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {rows.map((row) => (
                    <span
                      key={row.key}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                        row.done
                          ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300'
                          : 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-minddash-elevated/60 dark:text-gray-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${row.done ? 'bg-green-400' : 'bg-gray-500'}`}
                      />
                      <span>{row.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="bg-white dark:bg-minddash-card rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
            <FiCloud className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">No hay recursos configurados para este chatbot</p>
            <p className="text-gray-500 text-xs mt-1">
              Los recursos se configuran desde la capa semántica
            </p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="border-t border-gray-200 dark:border-gray-700/50" />

      {/* Header Ambientes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiServer className="text-blue-500" />
            <span>Ambientes de Despliegue</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Configuraciones por ambiente (desarrollo, staging, producción)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Nuevo Ambiente</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por URL o versión..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
          />
        </div>

        {/* Filtro por ambiente */}
        <Select value={selectedEnv} onValueChange={(next) => setSelectedEnv(next)}>
          <SelectTrigger className="w-[220px] bg-white dark:bg-minddash-elevated border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700">
            <SelectItem value="all">Todos los ambientes</SelectItem>
            {ENVIRONMENTS.map((env) => (
              <SelectItem key={env.value} value={env.value}>
                {env.icon} {env.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Deploys */}
      <div className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-minddash-elevated text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-2 text-left">Ambiente</th>
              <th className="px-4 py-2 text-left">URL de despliegue</th>
              <th className="px-4 py-2 text-left">API Endpoint</th>
              <th className="px-4 py-2 text-left">Versión</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeploys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <FiServer className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    No hay configuraciones de despliegue
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Agrega tu primera configuración de ambiente
                  </p>
                  <button
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Crear Configuración
                  </button>
                </td>
              </tr>
            ) : (
              filteredDeploys.map((deploy) => {
                const env = ENVIRONMENTS.find(e => e.value === deploy.environment);
                const envLabel = env?.value === 'dev'
                  ? 'Desarrollo'
                  : env?.value === 'staging'
                    ? 'Pruebas'
                    : env?.value === 'production'
                      ? 'Producción'
                      : deploy.environment;

                return (
                  <tr
                    key={deploy.id}
                    className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-minddash-elevated transition-colors"
                  >
                    <td className="px-4 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {env?.icon || '🌐'}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">{envLabel}</span>
                          {deploy.version && (
                            <span className="text-xs text-gray-500">v{deploy.version}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top">
                      {deploy.deploy_url ? (
                        <a
                          href={deploy.deploy_url}
                          className="block text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 truncate font-mono text-xs"
                          title={deploy.deploy_url}
                        >
                          {deploy.deploy_url}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">Sin URL</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {deploy.api_endpoint ? (
                        <span className="block text-gray-700 dark:text-gray-300 truncate font-mono text-xs" title={deploy.api_endpoint}>
                          {deploy.api_endpoint}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Sin endpoint</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {deploy.version ? (
                        <span className="text-xs text-gray-700 dark:text-gray-300">{deploy.version}</span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <StatusBadge variant={deploy.is_active ? 'active' : 'inactive'} dot>
                          {deploy.is_active ? 'Activo' : 'Inactivo'}
                        </StatusBadge>
                        <span className="text-xs text-gray-500">{envLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <div className="inline-flex items-center gap-1">
                        {deploy.config_json && Object.keys(deploy.config_json).length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDeploy(deploy);
                              setShowConfigJson(true);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                            title="Ver configuración JSON"
                          >
                            <FiCode className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDeploy(deploy);
                            setFormData({
                              environment: deploy.environment,
                              deploy_url: deploy.deploy_url || '',
                              api_endpoint: deploy.api_endpoint || '',
                              config_json: deploy.config_json ? JSON.stringify(deploy.config_json, null, 2) : '{}',
                              version: deploy.version || '',
                              is_active: deploy.is_active,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/40"
                          title="Editar configuración"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeploy(deploy);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                          title="Eliminar configuración"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar */}
      <ModalPortal>
        <AnimatePresence>
          {(showCreateModal || showEditModal) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {showCreateModal ? 'Nueva Configuración' : 'Editar Configuración'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedDeploy(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Ambiente */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Ambiente *</label>
                  <Select
                    value={formData.environment}
                    onValueChange={(next) => setFormData({ ...formData, environment: next })}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-minddash-elevated border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700">
                      {ENVIRONMENTS.map((env) => (
                        <SelectItem key={env.value} value={env.value}>
                          {env.icon} {env.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* URLs */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Deploy URL</label>
                  <input
                    type="url"
                    value={formData.deploy_url}
                    onChange={(e) => setFormData({ ...formData, deploy_url: e.target.value })}
                    className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 font-mono text-sm"
                    placeholder="https://app.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">API Endpoint</label>
                  <input
                    type="url"
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                    className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 font-mono text-sm"
                    placeholder="https://api.example.com/v1"
                  />
                </div>

                {/* Versión */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Versión</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                    placeholder="1.0.0"
                  />
                </div>

                {/* Config JSON */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Configuración JSON
                  </label>
                  <textarea
                    value={formData.config_json}
                    onChange={(e) => setFormData({ ...formData, config_json: e.target.value })}
                    rows={8}
                    className="w-full bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 resize-none font-mono text-xs"
                    placeholder='{\n  "max_users": 1000,\n  "features": {\n    "analytics": true\n  }\n}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Debe ser un JSON válido
                  </p>
                </div>

                {/* Estado */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                    Configuración activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedDeploy(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={showCreateModal ? handleCreateDeploy : handleUpdateDeploy}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2"
                >
                  <FiCheck className="w-4 h-4" />
                  <span>{showCreateModal ? 'Crear' : 'Guardar'}</span>
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Ver Config JSON */}
      <ModalPortal>
        <AnimatePresence>
          {showConfigJson && selectedDeploy && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-2xl w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <FiCode />
                  <span>Configuración JSON</span>
                </h3>
                <button
                  onClick={() => {
                    setShowConfigJson(false);
                    setSelectedDeploy(null);
                  }}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <pre className="bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto text-sm text-gray-800 dark:text-gray-300 font-mono">
                {JSON.stringify(selectedDeploy.config_json, null, 2)}
              </pre>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowConfigJson(false);
                    setSelectedDeploy(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {/* Modal Confirmar Eliminación */}
      <ModalPortal>
        <AnimatePresence>
          {showDeleteModal && selectedDeploy && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-minddash-card border border-red-200 dark:border-red-900/50 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FiTrash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Eliminar Configuración</h3>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                ¿Estás seguro de eliminar esta configuración de despliegue?
              </p>

              <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 mb-6">
                <p className="text-red-700 dark:text-red-400 text-xs">
                  <span className="inline-flex items-center gap-1"><FiAlertTriangle className="h-3.5 w-3.5" aria-label="Advertencia" /> Esta acción no se puede deshacer</span>
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedDeploy(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteDeploy}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </ModalPortal>
    </div>
  );
}
