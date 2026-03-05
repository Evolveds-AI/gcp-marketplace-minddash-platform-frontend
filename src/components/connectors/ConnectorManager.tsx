'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Database, Globe, FileText, Webhook, Play, Pause, Settings, Trash2, AlertCircle, TestTube } from 'lucide-react';
import {
  ConnectorType,
  ConnectorStatus,
  DataConnector,
  CreateConnectorDTO,
  UpdateConnectorDTO,
  ConnectorResponse,
  ConnectorFilters,
  ConnectorListResponse,
  DatabaseConfig,
  ApiConfig,
  FileConfig,
  WebhookConfig,
  HttpMethod,
  AuthType,
  WebhookMethod,
  WebhookAuthType
} from '@/types/connectors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ApiConnectorForm from './forms/ApiConnectorForm';
import WebhookConnectorForm from './forms/WebhookConnectorForm';
import ConnectorTester from './ConnectorTester';

interface ConnectorManagerProps {
  userId?: string;
  clientId?: string;
  productId?: string;
}

const ConnectorManager: React.FC<ConnectorManagerProps> = ({
  userId,
  clientId,
  productId
}) => {
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConnector, setEditingConnector] = useState<DataConnector | null>(null);
  const [showTester, setShowTester] = useState<{ connectorId: string; connectorType: ConnectorType } | null>(null);
  const [filter, setFilter] = useState<ConnectorFilters>({});

  // Estados del formulario
  const [formData, setFormData] = useState<Partial<CreateConnectorDTO>>({
    name: '',
    description: '',
    type: ConnectorType.DATABASE,
    config: undefined
  });

  useEffect(() => {
    loadConnectors();
  }, [filter]);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (userId) params.append('userId', userId);
      if (clientId) params.append('clientId', clientId);
      if (productId) params.append('productId', productId);

      const response = await fetch(`/api/connectors?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar conectores');
      }

      const result: ConnectorListResponse = await response.json();
      setConnectors(result.data || []);
    } catch (error) {
      console.error('Error loading connectors:', error);
      toast.error('Error al cargar conectores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnector = async () => {
    try {
      if (!formData.name || !formData.type) {
        toast.error('Nombre y tipo son requeridos');
        return;
      }

      if (!formData.config) {
        toast.error('Configuración del conector es requerida');
        return;
      }

      const createData: CreateConnectorDTO = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        config: formData.config,
        clientId,
        productId
      };

      const response = await fetch('/api/connectors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear conector');
      }

      const result: ConnectorResponse = await response.json();
      if (result.success && result.data) {
        setConnectors(prev => [result.data!, ...prev]);
      }
      setShowCreateForm(false);
      resetForm();
      toast.success('Conector creado exitosamente');
    } catch (error) {
      console.error('Error creating connector:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear conector');
    }
  };

  const handleUpdateConnector = async (id: string, updates: Partial<UpdateConnectorDTO>) => {
    try {
      const response = await fetch(`/api/connectors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar conector');
      }

      const result: ConnectorResponse = await response.json();
      if (result.success && result.data) {
        setConnectors(prev => 
          prev.map(conn => conn.id === id ? result.data! : conn)
        );
      }
      toast.success('Conector actualizado exitosamente');
    } catch (error) {
      console.error('Error updating connector:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar conector');
    }
  };

  const handleDeleteConnector = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este conector?')) {
      return;
    }

    try {
      const response = await fetch(`/api/connectors/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar conector');
      }

      setConnectors(prev => prev.filter(conn => conn.id !== id));
      toast.success('Conector eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting connector:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar conector');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/connectors/${id}/test`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al probar conexión');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Conexión exitosa');
      } else {
        toast.error(`Error en conexión: ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error(error instanceof Error ? error.message : 'Error al probar conexión');
    }
  };

  const handleStartSync = async (id: string) => {
    try {
      const response = await fetch(`/api/connectors/${id}/sync`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al iniciar sincronización');
      }

      toast.success('Sincronización iniciada');
      loadConnectors(); // Recargar para actualizar estado
    } catch (error) {
      console.error('Error starting sync:', error);
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sincronización');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: ConnectorType.DATABASE,
      config: undefined
    });
    setEditingConnector(null);
  };

  const getConnectorIcon = (type: ConnectorType) => {
    switch (type) {
      case ConnectorType.DATABASE:
        return <Database className="h-5 w-5" />;
      case ConnectorType.API:
        return <Globe className="h-5 w-5" />;
      case ConnectorType.FILE:
        return <FileText className="h-5 w-5" />;
      case ConnectorType.WEBHOOK:
        return <Webhook className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: ConnectorStatus) => {
    switch (status) {
      case ConnectorStatus.ACTIVE:
        return 'text-green-600 bg-green-100';
      case ConnectorStatus.INACTIVE:
        return 'text-gray-600 bg-gray-100';
      case ConnectorStatus.ERROR:
        return 'text-red-600 bg-red-100';
      case ConnectorStatus.SYNCING:
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conectores de Datos</h2>
          <p className="text-gray-600">Gestiona las conexiones a fuentes de datos externas</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Conector
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Buscar conectores..."
          value={filter.search || ''}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          className="max-w-xs"
        />
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as ConnectorType || undefined }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Todos los tipos</option>
          <option value={ConnectorType.DATABASE}>Base de Datos</option>
          <option value={ConnectorType.API}>API</option>
          <option value={ConnectorType.FILE}>Archivo</option>
          <option value={ConnectorType.WEBHOOK}>Webhook</option>
        </select>
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as ConnectorStatus || undefined }))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Todos los estados</option>
          <option value={ConnectorStatus.ACTIVE}>Activo</option>
          <option value={ConnectorStatus.INACTIVE}>Inactivo</option>
          <option value={ConnectorStatus.ERROR}>Error</option>
          <option value={ConnectorStatus.SYNCING}>Sincronizando</option>
        </select>
      </div>

      {/* Lista de conectores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector) => (
          <Card key={connector.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getConnectorIcon(connector.type)}
                <div>
                  <h3 className="font-semibold text-gray-900">{connector.name}</h3>
                  <p className="text-sm text-gray-600">{connector.description}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
                {connector.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tipo:</span> {connector.type}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Última sincronización:</span>{' '}
                {connector.lastSyncAt 
                  ? new Date(connector.lastSyncAt).toLocaleString()
                  : 'Nunca'
                }
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection(connector.id)}
                className="flex-1"
              >
                <Play className="h-3 w-3 mr-1" />
                Probar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTester({ connectorId: connector.id, connectorType: connector.type })}
              >
                <TestTube className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartSync(connector.id)}
                disabled={connector.status === ConnectorStatus.SYNCING}
                className="flex-1"
              >
                {connector.status === ConnectorStatus.SYNCING ? (
                  <Pause className="h-3 w-3 mr-1" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Sync
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingConnector(connector)}
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteConnector(connector.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {connectors.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay conectores</h3>
          <p className="text-gray-600 mb-4">Crea tu primer conector para comenzar a sincronizar datos</p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Conector
          </Button>
        </div>
      )}

      {/* Modal de creación/edición */}
      {(showCreateForm || editingConnector) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingConnector ? 'Editar Conector' : 'Nuevo Conector'}
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {!formData.type ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del conector"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción del conector"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <select
                      id="type"
                      value={formData.type || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ConnectorType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value={ConnectorType.DATABASE}>Base de Datos</option>
                      <option value={ConnectorType.API}>API</option>
                      <option value={ConnectorType.FILE}>Archivo</option>
                      <option value={ConnectorType.WEBHOOK}>Webhook</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingConnector(null);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (!formData.name || !formData.type) {
                          toast.error('Por favor completa los campos requeridos');
                          return;
                        }
                      }}
                      disabled={!formData.name || !formData.type}
                      className="flex-1"
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              ) : formData.type === ConnectorType.API ? (
                <div className="space-y-6">
                  <ApiConnectorForm
                    config={formData.config as ApiConfig || {
                      baseUrl: '',
                      headers: {},
                      authentication: { 
                        type: AuthType.NONE,
                        credentials: {}
                      }
                    }}
                    onChange={(config) => setFormData(prev => ({ ...prev, config }))}
                  />
                  
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingConnector(null);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={editingConnector ? 
                        () => handleUpdateConnector(editingConnector.id, formData) :
                        handleCreateConnector
                      }
                      className="flex-1"
                    >
                      {editingConnector ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              ) : formData.type === ConnectorType.WEBHOOK ? (
                <div className="space-y-6">
                  <WebhookConnectorForm
                    config={formData.config as WebhookConfig || {
                      url: '',
                      method: WebhookMethod.POST,
                      headers: {},
                      authentication: { 
                        type: WebhookAuthType.NONE,
                        credentials: {}
                      }
                    }}
                    onChange={(config) => setFormData(prev => ({ ...prev, config }))}
                    connectorId={editingConnector?.id}
                  />
                  
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingConnector(null);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={editingConnector ? 
                        () => handleUpdateConnector(editingConnector.id, formData) :
                        handleCreateConnector
                      }
                      className="flex-1"
                    >
                      {editingConnector ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">Configuración de {formData.type} próximamente</p>
                  </div>
                  
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingConnector(null);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={editingConnector ? 
                        () => handleUpdateConnector(editingConnector.id, formData) :
                        handleCreateConnector
                      }
                      className="flex-1"
                    >
                      {editingConnector ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Tester de conectores */}
      {showTester && (
        <ConnectorTester
          connectorId={showTester.connectorId}
          connectorType={showTester.connectorType}
          onClose={() => setShowTester(null)}
        />
      )}
    </div>
  );
};

export default ConnectorManager;