'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Server,
  Database,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  HardDrive,
  Cpu,
  Wifi,
  Zap,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  Monitor,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Edit2,
  Plus,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SystemConfig {
  id: string;
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: 'general' | 'security' | 'performance' | 'limits' | 'features';
  isSecret: boolean;
  updatedBy: string;
  updatedAt: string;
}

interface SystemResource {
  name: string;
  current: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  details: string;
  ip: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface BackupEntry {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  createdBy: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'completed' | 'running' | 'failed';
}

export default function SuperAdminSystemControl() {
  const { applyThemeClass } = useThemeMode();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Estados para configuración
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [showEditConfigDialog, setShowEditConfigDialog] = useState(false);
  const [configSearch, setConfigSearch] = useState('');
  const [configCategory, setConfigCategory] = useState<string>('all');
  
  // Estados para recursos
  const [resources, setResources] = useState<SystemResource[]>([]);
  const [refreshingResources, setRefreshingResources] = useState(false);
  
  // Estados para auditoría
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSeverity, setLogSeverity] = useState<string>('all');
  
  // Estados para backups
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [showCreateBackupDialog, setShowCreateBackupDialog] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // Mock configs
      const mockConfigs: SystemConfig[] = [
        {
          id: 'cfg-1',
          key: 'MAX_ORGANIZATIONS_PER_ADMIN',
          value: 10,
          type: 'number',
          description: 'Número máximo de organizaciones que un admin puede gestionar',
          category: 'limits',
          isSecret: false,
          updatedBy: 'admin',
          updatedAt: '2025-01-20',
        },
        {
          id: 'cfg-2',
          key: 'ENABLE_REGISTRATION',
          value: true,
          type: 'boolean',
          description: 'Permitir auto-registro de nuevos usuarios',
          category: 'features',
          isSecret: false,
          updatedBy: 'admin',
          updatedAt: '2025-01-19',
        },
        {
          id: 'cfg-3',
          key: 'JWT_SECRET',
          value: '••••••••••••••••',
          type: 'string',
          description: 'Secreto para firmar tokens JWT',
          category: 'security',
          isSecret: true,
          updatedBy: 'system',
          updatedAt: '2025-01-01',
        },
        {
          id: 'cfg-4',
          key: 'API_RATE_LIMIT',
          value: 1000,
          type: 'number',
          description: 'Límite de requests por hora por IP',
          category: 'performance',
          isSecret: false,
          updatedBy: 'admin',
          updatedAt: '2025-01-18',
        },
      ];

      // Mock resources
      const mockResources: SystemResource[] = [
        { name: 'CPU', current: 45, max: 100, unit: '%', status: 'healthy', trend: 'stable' },
        { name: 'Memoria RAM', current: 6.2, max: 16, unit: 'GB', status: 'healthy', trend: 'up' },
        { name: 'Almacenamiento', current: 120, max: 500, unit: 'GB', status: 'warning', trend: 'up' },
        { name: 'Conexiones DB', current: 85, max: 100, unit: '', status: 'warning', trend: 'up' },
        { name: 'API Requests/min', current: 450, max: 1000, unit: '', status: 'healthy', trend: 'stable' },
        { name: 'Queue Size', current: 12, max: 50, unit: '', status: 'healthy', trend: 'down' },
      ];

      // Mock audit logs
      const mockAuditLogs: AuditLog[] = [
        {
          id: 'log-1',
          timestamp: '2025-01-22T10:30:00',
          userId: 'user-1',
          username: 'admin',
          action: 'LOGIN',
          resource: 'system',
          details: 'Super admin login from 192.168.1.100',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          severity: 'low',
        },
        {
          id: 'log-2',
          timestamp: '2025-01-22T09:15:00',
          userId: 'user-2',
          username: 'carlos.ruiz',
          action: 'CREATE',
          resource: 'organization',
          details: 'Created organization "New Company"',
          ip: '192.168.1.101',
          userAgent: 'Mozilla/5.0...',
          severity: 'medium',
        },
        {
          id: 'log-3',
          timestamp: '2025-01-22T08:45:00',
          userId: 'user-3',
          username: 'ana.garcia',
          action: 'DELETE',
          resource: 'user',
          details: 'Deleted user "john.doe"',
          ip: '192.168.1.102',
          userAgent: 'Mozilla/5.0...',
          severity: 'high',
        },
      ];

