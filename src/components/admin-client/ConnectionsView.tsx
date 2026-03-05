'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDatabase, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiSearch, FiChevronDown, FiLayers, FiLoader, FiPaperclip } from '@/lib/icons';
import { AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeMode } from '@/hooks/useThemeMode';
import ModalPortal from '@/components/ui/ModalPortal';
import { fetchRuntimeConfig } from '@/hooks/useRuntimeConfig';

interface Connection {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  provider?: string;
  host?: string;
  port?: number;
  database?: string;
  schema?: string;
  sslmode?: string;
  server?: string;
  warehouse?: string;
  protocol?: string;
  db_engine?: string;
  description?: string;
  is_active: boolean;
  // BigQuery specific
  project_id?: string;
  dataset?: string;
  has_service_account_json?: boolean;
  // MindsDB specific
  mindsdb_name?: string;
  server_url?: string;
}

// Form state that handles both PostgreSQL and BigQuery
interface ConnectionFormState {
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  provider: string;
  aurora_engine: 'mysql' | 'postgresql';
  file: File | null;
  table_name: string;
  product_id: string;
  // PostgreSQL specific
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
  sslmode: 'require' | 'verify-full';
  server: string;
  warehouse: string;
  protocol: 'native' | 'http';
  // BigQuery specific
  project_id: string;
  dataset: string;
  service_account_json: string;
  // MindsDB sync
  syncToMindsDB: boolean;
  mindsdbName: string;
  // Product assignment
  assignToProduct: boolean;
}

interface ConnectionsViewProps {
  organizationId: string;
  productId?: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface DatabaseType {
  value: string;
  engine: string;
  provider?: string;
  label: string;
  logos: {
    dark: string;
    light: string;
  };
}

const DATABASE_TYPES: DatabaseType[] = [
  { 
    value: 'postgresql',
    engine: 'postgresql',
    label: 'PostgreSQL', 
    logos: {
      dark: '/images/db-logos/postgresql-dark.svg',
      light: '/images/db-logos/postgresql-light.svg',
    }
  },
  { 
    value: 'bigquery',
    engine: 'bigquery',
    label: 'BigQuery', 
    logos: {
      dark: '/images/db-logos/bigquery-dark.svg',
      light: '/images/db-logos/bigquery-light.svg',
    }
  },
  { 
    value: 'databricks',
    engine: 'databricks',
    label: 'Databricks', 
    logos: {
      dark: '/images/db-logos/databricks-dark.svg',
      light: '/images/db-logos/databricks-light.svg',
    }
  },
  {
    value: 'aurora',
    engine: 'postgresql',
    provider: 'aurora',
    label: 'Amazon Aurora',
    logos: {
      dark: '/images/db-logos/aurora-dark.svg',
      light: '/images/db-logos/aurora-light.svg',
    }
  },
  {
    value: 'redshift',
    engine: 'redshift',
    provider: 'redshift',
    label: 'Amazon Redshift',
    logos: {
      dark: '/images/db-logos/redshift-dark.svg',
      light: '/images/db-logos/redshift-light.svg',
    }
  },
  {
    value: 'mssqlserver',
    engine: 'mssql',
    provider: 'mssqlserver',
    label: 'MS SQL Server',
    logos: {
      dark: '/images/db-logos/mssql-dark.svg',
      light: '/images/db-logos/mssql-light.svg',
    }
  },
  {
    value: 'sqlserver',
    engine: 'mssql',
    provider: 'sqlserver',
    label: 'SQL Server',
    logos: {
      dark: '/images/db-logos/sqlserver-dark.svg',
      light: '/images/db-logos/sqlserver-light.svg',
    }
  },
  {
    value: 'azuresynapse',
    engine: 'mssql',
    provider: 'azuresynapse',
    label: 'Azure Synapse',
    logos: {
      dark: '/images/db-logos/azuresynapse-dark.svg',
      light: '/images/db-logos/azuresynapse-light.svg',
    }
  },
  {
    value: 'snowflake',
    engine: 'snowflake',
    provider: 'snowflake',
    label: 'Snowflake',
    logos: {
      dark: '/images/db-logos/snowflake-dark.svg',
      light: '/images/db-logos/snowflake-light.svg',
    }
  },
  {
    value: 'mysql',
    engine: 'mysql',
    provider: 'mysql',
    label: 'MySQL',
    logos: {
      dark: '/images/db-logos/mysql-dark.svg',
      light: '/images/db-logos/mysql-light.svg',
    }
  },
  {
    value: 'mariadb',
    engine: 'mariadb',
    provider: 'mariadb',
    label: 'MariaDB',
    logos: {
      dark: '/images/db-logos/mariadb-dark.svg',
      light: '/images/db-logos/mariadb-light.svg',
    }
  },
  {
    value: 'clickhouse',
    engine: 'clickhouse',
    provider: 'clickhouse',
    label: 'ClickHouse',
    logos: {
      dark: '/images/db-logos/clickhouse-dark.svg',
      light: '/images/db-logos/clickhouse-light.svg',
    }
  },
  {
    value: 'csv',
    engine: 'bigquery',
    provider: 'csv',
    label: 'CSV',
    logos: {
      dark: '/images/emptychat.svg',
      light: '/images/emptychat.svg',
    }
  },
  {
    value: 'excel',
    engine: 'bigquery',
    provider: 'excel',
    label: 'Excel',
    logos: {
      dark: '/images/emptychat.svg',
      light: '/images/emptychat.svg',
    }
  },
  {
    value: 'txt',
    engine: 'bigquery',
    provider: 'txt',
    label: 'TXT',
    logos: {
      dark: '/images/emptychat.svg',
      light: '/images/emptychat.svg',
    }
  },
  {
    value: 'parquet',
    engine: 'bigquery',
    provider: 'parquet',
    label: 'Parquet',
    logos: {
      dark: '/images/emptychat.svg',
      light: '/images/emptychat.svg',
    }
  },
  {
    value: 'avro',
    engine: 'bigquery',
    provider: 'avro',
    label: 'Avro',
    logos: {
      dark: '/images/emptychat.svg',
      light: '/images/emptychat.svg',
    }
  },
];

export default function ConnectionsView({ organizationId, productId, showNotification }: ConnectionsViewProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; organization_id?: string | null }>>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasShownSemanticCueRef = useRef(false);
  const { isDark, applyThemeClass } = useThemeMode();

