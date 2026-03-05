'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiTrash2, FiChevronDown, FiDatabase, FiCheck, FiLoader } from '@/lib/icons';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchRuntimeConfig } from '@/hooks/useRuntimeConfig';

interface ChatbotSemanticLayerProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface SemanticField {
  id: string;
  connection: string;
  database: string;
  schema: string;
  table: string;
  column: string;
  description: string;
  dataType: string;
  role: string;
  aggregation: string;
}

interface ColumnMetadata {
  name: string;
  data_type: string;
  is_nullable?: string;
}

interface Connection {
  connection_id: string;
  connection_name: string;
  connection_type: string;
  organization_id: string;
  organization_name: string;
  organization_company_name: string;
  organization_country: string;
  connection_configuration?: any;
}

export default function ChatbotSemanticLayer({ 
  chatbotId, 
  chatbotName, 
  showNotification 
}: ChatbotSemanticLayerProps) {
  // Estados para la Sección 1: Selección de Elementos
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showColumnList, setShowColumnList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [isConnectionRegisteredInMindsDB, setIsConnectionRegisteredInMindsDB] = useState(false);
  const [registeringConnection, setRegisteringConnection] = useState(false);
  const [mindsdbConnectionName, setMindsdbConnectionName] = useState('');

  // Estados para la Sección 2: Configuración
  const [semanticFields, setSemanticFields] = useState<SemanticField[]>([]);
  const [semanticConfigs, setSemanticConfigs] = useState<any[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [currentDeploy, setCurrentDeploy] = useState<any>(null);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [configFilterConnection, setConfigFilterConnection] = useState<string>('all');

  // Estados para datos del backend
  const [connections, setConnections] = useState<Connection[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<ColumnMetadata[]>([]);
  
  // Datos estáticos
  const dataTypes = ['Numérico', 'Texto', 'Fecha', 'Booleano', 'JSON'];
  const metrics = ['Suma', 'Promedio', 'Conteo', 'Máximo', 'Mínimo', 'N/A'];
  
  const mapBackendAggregationToUiAggregation = (aggregation: string, role: string): string => {
    const agg = (aggregation || '').toLowerCase();
    const isMeasure = role === 'measure';
    if (!isMeasure) return 'N/A';

    if (agg === 'sum') return 'Suma';
    if (agg === 'avg' || agg === 'mean') return 'Promedio';
    if (agg === 'count' || agg === 'count_distinct' || agg === 'distinct_count') return 'Conteo';
    if (agg === 'max') return 'Máximo';
    if (agg === 'min') return 'Mínimo';

    return 'N/A';
  };

  const mapUiAggregationToBackendAggregation = (aggregationLabel: string, role: string): string | null => {
    if (role !== 'measure') return null;

    switch (aggregationLabel) {
      case 'Suma':
        return 'sum';
      case 'Promedio':
        return 'avg';
      case 'Conteo':
        return 'count';
      case 'Máximo':
        return 'max';
      case 'Mínimo':
        return 'min';
      default:
        return null;
    }
  };

  // Función para mapear tipos lógicos del UI a tipos del backend
  const mapLogicalTypeToBackendType = (logicalType: string): string => {
    const mapping: Record<string, string> = {
      'Numérico': 'number',
      'Texto': 'string',
      'Fecha': 'date',
      'Booleano': 'boolean',
      'JSON': 'json'
    };
    return mapping[logicalType] || 'string';
  };

  // Función para determinar el role (dimension o measure) basado en la métrica
  const determineRole = (metric: string): string => {
    // Si la métrica es "N/A", es una dimensión
    // Si tiene una métrica (Suma, Promedio, etc.), es una medida
    if (!metric) return 'dimension';
    const m = metric.toLowerCase();

    if (m === 'dimension' || m === 'measure') {
      return m;
    }

    if (
      m === 'suma' ||
      m === 'sum' ||
      m === 'promedio' ||
      m === 'avg' ||
      m === 'conteo' ||
      m === 'count' ||
      m === 'máximo' ||
      m === 'max' ||
      m === 'mínimo' ||
      m === 'min'
    ) {
      return 'measure';
    }

    return 'dimension';
  };

  // Función para mapear tipos de PostgreSQL a tipos lógicos
  // Nota: Estos mapeos son correctos y permiten trabajar con los tipos en SQL
  // - UUID → Texto: Los UUIDs pueden tratarse como texto en SQL (CAST, comparaciones, etc.)
  // - timestamp/timestamp without time zone → Fecha: Correcto, son tipos de fecha/hora
  const mapPostgreSQLTypeToLogicalType = (pgType: string): string => {
    const normalizedType = pgType.toLowerCase().trim();
    
    // Tipos numéricos
    if (normalizedType.includes('int') || 
        normalizedType.includes('numeric') || 
        normalizedType.includes('decimal') || 
        normalizedType.includes('float') || 
        normalizedType.includes('double') || 
        normalizedType.includes('real') || 
        normalizedType.includes('money') ||
        normalizedType.includes('serial') ||
        normalizedType.includes('bigint') ||
        normalizedType.includes('smallint')) {
      return 'Numérico';
    }
    
    // Tipos de fecha/hora (incluye timestamp, timestamp without time zone, date, time, interval)
    if (normalizedType.includes('date') || 
        normalizedType.includes('time') || 
        normalizedType.includes('timestamp') ||
        normalizedType.includes('interval')) {
      return 'Fecha';
    }
    
    // Tipos booleanos
    if (normalizedType.includes('bool')) {
      return 'Booleano';
    }
    
    // Tipos JSON
    if (normalizedType.includes('json')) {
      return 'JSON';
    }
    
    // UUID y tipos de texto (varchar, char, text, uuid, etc.)
    // UUID se trata como texto porque puede usarse como string en SQL:
    // - CAST(uuid_column AS TEXT)
    // - Comparaciones con strings
    // - Funciones de texto sobre UUIDs
    if (normalizedType.includes('uuid')) {
      return 'Texto';
    }
    
    // Por defecto, texto (incluye varchar, char, text, etc.)
    return 'Texto';
  };

  const getConnectionNameFromPath = (rawPath: string): string => {
    if (!rawPath) return '';
    const parts = rawPath.split('/');
    const semanticIdx = parts.indexOf('semantic_layers');
    if (semanticIdx >= 0 && parts.length > semanticIdx + 1) {
      return parts[semanticIdx + 1];
    }
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return '';
  };

  const getConnectionFilterChipClass = (name: string): string => {
    const isActiveFilter = configFilterConnection === name;
    const isCurrentConnection = !!mindsdbConnectionName && name === mindsdbConnectionName;

    if (isActiveFilter && isCurrentConnection) {
      return 'px-2 py-0.5 rounded-full text-[11px] border transition-colors bg-blue-100 border-blue-200 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-700/80 dark:border-blue-300 dark:text-white dark:ring-blue-300';
    }

    if (isActiveFilter) {
      return 'px-2 py-0.5 rounded-full text-[11px] border transition-colors bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-700/60 dark:border-blue-500 dark:text-white';
    }

    if (isCurrentConnection) {
      return 'px-2 py-0.5 rounded-full text-[11px] border transition-colors bg-gray-100 border-blue-200 text-blue-800 dark:bg-minddash-elevated dark:border-blue-400 dark:text-blue-200';
    }

    return 'px-2 py-0.5 rounded-full text-[11px] border transition-colors bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-minddash-elevated dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700';
  };

  const getConnectionByMindsdbName = (mindsdbName: string): Connection | undefined => {
    if (!mindsdbName) return undefined;
    return (
      connections.find((c) => getSanitizedConnectionName(c.connection_name) === mindsdbName) ||
      connections.find((c) => c.connection_name === mindsdbName)
    );
  };

  const getEngineForConnection = (conn?: Connection): string | undefined => {
    if (!conn?.connection_type) return undefined;
    const t = conn.connection_type.toLowerCase();
    if (t.includes('postgres')) return 'postgres';
    if (t.includes('mysql')) return 'mysql';
    if (t.includes('bigquery')) return 'bigquery';
    if (t.includes('databricks')) return 'databricks';
    return undefined;
  };

  const getSanitizedConnectionName = (rawName: string): string => {
    if (!rawName) return '';
    let sanitizedName = rawName
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .toLowerCase();

    if (!sanitizedName || sanitizedName === '') {
      sanitizedName = 'mindsdb_connection';
    }

    return sanitizedName;
  };

  const reconstructFieldsFromDescribeResult = (describeResult: any): SemanticField[] => {
    const rawDatasets =
      (describeResult && describeResult.data && describeResult.data.datasets) ||
      describeResult?.datasets ||
      [];

    const datasets: any[] = Array.isArray(rawDatasets)
      ? rawDatasets
      : rawDatasets && typeof rawDatasets === 'object'
        ? Object.values(rawDatasets)
        : [];

    const reconstructedFields: SemanticField[] = [];

    datasets.forEach((dataset: any, datasetIndex: number) => {
      const schemaName = dataset.schema || 'public';
      const tableName = dataset.table || dataset.name || `table_${datasetIndex + 1}`;
      let columns: any[] = Array.isArray(dataset.columns)
        ? dataset.columns
        : Array.isArray(dataset.fields)
          ? dataset.fields
          : [];

      // Si no hay columns/fields, intentar reconstruir a partir de dimensions/measures
      if (!columns || columns.length === 0) {
        const dimensionsSource = dataset.dimensions || dataset.dims || dataset.dimension_fields;
        const measuresSource = dataset.measures || dataset.metrics || dataset.measure_fields;

        const collected: any[] = [];

        const collectFromSource = (source: any, defaultRole: 'dimension' | 'measure') => {
          if (!source) return;

          if (Array.isArray(source)) {
            source.forEach((item: any) => {
              if (!item) return;
              const name = item.name || item.column || item.field || item.id;
              if (!name) return;
              collected.push({
                ...item,
                name,
                role: item.role || defaultRole,
              });
            });
          } else if (typeof source === 'object') {
            Object.entries(source).forEach(([key, item]: [string, any]) => {
              if (!item) return;
              const name = item.name || item.column || item.field || key;
              if (!name) return;
              collected.push({
                ...item,
                name,
                role: item.role || defaultRole,
              });
            });
          }
        };

        collectFromSource(dimensionsSource, 'dimension');
        collectFromSource(measuresSource, 'measure');

        if (collected.length > 0) {
          columns = collected;
        }
      }

      columns.forEach((col: any, colIndex: number) => {
        const colName = col.name || col.column || col.field || `col_${colIndex + 1}`;
        if (!colName) return;

        const description = col.description || '';
        const logicalType = (col.data_type || col.logical_type || '').toString().toLowerCase();
        let dataType = 'Texto';
        if (logicalType) {
          if (
            logicalType.includes('int') ||
            logicalType.includes('numeric') ||
            logicalType.includes('decimal') ||
            logicalType.includes('float') ||
            logicalType.includes('double') ||
            logicalType.includes('real')
          ) {
            dataType = 'Numérico';
          } else if (
            logicalType.includes('date') ||
            logicalType.includes('time') ||
            logicalType.includes('timestamp')
          ) {
            dataType = 'Fecha';
          } else if (logicalType.includes('bool')) {
            dataType = 'Booleano';
          } else if (logicalType.includes('json')) {
            dataType = 'JSON';
          }
        }

        // Recuperar aggregation y role desde el backend
        const backendAggregationRaw = (
          col.aggregation ||
          col.metric ||
          col.metric_label ||
          ''
        ).toString();
        const backendRole = (col.role || determineRole(backendAggregationRaw)).toLowerCase();
        const aggregation = mapBackendAggregationToUiAggregation(backendAggregationRaw, backendRole);

        reconstructedFields.push({
          id: `${schemaName}.${tableName}.${colName}`,
          connection: dataset.connection || dataset.connection_name || '',
          database: dataset.database || '',
          schema: schemaName,
          table: tableName,
          column: colName,
          description,
          dataType,
          role: backendRole,
          aggregation,
        });
      });
    });

    return reconstructedFields;
  };

  // Cargar conexiones y configuración existente al montar
  useEffect(() => {
    loadConnections();
    loadExistingConfiguration();
  }, []);

  // Cargar configuración existente del chatbot
  const loadExistingConfiguration = async () => {
    try {
      // Cargar siempre desde backend: la base de datos + GCS son la fuente de verdad
      const token = getAuthToken();
      if (!token) {
        return;
      }

      // Primero cargar el deploy actual para saber qué versión está activa
      let activeGsUri: string | null = null;
      let activeClient: string | null = null;
      try {
        const deploysResponse = await fetch(`/api/admin-client/chatbots/${chatbotId}/deploys`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (deploysResponse.ok) {
          const deploysData = await deploysResponse.json();
          if (deploysData.success && deploysData.deploys && deploysData.deploys.length > 0) {
            const deploy = deploysData.deploys[0]; // Usar el más reciente
            setCurrentDeploy(deploy);
            activeGsUri = deploy.gs_profiling_agent; // gs_profiling_agent almacena la capa semántica activa
            activeClient = deploy.client || null;
          }
        }
      } catch (deployError) {
        console.error('Error cargando deploy actual:', deployError);
      }

      try {
        const response = await fetch('/api/backend/semantic', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ product_id: chatbotId })
        });

        if (response.ok) {
          const result = await response.json();
          const configs = Array.isArray(result.data?.configs)
            ? result.data.configs
            : Array.isArray(result.data)
              ? result.data
              : [];

          if (configs.length > 0) {
            setSemanticConfigs(configs);

            // Determinar cuál es la versión activa
            // 1) Intentar usar gs_profiling_agent del deploy (ruta exacta del YAML activo)
            let activeConfig: any = null;
            if (activeGsUri) {
              activeConfig = configs.find((c: any) => {
                const configUri = c.object_path_saved || c.gs_uri || c.url;
                return configUri === activeGsUri;
              });
            }

            // 2) Si no hay deploy o no coincide, usar la última versión devuelta por el backend
            const finalActiveConfig = activeConfig || configs[configs.length - 1];
            
            const activeConfigIdValue = finalActiveConfig.id || finalActiveConfig.config_id || null;
            if (activeConfigIdValue) {
              setActiveConfigId(activeConfigIdValue);
            }
            
            const gsUri = finalActiveConfig.object_path_saved || finalActiveConfig.gs_uri || finalActiveConfig.url;

            if (gsUri) {
              const describeResponse = await fetch(`/api/backend/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (describeResponse.ok) {
                const describeResult = await describeResponse.json();
                const reconstructedFields = reconstructFieldsFromDescribeResult(describeResult);

                if (reconstructedFields.length > 0) {
                  setSemanticFields(reconstructedFields);
                  toast.info('Configuración de capa semántica cargada desde la nube');
                  return;
                }
              }

              toast.info('Configuración guardada en la nube');
            }
          }
        }
      } catch (error) {
        // Silenciar error si el endpoint no existe
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const getAuthToken = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return null;
    try { return JSON.parse(authData).accessToken; } catch { return null; }
  };

  const handleUseSemanticConfig = async (config: any) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }

      const gsUri = config.object_path_saved || config.gs_uri || config.url;
      if (!gsUri) {
        toast.error('La configuración seleccionada no tiene una ruta válida en GCS');
        return;
      }

      const describeResponse = await fetch(`/api/backend/semantic/layer/describe?gs_uri=${encodeURIComponent(gsUri)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!describeResponse.ok) {
        let errorText = '';
        try {
          errorText = await describeResponse.text();
        } catch {
          errorText = '';
        }
        console.error('Error describiendo capa semántica seleccionada:', errorText);
        toast.error('Error al cargar la configuración seleccionada');
        return;
      }

      const describeResult = await describeResponse.json();
      const reconstructedFields = reconstructFieldsFromDescribeResult(describeResult);

      if (reconstructedFields.length === 0) {
        toast.info('La configuración seleccionada no contiene campos para cargar');
        return;
      }

      setSemanticFields(reconstructedFields);

      const configId = config.id || config.config_id || null;
      if (configId) {
        setActiveConfigId(configId);
      }

      // Persistir la versión activa en el deploy config
      try {
        if (currentDeploy && currentDeploy.id) {
          // Actualizar deploy existente
          const updateResponse = await fetch('/api/backend/user-data-access/updateDeployConfig', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: currentDeploy.id,
              product_id: chatbotId,
              gs_profiling_agent: gsUri
            })
          });
          
          if (updateResponse.ok) {
            setCurrentDeploy({ ...currentDeploy, gs_profiling_agent: gsUri });
            toast.success('Versión activada y guardada correctamente');
          } else {
            console.error('Error actualizando deploy config');
            toast.success('Versión cargada (no se pudo guardar como activa)');
          }
        } else {
          // Crear nuevo deploy config
          const registerResponse = await fetch('/api/backend/user-data-access/sendRegisterDeployConfig', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              product_id: chatbotId,
              gs_profiling_agent: gsUri
            })
          });
          
          if (registerResponse.ok) {
            const registerData = await registerResponse.json();
            setCurrentDeploy({ id: registerData.data?.deploy_id, product_id: chatbotId, gs_profiling_agent: gsUri });
            toast.success('Versión activada y guardada correctamente');
          } else {
            console.error('Error registrando deploy config');
            toast.success('Versión cargada (no se pudo guardar como activa)');
          }
        }
      } catch (deployError) {
        console.error('Error persistiendo versión activa:', deployError);
        toast.success('Versión cargada (no se pudo guardar como activa)');
      }
    } catch (error) {
      console.error('Error al aplicar configuración de capa semántica:', error);
      toast.error('Error al aplicar la configuración seleccionada');
    }
  };

  // Eliminar una versión de capa semántica
  const handleDeleteSemanticConfig = async (config: any) => {
    const configId = config.id || config.config_id;
    if (!configId) {
      toast.error('No se puede eliminar: configuración sin ID');
      return;
    }

    // No permitir eliminar la versión activa
    if (configId === activeConfigId) {
      toast.error('No puedes eliminar la versión que está en uso. Selecciona otra versión primero.');
      return;
    }

    try {
      setDeletingConfigId(configId);
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/backend/semantic/deleteConfig', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: configId })
      });

      if (response.ok) {
        // Remover la configuración de la lista local
        setSemanticConfigs(prev => prev.filter(c => (c.id || c.config_id) !== configId));
        toast.success('Versión eliminada correctamente');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Error al eliminar la versión');
      }
    } catch (error) {
      console.error('Error eliminando configuración semántica:', error);
      toast.error('Error al eliminar la versión');
    } finally {
      setDeletingConfigId(null);
    }
  };

  const loadConnections = async () => {
    try {
      setConnectionsLoading(true);

      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }

      // Primero obtener el organization_id del chatbot/producto
      const chatbotResponse = await fetch(`/api/admin-client/chatbots/${chatbotId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!chatbotResponse.ok) {
        console.error('Error obteniendo información del chatbot');
        return;
      }

      const chatbotData = await chatbotResponse.json();
      const organizationId = chatbotData.chatbot?.organization_id;

      if (!organizationId) {
        console.warn('No se encontró organization_id para el chatbot');
        setConnections([]);
        return;
      }

      // Cargar conexiones de la organización del chatbot
      const response = await fetch('/api/backend/connections/organization', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organization_id: organizationId })
      });

      if (response.ok) {
        const result = await response.json();
        // Normalizar al formato esperado por el componente
        const normalizedConnections = (Array.isArray(result.data) ? result.data : []).map((conn: any) => ({
          connection_id: conn.id,
          connection_name: conn.name,
          connection_type: conn.type,
          organization_id: conn.organization_id,
          organization_name: null,
          organization_company_name: null,
          organization_country: null,
        }));
        setConnections(normalizedConnections);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error('Error al cargar conexiones:', error);
      toast.error('Error al cargar conexiones');
    } finally {
      setConnectionsLoading(false);
    }
  };


  // Registrar conexión en MindsDB
  const registerConnectionInMindsDB = async (connectionName?: string) => {
    const connName = connectionName || selectedConnection;
    const conn = connections.find(c => c.connection_name === connName);
    if (!conn) {
      toast.error('Selecciona una conexión primero');
      return;
    }

    try {
      setRegisteringConnection(true);
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      // Obtener server_url del runtime config
      const cfg = await fetchRuntimeConfig();
      const serverUrl = cfg.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || 'http://34.59.236.198:47334';
      
      // Sanitizar nombre para MindsDB: solo letras, números y guiones bajos
      // Debe empezar con letra o guion bajo
      const sanitizedName = getSanitizedConnectionName(conn.connection_name);
      
      // Para PostgreSQL y BigQuery, las credenciales ya están guardadas como secretos en MindsDB
      // Solo necesitamos verificar que la conexión existe usando listar_conexiones
      toast.info('Verificando conexión con la base de datos...');
      
      // Verificar si la conexión existe en MindsDB
      const checkResponse = await fetch('/api/backend/mindsdb/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'listar_conexiones',
          server_url: serverUrl,
          client_name: sanitizedName
        })
      });

      if (checkResponse.ok) {
        // La conexión existe en MindsDB, usarla directamente
        setIsConnectionRegisteredInMindsDB(true);
        setMindsdbConnectionName(sanitizedName);
        toast.success('Conexión lista para usar');
        loadSchemas(sanitizedName);
      } else {
        // Si no existe, mostrar un mensaje informativo
        // Las conexiones deberían estar previamente configuradas en MindsDB
        const errorData = await checkResponse.json().catch(() => ({}));
        console.warn('Conexión no encontrada en MindsDB:', sanitizedName, errorData);
        toast.warning(`La conexión "${sanitizedName}" no se encontró en el servidor de datos. Asegúrate de que esté configurada previamente.`);
      }
    } catch (error) {
      console.error('Error al registrar conexión:', error);
      toast.error('Error al verificar la conexión con la base de datos');
    } finally {
      setRegisteringConnection(false);
    }
  };

  const loadSchemas = async (connectionName: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const cfg = await fetchRuntimeConfig();
      const serverUrl = cfg.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || 'http://34.59.236.198:47334';
      const conn = getConnectionByMindsdbName(connectionName);
      const engine = getEngineForConnection(conn);
      const payload: any = {
        action: 'listar_esquemas',
        server_url: serverUrl,
        client_name: connectionName,
        database: connectionName,
      };

      if (engine) {
        payload.engine = engine;
      }

      const resp = await fetch('/api/backend/mindsdb/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const json = await resp.json();
        const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.esquemas) ? json.data.esquemas : []);
        setSchemas(list);
      }
    } catch (e) {
      console.error('Error al cargar esquemas:', e);
      toast.error('Error al cargar esquemas');
    }
  };

  const loadTables = async (connectionName: string, schema: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const cfg = await fetchRuntimeConfig();
      const serverUrl = cfg.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || 'http://34.59.236.198:47334';
      const conn = getConnectionByMindsdbName(connectionName);
      const engine = getEngineForConnection(conn);
      const payload: any = {
        action: 'listar_tablas',
        server_url: serverUrl,
        client_name: connectionName,
        database: connectionName,
        schemas: [schema],
      };

      if (engine) {
        payload.engine = engine;
      }

      const resp = await fetch('/api/backend/mindsdb/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const json = await resp.json();
        let list = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.tablas) ? json.data.tablas : []);
        // Si las tablas son objetos {schema, table}, extraer solo el nombre de la tabla
        list = list.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            return item.table || item.table_name || item.name || String(item);
          }
          return String(item);
        });
        setTables(list);
      }
    } catch (e) {
      console.error('Error al cargar tablas:', e);
      toast.error('Error al cargar tablas');
    }
  };

  const loadColumns = async (connectionName: string, schema: string, table: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const cfg = await fetchRuntimeConfig();
      const serverUrl = cfg.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || 'http://34.59.236.198:47334';
      const conn = getConnectionByMindsdbName(connectionName);
      const engine = getEngineForConnection(conn);
      const payload: any = {
        action: 'listar_columnas',
        server_url: serverUrl,
        client_name: connectionName,
        database: connectionName,
        schemas: [schema],
        schema_name: schema,
        table,
      };

      if (engine) {
        payload.engine = engine;
      }

      const resp = await fetch('/api/backend/mindsdb/meta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const json = await resp.json();
        // Puede devolver objetos con metadata; preservar la estructura completa
        let cols = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.columnas)
            ? json.data.columnas
            : [];
        
        // Normalizar columnas a objetos ColumnMetadata
        const normalizedCols: ColumnMetadata[] = cols.map((c: any) => {
          if (typeof c === 'string') {
            // Si es solo un string, crear un objeto con el nombre y tipo desconocido
            return { name: c, data_type: 'text' };
          }
          if (c && typeof c === 'object') {
            return {
              name: c.column_name || c.name || c.column || String(c),
              data_type: c.data_type || c.type || 'text',
              is_nullable: c.is_nullable
            };
          }
          return { name: String(c), data_type: 'text' };
        });
        setAvailableColumns(normalizedCols);
      }
    } catch (e) {
      console.error('Error al cargar columnas:', e);
      toast.error('Error al cargar columnas');
    }
  };

  // Reacciones a cambios
  useEffect(() => {
    if (!mindsdbConnectionName || !isConnectionRegisteredInMindsDB) {
      setSchemas([]);
      setTables([]);
      setAvailableColumns([]);
      return;
    }
    loadSchemas(mindsdbConnectionName);
  }, [mindsdbConnectionName, isConnectionRegisteredInMindsDB]);

  useEffect(() => {
    if (!mindsdbConnectionName || !selectedSchema || !isConnectionRegisteredInMindsDB) {
      setTables([]);
      setAvailableColumns([]);
      return;
    }
    loadTables(mindsdbConnectionName, selectedSchema);
  }, [selectedSchema, mindsdbConnectionName, isConnectionRegisteredInMindsDB]);

  useEffect(() => {
    if (!mindsdbConnectionName || !selectedSchema || !selectedTable || !isConnectionRegisteredInMindsDB) {
      setAvailableColumns([]);
      return;
    }
    loadColumns(mindsdbConnectionName, selectedSchema, selectedTable);
  }, [selectedTable, selectedSchema, mindsdbConnectionName, isConnectionRegisteredInMindsDB]);

  // Funciones
  const handleAddFields = () => {
    if (!selectedConnection || !mindsdbConnectionName || !selectedSchema || !selectedTable || selectedColumns.length === 0) {
      showNotification('error', 'Por favor completa todos los campos antes de agregar');
      return;
    }

    const newFields: SemanticField[] = selectedColumns.map((columnName) => {
      // Buscar la metadata de la columna para obtener el tipo de dato
      const columnMetadata = availableColumns.find(col => col.name === columnName);
      const mappedDataType = columnMetadata 
        ? mapPostgreSQLTypeToLogicalType(columnMetadata.data_type)
        : '';

      return {
        id: `${Date.now()}-${columnName}`,
        connection: selectedConnection,
        database: mindsdbConnectionName, // Usar el nombre de la conexión en MindsDB como database
        schema: selectedSchema,
        table: selectedTable,
        column: columnName,
        description: '',
        dataType: mappedDataType,
        role: 'dimension',
        aggregation: 'N/A',
      };
    });

    setSemanticFields([...semanticFields, ...newFields]);
    
    // Reset selección
    setSelectedColumns([]);
    showNotification('success', `${newFields.length} campo(s) agregado(s) correctamente`);
  };

  const handleRemoveField = (id: string) => {
    setSemanticFields(semanticFields.filter(field => field.id !== id));
    showNotification('info', 'Campo eliminado');
  };

  const handleFieldChange = (id: string, key: keyof SemanticField, value: string) => {
    setSemanticFields(
      semanticFields.map(field =>
        field.id === id ? { ...field, [key]: value } : field
      )
    );
  };

  const handleToggleColumn = (column: string) => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(c => c !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleDeployChanges = async () => {
    if (semanticFields.length === 0) {
      showNotification('error', 'Agrega al menos un campo antes de desplegar');
      return;
    }

    // Determinar la conexión/base de datos asociada a esta configuración
    const effectiveDatabaseName =
      mindsdbConnectionName ||
      (semanticFields[0]?.database || semanticFields[0]?.connection || '');

    if (!effectiveDatabaseName) {
      showNotification('error', 'No se pudo determinar la conexión asociada a esta configuración. Revisa la conexión en el paso anterior.');
      return;
    }

    // Validar que todos los campos tengan descripción y tipo de dato
    const incompleteFields = semanticFields.filter(
      field => !field.description || !field.dataType
    );

    if (incompleteFields.length > 0) {
      showNotification('error', 'Por favor completa la descripción y tipo de dato de todos los campos');
      return;
    }

    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        showNotification('error', 'Sesión expirada');
        window.location.href = '/login';
        return;
      }
      const token = JSON.parse(authData).accessToken;
      
      // Obtener la conexión seleccionada para determinar el engine
      const selectedConn =
        connections.find(c => c.connection_name === selectedConnection) ||
        connections.find(c => getSanitizedConnectionName(c.connection_name) === effectiveDatabaseName);
      const engine = selectedConn?.connection_type === 'postgresql' 
        ? 'postgres' 
        : selectedConn?.connection_type || 'postgres';
      
      // Agrupar campos por schema y tabla y construir ColumnSelection (columns + column_specs)
      const selectionsByTable = semanticFields.reduce((acc, field) => {
        const key = `${field.schema}|${field.table}`;
        if (!acc[key]) {
          acc[key] = {
            schema_name: field.schema,
            table: field.table,
            columns: [] as string[],
            column_specs: [] as Array<{
              name: string;
              description: string;
              role: string;
              data_type: string;
              aggregation: string | null;
            }>,
            time_dimension: null as string | null,
          };
        }

        const isTemporalField = field.dataType === 'Fecha';

        if (isTemporalField && !acc[key].time_dimension) {
          acc[key].time_dimension = field.column;
        }

        // Añadir nombre de columna a la lista columns (evitar duplicados)
        if (!acc[key].columns.includes(field.column)) {
          acc[key].columns.push(field.column);
        }
        
        // Construir column_spec con toda la información
        const effectiveRole = (field.role || determineRole(field.aggregation)).toLowerCase();
        const backendAggregation = mapUiAggregationToBackendAggregation(field.aggregation, effectiveRole);

        acc[key].column_specs.push({
          name: field.column,
          description: field.description,
          role: effectiveRole,
          data_type: mapLogicalTypeToBackendType(field.dataType),
          aggregation: backendAggregation,
        });
        
        return acc;
      }, {} as Record<string, { 
        schema_name: string; 
        table: string; 
        columns: string[];
        column_specs: Array<{
          name: string;
          description: string;
          role: string;
          data_type: string;
          aggregation: string | null;
        }>;
        time_dimension: string | null;
      }>);

      const selections = Object.values(selectionsByTable);
      
      // Generar nombres únicos para GCS
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const timestamp = `${day}-${month}-${year}`;
      
      const bucketName = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'gs-minddash-agent-env';
      const objectPath = `semantic_layers/${effectiveDatabaseName}/${timestamp}.yaml`;
      
      // Configurar si usar GCS (por defecto true para guardar en GCS)
      const useGCS = process.env.NEXT_PUBLIC_USE_GCS !== 'false';
      
      const cfgRT = await fetchRuntimeConfig();
      const configData: any = {
        server_url: cfgRT.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || 'http://34.59.236.198:47334',
        database: effectiveDatabaseName, // Nombre de la conexión en MindsDB
        engine: engine,
        product_id: chatbotId,
        include_profiling: true,
        selections: selections,
        infer_types: true,
        add_default_measures: false,
        time_dimension_candidates: [
          'fecha',
          'date',
          'created_at',
          'updated_at',
          'timestamp',
          'fecha_factura',
        ],
      };
      
      if (useGCS && bucketName && objectPath) {
        configData.bucket_name = bucketName;
        configData.object_path = objectPath;
      }

      const response = await fetch('/api/backend/semantic/layer/build', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        // El backend devuelve JSON con la información
        const result = await response.json();
        console.log('[ChatbotSemanticLayer] Respuesta del backend:', result);
        
        // El backend puede devolver el YAML directamente o la URL de GCS
        let yamlContent = '';
        let gsUri = '';
        
        if (result.data) {
          // Si hay data, puede contener yaml o gs_uri
          yamlContent = result.data.yaml || result.data.content || result.yaml || '';
          gsUri = result.data.gs_uri || result.data.url || result.gs_uri || result.url || '';
        } else {
          // Respuesta directa
          yamlContent = result.yaml || result.content || '';
          gsUri = result.gs_uri || result.url || '';
        }
        
        // Si se usó GCS, construir la URI si no viene en la respuesta
        if (useGCS && !gsUri && bucketName && objectPath) {
          gsUri = `gs://${bucketName}/${objectPath}`;
        }
        
        // Los campos y el YAML se obtienen desde la base de datos + GCS; no usamos localStorage como fuente de verdad
        
        // Registrar en la base de datos si se usó GCS y hay una URI
        if (useGCS && gsUri) {
          try {
            const createConfigResponse = await fetch('/api/backend/semantic/createConfig', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                product_id: chatbotId,
                object_path_saved: gsUri,
                bucket_name_saved: bucketName
              })
            });
            
            if (!createConfigResponse.ok) {
              const errorText = await createConfigResponse.text();
              console.error('Error al registrar configuración:', errorText);
              showNotification('error', 'Capa semántica generada pero no se pudo registrar en la base de datos');
              return;
            }

            // Actualizar el deploy config con la nueva versión activa
            try {
              if (currentDeploy && currentDeploy.id) {
                await fetch('/api/backend/user-data-access/updateDeployConfig', {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    id: currentDeploy.id,
                    product_id: chatbotId,
                    gs_profiling_agent: gsUri
                  })
                });
                setCurrentDeploy({ ...currentDeploy, gs_profiling_agent: gsUri });
              } else {
                // Crear nuevo deploy config
                const registerResponse = await fetch('/api/backend/user-data-access/sendRegisterDeployConfig', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    product_id: chatbotId,
                    gs_profiling_agent: gsUri
                  })
                });
                if (registerResponse.ok) {
                  const registerData = await registerResponse.json();
                  setCurrentDeploy({ id: registerData.data?.deploy_id, product_id: chatbotId, gs_profiling_agent: gsUri });
                }
              }
            } catch (deployUpdateError) {
              console.error('Error actualizando deploy config:', deployUpdateError);
            }

            await loadExistingConfiguration();
            
            showNotification('success', 'Capa semántica generada y activada correctamente');
          } catch (configError: any) {
            console.error('Error al registrar configuración:', configError);
            showNotification('error', 'Capa semántica generada pero no se pudo registrar en la base de datos');
          }
        } else {
          showNotification('success', 'Capa semántica generada correctamente');
        }
      } else {
        // Leer el body solo una vez
        let errorMessage = 'Error al generar capa semántica';
        try {
          const responseText = await response.text();
          console.error('[ChatbotSemanticLayer] Error response:', responseText);
          // Intentar parsear como JSON
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.message || error.detail || errorMessage;
            console.error('[ChatbotSemanticLayer] Error parseado:', error);
          } catch {
            // Si no es JSON válido, usar el texto tal cual
            errorMessage = responseText || errorMessage;
          }
        } catch {
          // Error leyendo el body
          errorMessage = 'Error al procesar respuesta del servidor';
        }
        showNotification('error', errorMessage);
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Error al desplegar cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    showNotification('info', 'Operación cancelada');
  };

  const connectionNames = Array.from(
    new Set(
      semanticConfigs
        .map((config) => {
          const rawPath = config.object_path_saved || config.gs_uri || config.url || '';
          return getConnectionNameFromPath(rawPath);
        })
        .filter((name: string) => !!name)
    )
  );

  const filteredSemanticConfigs = semanticConfigs.filter((config) => {
    if (configFilterConnection === 'all') return true;
    const rawPath = config.object_path_saved || config.gs_uri || config.url || '';
    return getConnectionNameFromPath(rawPath) === configFilterConnection;
  });

  const sortedSemanticConfigs = [...filteredSemanticConfigs].sort((a, b) => {
    const aDate = new Date(a.created_at || a.createdAt || 0).getTime();
    const bDate = new Date(b.created_at || b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  const filteredSemanticFields =
    configFilterConnection === 'all'
      ? semanticFields
      : semanticFields.filter((field) => {
          const effectiveName =
            field.database || getSanitizedConnectionName(field.connection);
          return effectiveName === configFilterConnection;
        });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Definición de Capa Semántica</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Selecciona y describe los campos de tu base de datos para el motor de IA.
        </p>
      </div>

      {/* Sección 1: Seleccionar Elementos de la Base de Datos */}
      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            1. Seleccionar Elementos de la Base de Datos
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Selecciona una conexión y explora la estructura de tu base de datos
          </p>
        </div>

        {connectionsLoading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FiLoader className="w-4 h-4 animate-spin" />
            <span>Cargando conexiones y estructura de la base de datos...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Conexión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Conexión
            </label>
            <div className="relative">
              <Select
                value={selectedConnection || undefined}
                onValueChange={(value) => {
                  setSelectedConnection(value);
                  setSelectedSchema('');
                  setSelectedTable('');
                  setSelectedColumns([]);
                  // Reset MindsDB registration status al cambiar de conexión
                  setIsConnectionRegisteredInMindsDB(false);
                  setMindsdbConnectionName('');
                  // Auto-registrar conexión al seleccionar
                  if (value) {
                    setTimeout(() => registerConnectionInMindsDB(value), 500);
                  }
                }}
                disabled={connections.length === 0}
              >
                <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  <SelectValue
                    placeholder={connections.length === 0 ? 'No hay conexiones disponibles' : 'Seleccionar…'}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  {connections.map((conn) => (
                    <SelectItem key={conn.connection_id} value={conn.connection_name}>
                      {conn.connection_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {registeringConnection && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <FiLoader className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              )}
            </div>
            {isConnectionRegisteredInMindsDB && (
              <div className="mt-2 flex items-center space-x-1.5 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-700 dark:text-green-400 font-medium">Conexión lista</span>
              </div>
            )}
          </div>

          {/* Esquema */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Esquema
            </label>
            <Select
              value={selectedSchema || undefined}
              onValueChange={(sc) => {
                setSelectedSchema(sc);
                setSelectedTable('');
                setSelectedColumns([]);
              }}
              disabled={!isConnectionRegisteredInMindsDB}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                {schemas.map((schema, idx) => (
                  <SelectItem key={`schema-${schema}-${idx}`} value={schema}>
                    {schema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Tabla
            </label>
            <Select
              value={selectedTable || undefined}
              onValueChange={(tb) => {
                setSelectedTable(tb);
                setSelectedColumns([]);
              }}
              disabled={!isConnectionRegisteredInMindsDB || !selectedSchema}
            >
              <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                {tables.map((table, idx) => (
                  <SelectItem key={`table-${table}-${idx}`} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Columnas (Multiselect) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
              Columnas
            </label>
            <div className="relative">
              <button
                onClick={() => setShowColumnList(!showColumnList)}
                disabled={!isConnectionRegisteredInMindsDB || !selectedTable}
                className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-lg py-2.5 px-3 text-left text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-sm">
                  {selectedColumns.length > 0
                    ? `${selectedColumns.length} seleccionada(s)`
                    : 'Seleccionar...'}
                </span>
                <FiChevronDown className={`w-4 h-4 transition-transform ${showColumnList ? 'rotate-180' : ''}`} />
              </button>

              {showColumnList && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                  <div className="max-h-48 overflow-y-auto">
                    {availableColumns.length === 0 ? (
                      <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        No hay columnas disponibles
                      </div>
                    ) : (
                      availableColumns.map((column, idx) => (
                        <label
                          key={`col-${column.name}-${idx}`}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column.name)}
                            onChange={() => handleToggleColumn(column.name)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                          />
                          <span className="text-gray-900 dark:text-white text-sm">{column.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-minddash-elevated/80">
                    <button
                      onClick={() => {
                        setShowColumnList(false);
                        if (selectedColumns.length > 0) {
                          toast.success(`${selectedColumns.length} columna(s) seleccionada(s)`);
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <FiCheck className="w-4 h-4" />
                      <span>Confirmar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vista previa y botón Agregar Campos */}
        {selectedColumns.length > 0 && selectedTable && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Vista previa de selección</p>
                <div className="flex flex-wrap gap-2">
                  {selectedColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center px-2.5 py-1 bg-blue-100 border border-blue-200 rounded text-xs text-blue-800 dark:bg-blue-600/30 dark:border-blue-500/50 dark:text-blue-300 font-mono"
                    >
                      {selectedTable}.{col}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedColumns([])}
                className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            onClick={handleAddFields}
            disabled={selectedColumns.length === 0}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-4 h-4" />
            <span>Agregar {selectedColumns.length > 0 ? `${selectedColumns.length} Campo${selectedColumns.length > 1 ? 's' : ''}` : 'Campos'} al Paso 2</span>
          </button>
        </div>
      </div>

      {/* Sección 2: Configurar Capa Semántica */}
      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              2. Configurar Capa Semántica
            </h3>
            {filteredSemanticFields.length > 0 && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-3">
                <span>
                  {filteredSemanticFields.length} campo{filteredSemanticFields.length === 1 ? '' : 's'} configurado{filteredSemanticFields.length === 1 ? '' : 's'}
                </span>
                <span className="text-gray-500">•</span>
                <span>
                  {filteredSemanticFields.filter((f) => f.role === 'dimension').length} dimensión
                  {filteredSemanticFields.filter((f) => f.role === 'dimension').length === 1 ? '' : 'es'}
                </span>
                <span className="text-gray-500">•</span>
                <span>
                  {filteredSemanticFields.filter((f) => f.role === 'measure').length} métrica
                  {filteredSemanticFields.filter((f) => f.role === 'measure').length === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>
          {filteredSemanticFields.length > 0 && (
            (() => {
              const incomplete = filteredSemanticFields.filter((f) => !f.description || !f.dataType).length;
              const ready = incomplete === 0;
              const dimensionsCount = filteredSemanticFields.filter((f) => (f.role || determineRole(f.aggregation)) === 'dimension').length;
              const measuresCount = filteredSemanticFields.filter((f) => (f.role || determineRole(f.aggregation)) === 'measure').length;
              return (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${
                    ready
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-300'
                      : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/60 dark:bg-yellow-500/10 dark:text-yellow-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span>
                    {ready
                      ? 'Lista para crear métricas'
                      : `Faltan ${incomplete} campo${incomplete === 1 ? '' : 's'} por completar`}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span>
                    {dimensionsCount} dimensión{dimensionsCount === 1 ? '' : 'es'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span>
                    {measuresCount} métrica{measuresCount === 1 ? '' : 's'}
                  </span>
                </div>
              );
            })()
          )}
        </div>

        {semanticConfigs.length > 0 && (
          <div className="mt-4 mb-4 p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-300">
                Versiones de Capa Semántica
              </p>
              <span className="text-[11px] text-gray-500">
                {semanticConfigs.length} versión{semanticConfigs.length === 1 ? '' : 'es'} guardada{semanticConfigs.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">
              Selecciona una versión para cargarla en el editor de campos. Si realizas cambios y quieres guardarlos como una nueva versión en la nube, usa "Desplegar Cambios".
            </p>

            {connectionNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setConfigFilterConnection('all')}
                  className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                    configFilterConnection === 'all'
                      ? 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-700/60 dark:border-blue-500 dark:text-white'
                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-minddash-elevated dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Todas
                </button>
                {connectionNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setConfigFilterConnection(name)}
                    className={getConnectionFilterChipClass(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sortedSemanticConfigs.length === 0 ? (
                <div className="text-[11px] text-gray-500 py-1">
                  No hay versiones para esta conexión.
                </div>
              ) : (
                sortedSemanticConfigs.map((config) => {
                  const configId = config.id || config.config_id || '';
                  const isActive = !!activeConfigId && activeConfigId === configId;
                  const createdAt = config.created_at || config.createdAt || null;
                  let createdAtLabel = '';
                  if (createdAt) {
                    try {
                      createdAtLabel = new Date(createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch {
                      createdAtLabel = String(createdAt);
                    }
                  }

                  const rawPath = config.object_path_saved || config.gs_uri || config.url || '';
                  const shortPath = rawPath.length > 40 ? `...${rawPath.slice(-40)}` : rawPath;
                  const connectionName = getConnectionNameFromPath(rawPath);

                  const versionTitle = createdAtLabel
                    ? `Versión del ${createdAtLabel}`
                    : 'Versión sin fecha registrada';

                  const pathLabel = connectionName
                    ? `Conexión: ${connectionName}`
                    : rawPath
                      ? `Ruta: ${shortPath}`
                      : 'Sin ruta registrada';

                  return (
                    <div
                      key={configId || rawPath}
                      className={`flex items-center justify-between px-2 py-1 rounded-md text-xs ${
                        isActive
                          ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/40 dark:border-blue-500/40'
                          : 'bg-transparent border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-gray-200 truncate max-w-[220px]">
                          {versionTitle}
                        </span>
                        <span
                          className="text-[11px] text-gray-500 truncate max-w-[220px]"
                          title={rawPath || undefined}
                        >
                          {pathLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/50">
                            En uso
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUseSemanticConfig(config)}
                          className="px-2 py-1 rounded text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
                        >
                          Usar versión
                        </button>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSemanticConfig(config)}
                            disabled={deletingConfigId === configId}
                            className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Eliminar versión"
                          >
                            {deletingConfigId === configId ? (
                              <FiLoader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FiTrash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tabla de Configuración */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3 pr-4 min-w-[250px]">
                  Conexión / BD / Schema / Tabla / Columna
                </th>
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3 pr-4 min-w-[200px]">
                  Descripción del Campo
                </th>
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3 pr-4 min-w-[150px]">
                  Tipo de Dato (Lógico)
                </th>
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3 pr-4 min-w-[120px]">
                  Rol
                </th>
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3 pr-4 min-w-[150px]">
                  Métrica del Campo
                </th>
                <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-3">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSemanticFields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center">
                        <FiDatabase className="w-8 h-8 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-gray-700 dark:text-gray-400 font-medium">
                          {semanticFields.length === 0
                            ? 'No hay campos configurados'
                            : 'No hay campos configurados para esta conexión'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Selecciona una conexión y agrega campos desde la sección superior
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSemanticFields.map((field) => (
                  <tr
                    key={field.id}
                    className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                  >
                    {/* Ruta del Campo */}
                    <td className="py-4 pr-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                        <span className="text-blue-600 dark:text-blue-400">{field.connection}</span>
                        {field.database ? (
                          <>
                            {' / '}
                            <span className="text-green-600 dark:text-green-400">{field.database}</span>
                          </>
                        ) : null}
                        {' / '}
                        <span className="text-yellow-600 dark:text-yellow-400">{field.schema}</span>
                        {' / '}
                        <span className="text-purple-600 dark:text-purple-400">{field.table}</span>
                        {' / '}
                        <span className="text-gray-900 dark:text-white font-semibold">{field.column}</span>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="py-4 pr-4">
                      <input
                        type="text"
                        value={field.description}
                        onChange={(e) =>
                          handleFieldChange(field.id, 'description', e.target.value)
                        }
                        placeholder="Describe el campo..."
                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-colors"
                      />
                    </td>

                    {/* Tipo de Dato */}
                    <td className="py-4 pr-4">
                      <Select
                        value={field.dataType || undefined}
                        onValueChange={(next) => handleFieldChange(field.id, 'dataType', next)}
                      >
                        <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Seleccionar…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          {dataTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Rol */}
                    <td className="py-4 pr-4">
                      <Select
                        value={field.role}
                        onValueChange={(next) => handleFieldChange(field.id, 'role', next)}
                      >
                        <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <SelectItem value="dimension">Dimension</SelectItem>
                          <SelectItem value="measure">Measure</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Métrica del Campo (aggregation) */}
                    <td className="py-4 pr-4">
                      <Select
                        value={field.aggregation}
                        onValueChange={(next) => handleFieldChange(field.id, 'aggregation', next)}
                        disabled={field.role !== 'measure'}
                      >
                        <SelectTrigger className="w-full bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          {metrics.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Acción */}
                    <td className="py-4">
                      <button
                        onClick={() => handleRemoveField(field.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Eliminar campo"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeployChanges}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-4 h-4" />
            <span>{loading ? 'Desplegando...' : 'Desplegar Cambios'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}