      // Mock backups
      const mockBackups: BackupEntry[] = [
        {
          id: 'bak-1',
          name: 'system_backup_20250122_full',
          size: '2.3 GB',
          createdAt: '2025-01-22T02:00:00',
          createdBy: 'system',
          type: 'full',
          status: 'completed',
        },
        {
          id: 'bak-2',
          name: 'system_backup_20250121_incremental',
          size: '156 MB',
          createdAt: '2025-01-21T02:00:00',
          createdBy: 'system',
          type: 'incremental',
          status: 'completed',
        },
      ];

      setConfigs(mockConfigs);
      setResources(mockResources);
      setAuditLogs(mockAuditLogs);
      setBackups(mockBackups);
    } catch (error) {
      console.error('Error loading system data:', error);
      toast.error('Error al cargar datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  // Refrescar recursos
  const refreshResources = async () => {
    setRefreshingResources(true);
    try {
      // Simular actualización
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResources(resources.map(r => ({
        ...r,
        current: Math.max(0, r.current + (Math.random() - 0.5) * 10),
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      })));
      toast.success('Recursos actualizados');
    } catch (error) {
      toast.error('Error al actualizar recursos');
    } finally {
      setRefreshingResources(false);
    }
  };

  // Actualizar configuración
  const updateConfig = async (configId: string, newValue: any) => {
    try {
      // Mock API call
      setConfigs(configs.map(c => 
        c.id === configId 
          ? { ...c, value: newValue, updatedAt: new Date().toISOString().split('T')[0], updatedBy: 'current_user' }
          : c
      ));
      toast.success('Configuración actualizada');
      setShowEditConfigDialog(false);
      setEditingConfig(null);
    } catch (error) {
      toast.error('Error al actualizar configuración');
    }
  };

  // Crear backup
  const createBackup = async (type: 'full' | 'incremental' | 'differential') => {
    setCreatingBackup(true);
    try {
      // Mock API call
      const newBackup: BackupEntry = {
        id: `bak-${Date.now()}`,
        name: `system_backup_${new Date().toISOString().split('T')[0]}_${type}`,
        size: 'Calculando...',
        createdAt: new Date().toISOString(),
        createdBy: 'current_user',
        type,
        status: 'running',
      };
      setBackups([newBackup, ...backups]);
      setShowCreateBackupDialog(false);
      toast.success('Backup iniciado');
    } catch (error) {
      toast.error('Error al crear backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Filtrar configuraciones
  const filteredConfigs = useMemo(() => {
    return configs.filter(config => {
      const matchesSearch = config.key.toLowerCase().includes(configSearch.toLowerCase()) ||
                           config.description.toLowerCase().includes(configSearch.toLowerCase());
      const matchesCategory = configCategory === 'all' || config.category === configCategory;
      return matchesSearch && matchesCategory;
    });
  }, [configs, configSearch, configCategory]);

  // Renderizar tarjeta de recurso
  const renderResourceCard = (resource: SystemResource) => {
    const statusColors = {
      healthy: 'text-green-400',
      warning: 'text-yellow-400',
      critical: 'text-red-400',
    };

    const trendIcons = {
      up: <TrendingUp className="w-4 h-4" />, 
      down: <TrendingDown className="w-4 h-4" />, 
      stable: <Activity className="w-4 h-4" />,
    };

    const percentage = (resource.current / resource.max) * 100;

    return (
      <div key={resource.name} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/5 ring-1 ring-white/5">
        <div className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {resource.name}
            </h3>
            <div className={cn('flex items-center gap-2', statusColors[resource.status])}>
              {trendIcons[resource.trend]}
              <span className="text-sm font-medium">
                {resource.current}{resource.unit}
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Uso: {percentage.toFixed(1)}%
              </span>
              <span className="text-gray-400">
                Max: {resource.max}{resource.unit}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className={cn(
                'h-2 bg-white/10',
                percentage > 80 ? 'bg-red-500' : 
                percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              )}
            />
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn(
                "border-0",
                resource.status === 'healthy' ? 'text-green-400 bg-green-500/10' :
                resource.status === 'warning' ? 'text-yellow-400 bg-yellow-500/10' :
                'text-red-400 bg-red-500/10'
              )}>
                {resource.status === 'healthy' && 'Saludable'}
                {resource.status === 'warning' && 'Advertencia'}
                {resource.status === 'critical' && 'Crítico'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar configuración
  const renderConfigItem = (config: SystemConfig) => (
    <motion.div
      key={config.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-white/10 bg-white/5 transition-all duration-300 hover:bg-white/10"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white">
              {config.key}
            </h3>
            {config.isSecret && <Lock className="w-4 h-4 text-gray-400" />}
            <Badge variant="secondary" className="text-xs bg-white/10 text-gray-300 border-0">
              {config.category}
            </Badge>
          </div>
          <p className="text-sm mb-3 text-gray-400">
            {config.description}
          </p>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-md font-mono text-sm bg-black/30 text-gray-300 border border-white/5">
              {config.isSecret ? '••••••••••••••••' : String(config.value)}
            </div>
            <div className="text-xs text-gray-500">
              Actualizado: {config.updatedAt} por {config.updatedBy}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditingConfig(config);
            setShowEditConfigDialog(true);
          }}
          className="text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Panel de Control del Sistema
          </h1>
          <p className="mt-2 text-gray-400">
            Configuración global, monitoreo y administración del sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={refreshResources}
            disabled={refreshingResources}
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshingResources && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
            <Monitor className="w-4 h-4" />
            Vista General
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
            <Server className="w-4 h-4" />
            Recursos
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
            <Shield className="w-4 h-4" />
            Auditoría
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">
            <HardDrive className="w-4 h-4" />
            Backups
          </TabsTrigger>
        </TabsList>

        {/* Vista General */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.slice(0, 6).map(renderResourceCard)}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Actividad Reciente</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <Badge variant={log.severity === 'high' ? 'destructive' : 'secondary'} className="bg-white/10 text-gray-300 border-0">
                        {log.action}
                      </Badge>
                      <span className="flex-1 text-gray-300">
                        <span className="text-white font-medium">{log.username}</span> - {log.resource}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Backups Recientes</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {backups.slice(0, 5).map((backup) => (
                    <div key={backup.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'} className={backup.status === 'completed' ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-white/10 text-gray-300"}>
                        {backup.type}
                      </Badge>
                      <span className="flex-1 text-gray-300">
                        {backup.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {backup.size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Configuración */}
        <TabsContent value="config" className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Configuración del Sistema</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Gestiona las variables globales del sistema
                  </p>
                </div>
                <Button onClick={() => setShowCreateBackupDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Config
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Buscar configuración..."
                      value={configSearch}
                      onChange={(e) => setConfigSearch(e.target.value)}
                      className="pl-10 bg-black/20 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={configCategory}
                  onChange={(e) => setConfigCategory(e.target.value)}
                  className="px-4 py-2 rounded-md border border-white/10 bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="general">General</option>
                  <option value="security">Seguridad</option>
                  <option value="performance">Rendimiento</option>
                  <option value="limits">Límites</option>
                  <option value="features">Funcionalidades</option>
                </select>
              </div>
              
              <div className="space-y-4">
                {filteredConfigs.map(renderConfigItem)}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Recursos */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map(renderResourceCard)}
          </div>
        </TabsContent>

        {/* Auditoría */}
        <TabsContent value="audit" className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Logs de Auditoría</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Registro de todas las actividades del sistema
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={logSeverity}
                    onChange={(e) => setLogSeverity(e.target.value)}
                    className="px-4 py-2 rounded-md border border-white/10 bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las severidades</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                  <Button variant="outline" className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Timestamp</TableHead>
                    <TableHead className="text-gray-400">Usuario</TableHead>
                    <TableHead className="text-gray-400">Acción</TableHead>
                    <TableHead className="text-gray-400">Recurso</TableHead>
                    <TableHead className="text-gray-400">Detalles</TableHead>
                    <TableHead className="text-gray-400">IP</TableHead>
                    <TableHead className="text-gray-400">Severidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-sm text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {log.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.userId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/20 text-gray-300">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{log.resource}</TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {log.ip}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          log.severity === 'critical' ? 'destructive' :
                          log.severity === 'high' ? 'destructive' :
                          log.severity === 'medium' ? 'secondary' : 'outline'
                        } className={cn(
                          log.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          log.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          log.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        )}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Backups */}
        <TabsContent value="backups" className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-xl ring-1 ring-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Gestión de Backups</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Copias de seguridad del sistema
                  </p>
                </div>
                <Button onClick={() => setShowCreateBackupDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Backup
                </Button>
              </div>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Nombre</TableHead>
                    <TableHead className="text-gray-400">Tipo</TableHead>
                    <TableHead className="text-gray-400">Tamaño</TableHead>
                    <TableHead className="text-gray-400">Fecha</TableHead>
                    <TableHead className="text-gray-400">Creado por</TableHead>
                    <TableHead className="text-gray-400">Estado</TableHead>
                    <TableHead className="text-gray-400">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        {backup.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/20 text-gray-300">{backup.type}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{backup.size}</TableCell>
                      <TableCell className="text-sm text-gray-400">
                        {new Date(backup.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-gray-400">{backup.createdBy}</TableCell>
                      <TableCell>
                        <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'} className={
                          backup.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          backup.status === 'running' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }>
                          {backup.status === 'completed' && 'Completado'}
                          {backup.status === 'running' && 'En progreso'}
                          {backup.status === 'failed' && 'Fallido'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#121212] border-white/10 text-white">
                            <DropdownMenuItem className="focus:bg-white/10 focus:text-white">
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-white/10 focus:text-white">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Restaurar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Editar Configuración */}
      <Dialog open={showEditConfigDialog} onOpenChange={setShowEditConfigDialog}>
        <DialogContent className="bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Configuración</DialogTitle>
            <DialogDescription className="text-gray-400">
              Actualiza el valor de la configuración del sistema
            </DialogDescription>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Clave</Label>
                <Input value={editingConfig.key} disabled className="bg-white/5 border-white/10 text-gray-400" />
              </div>
              <div>
                <Label className="text-gray-300">Descripción</Label>
                <p className="text-sm text-gray-400 mt-1">
                  {editingConfig.description}
                </p>
              </div>
              <div>
                <Label className="text-gray-300">Valor</Label>
                {editingConfig.type === 'boolean' ? (
                  <div className="mt-2">
                    <Switch
                      checked={Boolean(editingConfig.value)}
                      onCheckedChange={(checked) => updateConfig(editingConfig.id, checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                ) : editingConfig.type === 'number' ? (
                  <Input
                    type="number"
                    value={Number(editingConfig.value)}
                    onChange={(e) => updateConfig(editingConfig.id, Number(e.target.value))}
                    className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500 mt-1"
                  />
                ) : (
                  <Input
                    type={editingConfig.isSecret ? 'password' : 'text'}
                    value={String(editingConfig.value)}
                    onChange={(e) => updateConfig(editingConfig.id, e.target.value)}
                    className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500 mt-1"
                  />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Crear Backup */}
      <Dialog open={showCreateBackupDialog} onOpenChange={setShowCreateBackupDialog}>
        <DialogContent className="bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Crear Backup</DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecciona el tipo de backup que deseas crear
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => createBackup('full')}
                disabled={creatingBackup}
              >
                <HardDrive className="w-4 h-4 mr-2 text-blue-400" />
                Backup Completo
                <span className="ml-auto text-sm text-gray-400">
                  Incluye todos los datos
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => createBackup('incremental')}
                disabled={creatingBackup}
              >
                <HardDrive className="w-4 h-4 mr-2 text-green-400" />
                Backup Incremental
                <span className="ml-auto text-sm text-gray-400">
                  Solo cambios desde último backup
                </span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => createBackup('differential')}
                disabled={creatingBackup}
              >
                <HardDrive className="w-4 h-4 mr-2 text-purple-400" />
                Backup Diferencial
                <span className="ml-auto text-sm text-gray-400">
                  Cambios desde último backup completo
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