  const logoForType = useMemo(() => (
    (dbType?: DatabaseType) => (dbType ? (isDark ? dbType.logos.dark : dbType.logos.light) : undefined)
  ), [isDark]);

  const headerTitleClass = applyThemeClass('text-white', 'text-gray-900');
  const headerSubtitleClass = applyThemeClass('text-gray-400', 'text-gray-600');
  const searchInputClasses = applyThemeClass(
    'bg-minddash-elevated border border-minddash-border text-white placeholder:text-gray-500',
    'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-500'
  );
  const cardSurfaceClass = applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200');
  const primaryTextClass = applyThemeClass('text-white', 'text-gray-900');
  const secondaryTextClass = applyThemeClass('text-gray-400', 'text-gray-600');
  const tertiaryTextClass = applyThemeClass('text-gray-500', 'text-gray-500');
  const modalSurfaceClass = applyThemeClass('bg-minddash-card border border-minddash-border', 'bg-white border border-gray-200');
  const labelClass = applyThemeClass('text-gray-300', 'text-gray-700');
  const inputClasses = applyThemeClass(
    'bg-minddash-elevated border border-minddash-border text-white placeholder:text-gray-500',
    'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-500'
  );
  const dropdownSurfaceClass = applyThemeClass('bg-minddash-elevated border border-minddash-border', 'bg-white border border-gray-200');
  const dropdownItemHoverClass = applyThemeClass('hover:bg-gray-700/40', 'hover:bg-gray-100');
  const checkboxLabelClass = applyThemeClass('text-gray-300', 'text-gray-700');
  const modalTextClass = applyThemeClass('text-white', 'text-gray-900');
  const modalMutedTextClass = applyThemeClass('text-gray-400', 'text-gray-600');
  const modalAlertBgClass = applyThemeClass('bg-red-500/10 border border-red-500/30', 'bg-red-50 border border-red-200');
  const modalAlertTextClass = applyThemeClass('text-red-400', 'text-red-600');
  const secondaryButtonHoverClass = applyThemeClass('hover:text-white', 'hover:text-gray-900');
  const navigateToSemanticLayer = () => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('section', 'semantic');
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const [showNextStepCue, setShowNextStepCue] = useState(false);
  const [highlightSemanticCue, setHighlightSemanticCue] = useState(false);

  const [formData, setFormData] = useState<ConnectionFormState>({
    name: '',
    type: 'postgresql',
    description: '',
    is_active: true,
    provider: '',
    aurora_engine: 'mysql',
    file: null,
    table_name: '',
    product_id: productId || '',
    // PostgreSQL
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
    schema: '',
    sslmode: 'require',
    server: '',
    warehouse: '',
    protocol: 'native',
    // BigQuery
    project_id: '',
    dataset: '',
    service_account_json: '',
    // MindsDB
    syncToMindsDB: true,
    mindsdbName: '',
    // Product assignment
    assignToProduct: !!productId, // Default to true if productId is provided
  });
  const [isSaving, setIsSaving] = useState(false);

  const fileConnectionTypes = useMemo(() => new Set(['csv', 'excel', 'txt', 'parquet', 'avro']), []);
  const isFileConnectionType = (type: string) => fileConnectionTypes.has((type || '').toLowerCase());

  const fileConnectionConfig = useMemo(
    () =>
      ({
        csv: {
          name: 'csv_connection',
          file_format: 'CSV',
          skip_leading_rows: 1,
          field_delimiter: ',',
          quote_character: '"',
          accept: '.csv',
        },
        excel: {
          name: 'excel_connection',
          file_format: 'CSV',
          skip_leading_rows: 1,
          accept: '.xlsx,.xls',
        },
        txt: {
          name: 'txt_connection',
          file_format: 'CSV',
          skip_leading_rows: 1,
          field_delimiter: '|',
          quote_character: '"',
          accept: '.txt',
        },
        parquet: {
          name: 'parquet_connection',
          file_format: 'PARQUET',
          accept: '.parquet',
        },
        avro: {
          name: 'avro_connection',
          file_format: 'AVRO',
          accept: '.avro',
        },
      }) as const,
    []
  );

  const handleSessionExpired = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('evolve-auth');
      }
    } catch {
      // ignore
    }
    showNotification('error', 'Tu sesión ha expirado. Vuelve a iniciar sesión para continuar.');
    router.push('/login?logout=true');
  };

  useEffect(() => {
    loadConnections();
  }, [organizationId]);

  useEffect(() => {
    loadProducts();
  }, [organizationId]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setProducts([]);
        return;
      }
      const auth = JSON.parse(authData);

      const response = await fetch('/api/admin-client/products', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      if (!response.ok) {
        setProducts([]);
        return;
      }

      const data = await response.json();
      const rawProducts = (data?.data?.products || []) as any[];
      const normalized = rawProducts
        .filter((p) => !organizationId || !p?.organization_id || p?.organization_id === organizationId)
        .map((p) => ({
          id: p.id,
          name: p.name || p.nombre || p.product_name || 'Producto',
          organization_id: p.organization_id,
        }));

      setProducts(normalized);

      setFormData((prev) => {
        const preferred = productId && normalized.some((p) => p.id === productId) ? productId : (normalized[0]?.id || prev.product_id || '');
        if (preferred === prev.product_id) return prev;
        return {
          ...prev,
          product_id: preferred,
        };
      });
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    const hasConnections = (connections || []).length > 0;
    setShowNextStepCue(hasConnections);
    if (hasConnections && !hasShownSemanticCueRef.current) {
      hasShownSemanticCueRef.current = true;
      setHighlightSemanticCue(true);
    }
  }, [connections]);

  useEffect(() => {
    if (!highlightSemanticCue) return;
    const timeout = setTimeout(() => setHighlightSemanticCue(false), 1800);
    return () => clearTimeout(timeout);
  }, [highlightSemanticCue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadConnections = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        return;
      }

      const auth = JSON.parse(authData);
      
      // Cargar conexiones de la organización
      const response = await fetch('/api/backend/connections/organization', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organization_id: organizationId }),
      });

      const data = await response.json();
      let connectionsData: Connection[] = [];
      
      if (data.success && data.data) {
        connectionsData = Array.isArray(data.data) ? data.data : [];
      }

      setConnections(connectionsData);
    } catch (error) {
      console.error('Error al cargar conexiones:', error);
      setConnections([]);
      showNotification('error', 'Error al cargar conexiones');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const buildConnectionFromResponse = (created: any): Connection => {
    const configuration = created?.configuration || created?.connection_configuration;
    return {
      id: created?.id || created?.connection_id || created?.name || `conn-${Date.now()}`,
      organization_id: created?.organization_id || organizationId,
      name: created?.name || formData.name,
      type: created?.type || formData.type,
      provider: created?.provider ?? configuration?.provider,
      host: created?.host ?? configuration?.host ?? formData.host,
      port: created?.port ?? configuration?.port ?? formData.port,
      database: created?.database ?? configuration?.database ?? formData.database,
      schema: configuration?.schema,
      sslmode: configuration?.sslmode ?? configuration?.ssl_mode,
      server: configuration?.server,
      warehouse: configuration?.warehouse,
      protocol: configuration?.protocol,
      db_engine: configuration?.db_engine,
      description: created?.description ?? formData.description,
      is_active: typeof created?.is_active === 'boolean' ? created.is_active : formData.is_active,
    };
  };

  const defaultPortFor = (
    uiType: string,
    options?: {
      auroraEngine?: 'mysql' | 'postgresql';
      protocol?: 'native' | 'http';
    }
  ) => {
    const auroraEngine = options?.auroraEngine || 'mysql';
    const protocol = options?.protocol || 'native';
    switch ((uiType || '').toLowerCase()) {
      case 'postgresql':
        return 5432;
      case 'mysql':
      case 'mariadb':
        return 3306;
      case 'aurora':
        return auroraEngine === 'postgresql' ? 5432 : 3306;
      case 'redshift':
        return 5439;
      case 'mssqlserver':
      case 'sqlserver':
      case 'azuresynapse':
        return 1433;
      case 'snowflake':
        return 443;
      case 'clickhouse':
        return protocol === 'http' ? 8123 : 9000;
      default:
        return 5432;
    }
  };

  const selectedDatabaseType = useMemo(() => {
    return DATABASE_TYPES.find((t) => t.value === formData.type);
  }, [formData.type]);

  const resolveEngineAndProvider = () => {
    if (formData.type === 'aurora') {
      return {
        engine: formData.aurora_engine,
        provider: 'aurora',
      };
    }

    const fallback = {
      engine: formData.type,
      provider: '',
    };

    if (!selectedDatabaseType) {
      return fallback;
    }

    return {
      engine: selectedDatabaseType.engine,
      provider: selectedDatabaseType.provider || '',
    };
  };

  const handleCreateConnection = async () => {
    if (isFileConnectionType(formData.type)) {
      const config = (fileConnectionConfig as any)[(formData.type || '').toLowerCase()];

      if (!config) {
        showNotification('error', 'Tipo de conexión no soportado');
        return;
      }

      if (!formData.product_id) {
        showNotification('error', 'Selecciona un producto');
        return;
      }

      if (!formData.table_name.trim()) {
        showNotification('error', 'El nombre de la tabla es requerido');
        return;
      }

      if (!formData.file) {
        showNotification('error', 'Selecciona un archivo');
        return;
      }

      setIsSaving(true);
      try {
        const authData = localStorage.getItem('evolve-auth');
        if (!authData) return;
        const auth = JSON.parse(authData);

        const cfgRT = await fetchRuntimeConfig();
        const serverUrl = cfgRT.mindsdbServerUrl || process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL;
        const gcsBucketName = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'gs-minddash-agent-env';
        const safe = (value: string) =>
          (value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_');

        const safeProduct = safe(formData.product_id).slice(0, 12);
        const safeTable = safe(formData.table_name);
        const mindsdbName = `conn_${safe((formData.type || 'file') + '_connection')}_${safeProduct}_${safeTable}`.slice(0, 120);

        const payload = new FormData();
        payload.set('file', formData.file);
        payload.set('table_name', formData.table_name.trim());
        payload.set('engine', 'bigquery');
        payload.set('name', mindsdbName);
        payload.set('product_id', formData.product_id);
        payload.set('bucket_name', gcsBucketName);
        payload.set('file_format', config.file_format);

        if (typeof config.skip_leading_rows === 'number') {
          payload.set('skip_leading_rows', String(config.skip_leading_rows));
        }
        if (config.field_delimiter) {
          payload.set('field_delimiter', config.field_delimiter);
        }
        if (config.quote_character) {
          payload.set('quote_character', config.quote_character);
        }

        const mindsdbResponse = await fetch('/api/backend/mindsdb/connections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
          },
          body: payload,
        });

        const mindsdbData = await mindsdbResponse.json().catch(() => ({}));
        if (mindsdbResponse.status === 401) {
          handleSessionExpired();
          return;
        }
        if (!mindsdbResponse.ok || mindsdbData?.success === false) {
          showNotification('error', mindsdbData?.message || 'Error al crear conexión');
          return;
        }

        const localName = `${formData.table_name.trim()}_${(formData.type || 'file').toLowerCase()}`;
        const localPayload: any = {
          organization_id: organizationId,
          name: localName,
          type: 'bigquery',
          description: formData.description,
          is_active: formData.is_active,
          additional_params: {
            provider: (formData.type || '').toLowerCase(),
            mindsdb_name: mindsdbName,
            product_id: formData.product_id,
            table_name: formData.table_name.trim(),
            bucket_name: gcsBucketName,
            file_format: config.file_format,
          },
        };

        if (typeof config.skip_leading_rows === 'number') {
          localPayload.additional_params.skip_leading_rows = config.skip_leading_rows;
        }
        if (config.field_delimiter) {
          localPayload.additional_params.field_delimiter = config.field_delimiter;
        }
        if (config.quote_character) {
          localPayload.additional_params.quote_character = config.quote_character;
        }

        const localResponse = await fetch('/api/backend/connections/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(localPayload),
        });

        const localData = await localResponse.json().catch(() => ({}));
        if (localResponse.status === 401) {
          handleSessionExpired();
          return;
        }

        if (!localResponse.ok || localData?.success === false) {
          showNotification(
            'info',
            localData?.message || 'Conexión creada, pero no se pudo registrar en el listado. Reintenta o contacta soporte.'
          );
        } else {
          showNotification('success', 'Conexión creada exitosamente');
        }

        setShowCreateModal(false);
        resetForm();
        await loadConnections({ silent: true });
      } catch (error) {
        console.error('Error creando conexión de archivo:', error);
        showNotification('error', 'Error al crear la conexión');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Validaciones según tipo de conexión
    if (!formData.name.trim()) {
      showNotification('error', 'El nombre de la conexión es requerido');
      return;
    }

    if (formData.type === 'bigquery') {
      if (!formData.project_id.trim() || !formData.dataset.trim()) {
        showNotification('error', 'Project ID y Dataset son requeridos para BigQuery');
        return;
      }
    } else if (formData.type === 'redshift') {
      if (!formData.host.trim() || !formData.database.trim() || !formData.username.trim() || !formData.password.trim() || !formData.schema.trim() || !formData.sslmode) {
        showNotification('error', 'Host, base de datos, usuario, contraseña, schema y sslmode son requeridos para Redshift');
        return;
      }
    } else if (formData.type === 'snowflake') {
      if (!formData.host.trim() || !formData.server.trim() || !formData.database.trim() || !formData.schema.trim() || !formData.warehouse.trim() || !formData.username.trim() || !formData.password.trim()) {
        showNotification('error', 'Host, server, base de datos, schema, warehouse, usuario y contraseña son requeridos para Snowflake');
        return;
      }
    } else if (formData.type === 'clickhouse') {
      if (!formData.host.trim() || !formData.database.trim() || !formData.username.trim() || !formData.password.trim() || !formData.protocol) {
        showNotification('error', 'Host, base de datos, usuario, contraseña y protocolo son requeridos para ClickHouse');
        return;
      }
    } else {
      if (!formData.host.trim() || !formData.database.trim() || !formData.username.trim()) {
        showNotification('error', 'Host, base de datos y usuario son requeridos');
        return;
      }
      if ((formData.type === 'mssqlserver' || formData.type === 'sqlserver' || formData.type === 'azuresynapse') && !formData.password.trim()) {
        showNotification('error', 'La contraseña es requerida para SQL Server');
        return;
      }
      if (formData.type === 'mariadb' && !formData.password.trim()) {
        showNotification('error', 'La contraseña es requerida para MariaDB');
        return;
      }
      if (formData.type === 'mysql' && !formData.password.trim()) {
        showNotification('error', 'La contraseña es requerida para MySQL');
        return;
      }
      if (formData.type === 'aurora' && !formData.password.trim()) {
        showNotification('error', 'La contraseña es requerida para Aurora');
        return;
      }
    }

    setIsSaving(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);

      // 1. Crear conexión en la base de datos local
      const resolved = resolveEngineAndProvider();
      const engine = resolved.engine;
      const provider = resolved.provider;
      const connectionPayload: any = {
        organization_id: organizationId,
        name: formData.name,
        type: engine,
        description: formData.description,
        is_active: formData.is_active,
      };

      if (engine === 'bigquery') {
        const additionalParams: any = {
          project_id: formData.project_id,
          dataset: formData.dataset,
        };

        if (formData.service_account_json.trim()) {
          additionalParams.has_service_account_json = true;
        }

        connectionPayload.additional_params = additionalParams;
      } else {
        connectionPayload.host = formData.host;
        connectionPayload.port = formData.port;
        connectionPayload.database = formData.database;
        connectionPayload.username = formData.username;
        connectionPayload.password = formData.password;

        const additionalParams: any = {};
        if (provider) {
          additionalParams.provider = provider;
        }
        if (formData.type === 'aurora') {
          additionalParams.db_engine = formData.aurora_engine;
        }
        if (formData.type === 'redshift') {
          additionalParams.schema = formData.schema;
          additionalParams.ssl_mode = formData.sslmode;
        }
        if (formData.type === 'snowflake') {
          additionalParams.server = formData.server;
          additionalParams.schema = formData.schema;
          additionalParams.warehouse = formData.warehouse;
        }
        if (formData.type === 'clickhouse') {
          additionalParams.protocol = formData.protocol;
        }
        if (formData.type === 'mssqlserver' || formData.type === 'sqlserver' || formData.type === 'azuresynapse') {
          if (formData.server.trim()) {
            additionalParams.server = formData.server.trim();
          }
        }

        if (Object.keys(additionalParams).length > 0) {
          connectionPayload.additional_params = additionalParams;
        }
      }

      const response = await fetch('/api/backend/connections/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionPayload),
      });

      const data = await response.json();
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!data.success) {
        showNotification('error', data.message || 'Error al crear conexión');
        return;
      }

      try {
        const resolved = resolveEngineAndProvider();
        const engine = resolved.engine;
        const mindsdbEngine = engine === 'postgresql' ? 'postgres' : engine;
        const mindsdbName = formData.mindsdbName || formData.name;
        const mindsdbPayload: any = {
          name: mindsdbName,
          engine: mindsdbEngine,
          parameters: {},
        };

        if (engine === 'bigquery') {
          mindsdbPayload.parameters = {
            project_id: formData.project_id,
            dataset: formData.dataset,
          };
          if (formData.service_account_json.trim()) {
            try {
              mindsdbPayload.parameters.service_account_json = JSON.parse(formData.service_account_json);
            } catch {
              showNotification('error', 'El JSON de la cuenta de servicio no es válido');
              return;
            }
          }
        } else {
          mindsdbPayload.parameters = {
            host: formData.host,
            port: formData.port,
            database: formData.database,
            user: formData.username,
            password: formData.password,
          };

          if (engine === 'redshift') {
            mindsdbPayload.parameters.schema = formData.schema;
            mindsdbPayload.parameters.ssl_mode = formData.sslmode;
          }

          if (engine === 'snowflake') {
            mindsdbPayload.parameters.server = formData.server;
            mindsdbPayload.parameters.schema = formData.schema;
            mindsdbPayload.parameters.warehouse = formData.warehouse;
          }

          if (engine === 'clickhouse') {
            mindsdbPayload.parameters.protocol = formData.protocol;
          }

          if (engine === 'mssql' && formData.server.trim()) {
            mindsdbPayload.parameters.server = formData.server.trim();
          }
        }

        const mindsdbResponse = await fetch('/api/backend/mindsdb/connections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mindsdbPayload),
        });

        const mindsdbData = await mindsdbResponse.json();
        if (mindsdbResponse.status === 401) {
          handleSessionExpired();
          return;
        }
        if (!mindsdbData.success) {
          showNotification(
            'info',
            'Conexión creada, pero no se pudo validar la conexión a la base de datos. Revisa la configuración.'
          );
        } else {
          showNotification('success', 'Conexión creada y validada correctamente');
        }
      } catch (error) {
        console.error('Error registrando conexión remota:', error);
        showNotification(
          'info',
          'Conexión creada, pero no se pudo validar la conexión a la base de datos. Revisa la configuración.'
        );
      }

      setShowCreateModal(false);
      resetForm();
      await loadConnections({ silent: true });
    } catch (error) {
      console.error('Error creando conexión:', error);
      showNotification('error', 'Error al crear la conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConnection = async () => {
    if (!selectedConnection) return;

    // Validaciones según tipo de conexión
    if (!formData.name.trim()) {
      showNotification('error', 'El nombre de la conexión es requerido');
      return;
    }

    if (formData.type === 'bigquery') {
      if (!formData.project_id.trim() || !formData.dataset.trim()) {
        showNotification('error', 'Project ID y Dataset son requeridos para BigQuery');
        return;
      }
    } else if (formData.type === 'redshift') {
      if (!formData.host.trim() || !formData.database.trim() || !formData.schema.trim() || !formData.sslmode) {
        showNotification('error', 'Host, base de datos, schema y sslmode son requeridos para Redshift');
        return;
      }
    } else if (formData.type === 'snowflake') {
      if (!formData.host.trim() || !formData.server.trim() || !formData.database.trim() || !formData.schema.trim() || !formData.warehouse.trim()) {
        showNotification('error', 'Host, server, base de datos, schema y warehouse son requeridos para Snowflake');
        return;
      }
    } else if (formData.type === 'clickhouse') {
      if (!formData.host.trim() || !formData.database.trim() || !formData.protocol) {
        showNotification('error', 'Host, base de datos y protocolo son requeridos para ClickHouse');
        return;
      }
    } else {
      if (!formData.host.trim() || !formData.database.trim()) {
        showNotification('error', 'Host y base de datos son requeridos');
        return;
      }
    }

    setIsSaving(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);

      // 1. Actualizar conexión en la base de datos local
      const resolved = resolveEngineAndProvider();
      const engine = resolved.engine;
      const provider = resolved.provider;
      const connectionPayload: any = {
        organization_id: organizationId,
        name: formData.name,
        type: engine,
        description: formData.description,
        is_active: formData.is_active,
      };

      if (engine === 'bigquery') {
        const additionalParams: any = {
          project_id: formData.project_id,
          dataset: formData.dataset,
        };

        if (formData.service_account_json.trim() || (!formData.service_account_json.trim() && selectedConnection?.type === 'bigquery' && selectedConnection?.has_service_account_json)) {
          additionalParams.has_service_account_json = true;
        }

        connectionPayload.additional_params = additionalParams;
      } else {
        connectionPayload.host = formData.host;
        connectionPayload.port = formData.port;
        connectionPayload.database = formData.database;
        if (formData.username) connectionPayload.username = formData.username;
        if (formData.password) connectionPayload.password = formData.password;

        const additionalParams: any = {};
        if (provider) {
          additionalParams.provider = provider;
        }
        if (formData.type === 'aurora') {
          additionalParams.db_engine = formData.aurora_engine;
        }
        if (formData.type === 'redshift') {
          additionalParams.schema = formData.schema;
          additionalParams.ssl_mode = formData.sslmode;
        }
        if (formData.type === 'snowflake') {
          additionalParams.server = formData.server;
          additionalParams.schema = formData.schema;
          additionalParams.warehouse = formData.warehouse;
        }
        if (formData.type === 'clickhouse') {
          additionalParams.protocol = formData.protocol;
        }
        if (formData.type === 'mssqlserver' || formData.type === 'sqlserver' || formData.type === 'azuresynapse') {
          if (formData.server.trim()) {
            additionalParams.server = formData.server.trim();
          }
        }

        if (Object.keys(additionalParams).length > 0) {
          connectionPayload.additional_params = additionalParams;
        }
      }

      const response = await fetch(`/api/backend/connections/${selectedConnection.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionPayload),
      });

      const data = await response.json();
      if (response.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!data.success && !response.ok) {
        showNotification('error', data.message || 'Error al actualizar conexión');
        return;
      }

      try {
        const resolved = resolveEngineAndProvider();
        const engine = resolved.engine;
        const mindsdbEngine = engine === 'postgresql' ? 'postgres' : engine;
        const mindsdbName = formData.mindsdbName || formData.name;
        const mindsdbPayload: any = {
          name: mindsdbName,
          engine: mindsdbEngine,
          parameters: {},
        };

        if (engine === 'bigquery') {
          mindsdbPayload.parameters = {
            project_id: formData.project_id,
            dataset: formData.dataset,
          };
          if (formData.service_account_json.trim()) {
            try {
              mindsdbPayload.parameters.service_account_json = JSON.parse(formData.service_account_json);
            } catch {
              showNotification('error', 'El JSON de la cuenta de servicio no es válido');
              return;
            }
          }
        } else {
          mindsdbPayload.parameters = {
            host: formData.host,
            port: formData.port,
            database: formData.database,
            user: formData.username,
            password: formData.password,
          };

          if (engine === 'redshift') {
            mindsdbPayload.parameters.schema = formData.schema;
            mindsdbPayload.parameters.ssl_mode = formData.sslmode;
          }

          if (engine === 'snowflake') {
            mindsdbPayload.parameters.server = formData.server;
            mindsdbPayload.parameters.schema = formData.schema;
            mindsdbPayload.parameters.warehouse = formData.warehouse;
          }

          if (engine === 'clickhouse') {
            mindsdbPayload.parameters.protocol = formData.protocol;
          }

          if (engine === 'mssql' && formData.server.trim()) {
            mindsdbPayload.parameters.server = formData.server.trim();
          }
        }

        const mindsdbResponse = await fetch('/api/backend/mindsdb/connections/update', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mindsdbPayload),
        });

        const mindsdbData = await mindsdbResponse.json();
        if (mindsdbResponse.status === 401) {
          handleSessionExpired();
          return;
        }
        if (!mindsdbData.success) {
          showNotification(
            'info',
            'Conexión actualizada, pero no se pudo validar la conexión a la base de datos. Revisa la configuración.'
          );
        } else {
          showNotification('success', 'Conexión actualizada y validada correctamente');
        }
      } catch (error) {
        console.error('Error actualizando conexión remota:', error);
        showNotification(
          'info',
          'Conexión actualizada, pero no se pudo validar la conexión a la base de datos.'
        );
      }

      setShowEditModal(false);
      setSelectedConnection(null);
      resetForm();
      await loadConnections({ silent: true });
    } catch (error) {
      console.error('Error actualizando conexión:', error);
      showNotification('error', 'Error al actualizar la conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteConnection = async () => {
    if (!selectedConnection) return;

    setIsSaving(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);

      // 1. Si tiene mindsdb_name, eliminar de MindsDB primero
      if (selectedConnection.mindsdb_name) {
        const mindsdbPayload = {
          name: selectedConnection.mindsdb_name,
          engine: selectedConnection.type === 'postgresql' ? 'postgres' : selectedConnection.type,
        };

        try {
          await fetch('/api/backend/mindsdb/connections/drop', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mindsdbPayload),
          });
        } catch (mindsdbError) {
          console.warn('Error eliminando de MindsDB:', mindsdbError);
          // Continuar con la eliminación local aunque falle MindsDB
        }
      }

      // 2. Eliminar conexión de la base de datos local
      const response = await fetch(`/api/backend/connections/${selectedConnection.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      const data = await response.json();
      if (data.success || response.ok) {
        showNotification('success', 'Conexión eliminada exitosamente');
        setShowDeleteModal(false);
        setSelectedConnection(null);
        await loadConnections({ silent: true });
      } else {
        showNotification('error', data.message || 'Error al eliminar conexión');
      }
    } catch (error) {
      console.error('Error eliminando conexión:', error);
      showNotification('error', 'Error al eliminar la conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'postgresql',
      description: '',
      is_active: true,
      provider: '',
      aurora_engine: 'mysql',
      file: null,
      table_name: '',
      product_id: productId || '',
      // PostgreSQL
      host: '',
      port: 5432,
      database: '',
      username: '',
      password: '',
      schema: '',
      sslmode: 'require',
      server: '',
      warehouse: '',
      protocol: 'native',
      // BigQuery
      project_id: '',
      dataset: '',
      service_account_json: '',
      // MindsDB
      syncToMindsDB: true,
      mindsdbName: '',
      // Product assignment
      assignToProduct: !!productId,
    });
  };

  const filteredConnections = (Array.isArray(connections) ? connections : []).filter((conn) =>
    conn.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold flex items-center space-x-2 ${headerTitleClass}`}>
            <FiDatabase className="text-blue-500" />
            <span>Conexiones a Bases de Datos</span>
          </h2>
          <p className={`text-sm mt-1 ${headerSubtitleClass}`}>
            Gestiona las conexiones a fuentes de datos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Nueva Conexión</span>
        </button>
      </div>

      {/* Next-step guidance */}
      <AnimatePresence>
        {showNextStepCue && (
          <motion.div
            key="semantic-next-step"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`${cardSurfaceClass} rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-dashed border-blue-500/40 ${highlightSemanticCue ? 'semantic-cue-highlight' : ''}`}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <FiLayers className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${primaryTextClass}`}>Paso siguiente: construye tu Capa Semántica</p>
                <p className={`text-xs mt-1 ${secondaryTextClass}`}>
                  Ahora que tienes conexiones activas, define campos y conceptos para tus modelos.
                </p>
              </div>
            </div>
            <button
              onClick={navigateToSemanticLayer}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRefreshing ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                'Ir a Capa Semántica'
              )}
            </button>
          </motion.div>
          )}
        </AnimatePresence>

      {/* Búsqueda */}
      <div className="relative">
        <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${secondaryTextClass}`} />
        <input
          type="text"
          placeholder="Buscar conexiones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 ${searchInputClasses}`}
        />
      </div>

      {/* Grid de Conexiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredConnections.map((connection) => {
            const connectionTypeValue = (connection.provider || connection.type || '').toLowerCase();
            const dbType = DATABASE_TYPES.find(t => t.value === connectionTypeValue);
            return (
              <motion.div
                key={connection.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`${cardSurfaceClass} rounded-lg p-6 hover:border-blue-500/50 transition-all group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 relative">
                      {dbType ? (
                        <Image
                          src={logoForType(dbType) || ''}
                          alt={dbType.label}
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <div className="text-3xl">🔌</div>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm ${primaryTextClass}`}>{connection.name}</h3>
                      <p className={`text-[11px] ${secondaryTextClass}`}>{dbType?.label || connection.provider || connection.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSelectedConnection(connection);
                        const normalizedType = (connection.provider || connection.type || 'postgresql').toLowerCase();
                        setFormData({
                          name: connection.name,
                          type: normalizedType,
                          description: connection.description || '',
                          is_active: connection.is_active,
                          provider: connection.provider || '',
                          aurora_engine: (connection.db_engine || (connection.type === 'postgresql' || connection.type === 'mysql' ? connection.type : 'mysql')) as any,
                          file: null,
                          table_name: '',
                          product_id: productId || '',
                          // PostgreSQL
                          host: connection.host || '',
                          port: connection.port || 5432,
                          database: connection.database || '',
                          username: '',
                          password: '',
                          schema: connection.schema || '',
                          sslmode: (connection.sslmode || 'require') as any,
                          server: connection.server || '',
                          warehouse: connection.warehouse || '',
                          protocol: (connection.protocol || 'native') as any,
                          // BigQuery
                          project_id: connection.project_id || '',
                          dataset: connection.dataset || '',
                          service_account_json: '',
                          // MindsDB
                          syncToMindsDB: !!connection.mindsdb_name,
                          mindsdbName: connection.mindsdb_name || '',
                          // Product assignment
                          assignToProduct: !!productId,
                        });
                        setShowEditModal(true);
                      }}
                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConnection(connection);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* PostgreSQL info */}
                {connection.type !== 'bigquery' && connection.host && (
                  <>
                    <div className={`text-sm font-mono mb-2 ${secondaryTextClass}`}>
                      {connection.host}:{connection.port}
                    </div>
                    {connection.database && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>DB: {connection.database}</div>
                    )}

                    {connection.schema && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>Schema: {connection.schema}</div>
                    )}
                    {connection.warehouse && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>Warehouse: {connection.warehouse}</div>
                    )}
                    {connection.protocol && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>Protocol: {connection.protocol}</div>
                    )}
                    {connection.sslmode && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>sslmode: {connection.sslmode}</div>
                    )}
                  </>
                )}
                
                {/* BigQuery info */}
                {connection.type === 'bigquery' && (
                  <>
                    {connection.project_id && (
                      <div className={`text-sm font-mono mb-2 ${secondaryTextClass}`}>
                        Project: {connection.project_id}
                      </div>
                    )}
                    {connection.dataset && (
                      <div className={`text-sm mb-2 ${secondaryTextClass}`}>Dataset: {connection.dataset}</div>
                    )}
                  </>
                )}

                {connection.description && (
                  <p className={`text-xs ${tertiaryTextClass}`}>{connection.description}</p>
                )}
                
                {/* MindsDB sync indicator */}
                {connection.mindsdb_name && (
                  <div className={`text-xs mt-2 ${tertiaryTextClass}`}>
                    🔗 Identificador remoto: {connection.mindsdb_name}
                  </div>
                )}

                <div className="mt-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    connection.is_active 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {connection.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredConnections.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FiDatabase className={`w-16 h-16 mx-auto mb-4 ${secondaryTextClass}`} />
            <p className={secondaryTextClass}>No hay conexiones configuradas</p>
          </div>
        )}
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
              className={`${modalSurfaceClass} rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${primaryTextClass}`}>
                  {showCreateModal ? 'Nueva Conexión' : 'Editar Conexión'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedConnection(null);
                    resetForm();
                  }}
                  className={`${secondaryTextClass} ${secondaryButtonHoverClass}`}
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                {!isFileConnectionType(formData.type) && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Nombre de la conexión *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                      placeholder={formData.type === 'bigquery' ? 'bigquery_mis_reportes' : 'mi_conexion_postgresql'}
                    />
                    <p className={`text-xs mt-1 ${tertiaryTextClass}`}>
                      Este nombre identifica la conexión dentro de la plataforma
                    </p>
                  </div>
                )}

                {/* Tipo de BD */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Tipo de Base de Datos *</label>
                  <div ref={typeDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                      disabled={showEditModal}
                      className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 flex items-center justify-between text-sm ${inputClasses} ${showEditModal ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const selectedType = DATABASE_TYPES.find((type) => type.value === formData.type);
                          return selectedType ? (
                            <span className="flex items-center space-x-2">
                              <span className="relative w-5 h-5">
                                <Image src={logoForType(selectedType) || ''} alt={selectedType.label} fill className="object-contain" />
                              </span>
                              <span className="text-sm">{selectedType.label}</span>
                            </span>
                          ) : (
                            <span className="text-sm">{formData.type}</span>
                          );
                        })()}
                      </div>
                      <FiChevronDown className={`transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTypeDropdownOpen && !showEditModal && (
                      <div className={`absolute z-10 mt-2 w-full rounded-lg shadow-lg ${dropdownSurfaceClass}`}>
                        {DATABASE_TYPES.filter(t => t.value !== 'databricks').map((type) => {
                          const isSelected = formData.type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => {
                                const nextType = type.value;
                                const nextAuroraEngine: 'mysql' | 'postgresql' = 'mysql';
                                const nextProtocol: 'native' | 'http' = 'native';
                                const nextPort = defaultPortFor(nextType, {
                                  auroraEngine: nextAuroraEngine,
                                  protocol: nextProtocol,
                                });
                                setFormData({
                                  ...formData,
                                  type: nextType,
                                  port: nextPort,
                                  schema: '',
                                  sslmode: 'require',
                                  server: '',
                                  warehouse: '',
                                  protocol: nextProtocol,
                                  aurora_engine: nextAuroraEngine,
                                });
                                setIsTypeDropdownOpen(false);
                              }}
                              className={`w-full flex items-center space-x-3 px-4 py-2 text-left text-sm ${dropdownItemHoverClass} ${
                                isSelected ? applyThemeClass('bg-gray-700/30', 'bg-gray-100') : ''
                              }`}
                            >
                              <span className="relative w-5 h-5">
                                <Image src={logoForType(type) || ''} alt={type.label} fill className="object-contain" />
                              </span>
                              <span className={`text-sm ${primaryTextClass}`}>{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {isFileConnectionType(formData.type) && (
                  <>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Producto *</label>
                      <Select
                        value={formData.product_id}
                        onValueChange={(next) => setFormData({ ...formData, product_id: next })}
                        disabled={productsLoading}
                      >
                        <SelectTrigger className={`w-full ${inputClasses}`}>
                          <SelectValue placeholder={productsLoading ? 'Cargando…' : 'Seleccionar…'} />
                        </SelectTrigger>
                        <SelectContent className={dropdownSurfaceClass}>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Nombre de la tabla *</label>
                      <input
                        type="text"
                        value={formData.table_name}
                        onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                        className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                        placeholder="ventas_2024"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Archivo *</label>
                      <div className="flex items-center gap-3">
                        <label
                          aria-label="Adjuntar archivo"
                          className={`cursor-pointer rounded-lg p-2 transition-colors focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 ${applyThemeClass(
                            'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white',
                            'bg-black/5 hover:bg-black/10 text-black/40 hover:text-black'
                          )}`}
                        >
                          <input
                            className="hidden"
                            type="file"
                            accept={(fileConnectionConfig as any)[(formData.type || '').toLowerCase()]?.accept}
                            onChange={(e) => {
                              const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                              setFormData({ ...formData, file });
                            }}
                          />
                          <FiPaperclip className="h-4 w-4 transition-colors" aria-hidden="true" />
                        </label>

                        <div className={`text-sm truncate ${secondaryTextClass}`}>
                          {formData.file?.name || 'Sin archivo seleccionado'}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos de PostgreSQL */}
                {(formData.type === 'postgresql' || formData.type === 'mysql' || formData.type === 'mariadb' || formData.type === 'aurora' || formData.type === 'redshift' || formData.type === 'mssqlserver' || formData.type === 'sqlserver' || formData.type === 'azuresynapse' || formData.type === 'snowflake' || formData.type === 'clickhouse') && (
                  <>
                    {formData.type === 'aurora' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>DB Engine *</label>
                        <Select
                          value={formData.aurora_engine}
                          onValueChange={(next) => {
                            const nextEngine = (next || 'mysql') as any;
                            setFormData({
                              ...formData,
                              aurora_engine: nextEngine,
                              port: nextEngine === 'postgresql' ? 5432 : 3306,
                            });
                          }}
                        >
                          <SelectTrigger className={`w-full ${inputClasses}`}>
                            <SelectValue placeholder="Seleccionar…" />
                          </SelectTrigger>
                          <SelectContent className={dropdownSurfaceClass}>
                            <SelectItem value="mysql">mysql</SelectItem>
                            <SelectItem value="postgresql">postgres</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Host *</label>
                        <input
                          type="text"
                          value={formData.host}
                          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder={formData.type === 'redshift' ? 'nombre-cluster.identificador.region.redshift.amazonaws.com' : (formData.type === 'snowflake' ? 'account_identifier' : '0.0.0.0')}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                          Puerto{formData.type === 'snowflake' ? ' (opcional)' : ' *'}
                        </label>
                        <input
                          type="number"
                          value={formData.port}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              port:
                                parseInt(e.target.value) ||
                                defaultPortFor(formData.type, {
                                  auroraEngine: formData.aurora_engine,
                                  protocol: formData.protocol,
                                }),
                            })
                          }
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Base de Datos *</label>
                      <input
                        type="text"
                        value={formData.database}
                        onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                        className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                        placeholder="mi_base_de_datos"
                      />
                    </div>

                    {(formData.type === 'redshift' || formData.type === 'snowflake') && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Schema *</label>
                        <input
                          type="text"
                          value={formData.schema}
                          onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder="public"
                        />
                      </div>
                    )}

                    {formData.type === 'redshift' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>sslmode *</label>
                        <Select
                          value={formData.sslmode}
                          onValueChange={(next) =>
                            setFormData({ ...formData, sslmode: ((next || 'require') as any) as typeof formData.sslmode })
                          }
                        >
                          <SelectTrigger className={`w-full ${inputClasses}`}>
                            <SelectValue placeholder="Seleccionar…" />
                          </SelectTrigger>
                          <SelectContent className={dropdownSurfaceClass}>
                            <SelectItem value="require">require</SelectItem>
                            <SelectItem value="verify-full">verify-full</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.type === 'snowflake' && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Server *</label>
                          <input
                            type="text"
                            value={formData.server}
                            onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                            className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                            placeholder="account.region"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Warehouse *</label>
                          <input
                            type="text"
                            value={formData.warehouse}
                            onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                            className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                            placeholder="COMPUTE_WH"
                          />
                        </div>
                      </>
                    )}

                    {formData.type === 'clickhouse' && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Protocol *</label>
                        <Select
                          value={formData.protocol}
                          onValueChange={(next) => {
                            const nextProtocol = ((next || 'native') as any) as 'native' | 'http';
                            setFormData({
                              ...formData,
                              protocol: nextProtocol,
                              port: defaultPortFor('clickhouse', { protocol: nextProtocol }),
                            });
                          }}
                        >
                          <SelectTrigger className={`w-full ${inputClasses}`}>
                            <SelectValue placeholder="Seleccionar…" />
                          </SelectTrigger>
                          <SelectContent className={dropdownSurfaceClass}>
                            <SelectItem value="native">native</SelectItem>
                            <SelectItem value="http">http</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Usuario *</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder={formData.type === 'snowflake' ? 'USER' : 'admin'}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                          Contraseña{formData.type === 'postgresql' ? ' (opcional)' : ' *'}
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {(formData.type === 'mssqlserver' || formData.type === 'sqlserver' || formData.type === 'azuresynapse') && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Server (opcional / instancia)</label>
                        <input
                          type="text"
                          value={formData.server}
                          onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder="MSSQLSERVER"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Campos específicos de BigQuery */}
                {formData.type === 'bigquery' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Project ID *</label>
                        <input
                          type="text"
                          value={formData.project_id}
                          onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder="mi-proyecto-gcp"
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Dataset *</label>
                        <input
                          type="text"
                          value={formData.dataset}
                          onChange={(e) => setFormData({ ...formData, dataset: e.target.value })}
                          className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 ${inputClasses}`}
                          placeholder="mi_dataset"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                        Service Account JSON (opcional)
                      </label>
                      <textarea
                        value={formData.service_account_json}
                        onChange={(e) => setFormData({ ...formData, service_account_json: e.target.value })}
                        rows={6}
                        className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 resize-none font-mono text-xs ${inputClasses}`}
                        placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                      />
                      <p className={`text-xs mt-1 ${tertiaryTextClass}`}>
                        Pega el contenido completo del archivo JSON de la cuenta de servicio de Google Cloud.
                        <br />
                        <span className="inline-block mt-1 px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
                          Por seguridad, este valor solo se usa al guardar o actualizar la conexión y no se almacena ni se vuelve a mostrar aquí.
                        </span>
                      </p>
                      {!showCreateModal && selectedConnection && selectedConnection.type === 'bigquery' && selectedConnection.has_service_account_json && (
                        <p className="text-xs mt-2 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                          Ya existe una credencial de Service Account registrada para esta conexión. No se muestra por seguridad; si pegas un nuevo JSON, reemplazará la credencial anterior.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Descripción */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`w-full rounded-lg py-2 px-4 focus:outline-none focus:border-blue-500 resize-none ${inputClasses}`}
                    placeholder="Descripción opcional de la conexión"
                  />
                </div>

                {/* Sincronización remota: se realiza automáticamente al crear o actualizar la conexión */}

                {/* Estado activo */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className={`text-sm ${checkboxLabelClass}`}>
                    Conexión activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedConnection(null);
                    resetForm();
                  }}
                  className={`px-4 py-2 ${secondaryTextClass} ${secondaryButtonHoverClass}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={showCreateModal ? handleCreateConnection : handleUpdateConnection}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
                >
                  {isSaving ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiCheck className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Guardando...' : (showCreateModal ? 'Crear' : 'Guardar')}</span>
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
          {showDeleteModal && selectedConnection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${applyThemeClass('bg-minddash-card border border-red-900/50', 'bg-white border border-red-200/80')} rounded-xl p-6 max-w-md w-full`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <FiTrash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className={`text-lg font-semibold ${primaryTextClass}`}>Eliminar Conexión</h3>
              </div>

              <p className={`${modalMutedTextClass} text-sm mb-4`}>
                ¿Estás seguro de eliminar la conexión{' '}
                <span className={`font-semibold ${modalTextClass}`}>&quot;{selectedConnection.name}&quot;</span>?
              </p>

              <div className={`${modalAlertBgClass} rounded-lg p-3 mb-6`}>
                <p className={`${modalAlertTextClass} text-xs`}>
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" aria-label="Advertencia" /> Esta acción no se puede deshacer</span>
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedConnection(null);
                  }}
                  className={`px-4 py-2 ${secondaryTextClass} ${secondaryButtonHoverClass}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteConnection}
                  disabled={isSaving}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
                >
                  {isSaving ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Eliminando...' : 'Eliminar'}</span>
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
