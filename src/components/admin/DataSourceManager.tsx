'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Search, TestTube, Edit, Trash2, Database, Globe, FileText, Webhook } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface DataSource {
  id: string;
  name: string;
  description?: string;
  connector_id: string;
  product_id: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_test_at?: string;
  last_test_status?: 'SUCCESS' | 'FAILED';
  last_test_message?: string;
  connector: {
    id: string;
    name: string;
    type: 'DATABASE' | 'API' | 'FILE' | 'WEBHOOK';
    status: string;
  };
  product: {
    id: string;
    nombre: string;
  };
}

interface Connector {
  id: string;
  name: string;
  type: 'DATABASE' | 'API' | 'FILE' | 'WEBHOOK';
  status: string;
}

interface Product {
  id: string;
  nombre: string;
}

const DataSourceManager: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedConnectorType, setSelectedConnectorType] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);
  const [testingDataSource, setTestingDataSource] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    connector_id: '',
    product_id: '',
    config: {
      tables: [] as string[],
      queries: [] as string[],
      schema: '',
      filters: {},
      transformations: []
    }
  });

  useEffect(() => {
    loadDataSources();
    loadConnectors();
    loadProducts();
  }, []);

  const loadDataSources = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProduct) params.append('product_id', selectedProduct);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/data-sources?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDataSources(data.data);
      } else {
        toast.error('Error al cargar fuentes de datos');
      }
    } catch (error) {
      toast.error('Error al cargar fuentes de datos');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectors = async () => {
    try {
      const response = await fetch('/api/connectors?status=ACTIVE');
      const data = await response.json();
      
      if (data.success) {
        setConnectors(data.data);
      }
    } catch (error) {
      console.error('Error al cargar conectores:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleCreateDataSource = async () => {
    try {
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Fuente de datos creada exitosamente');
        setIsCreateDialogOpen(false);
        resetForm();
        loadDataSources();
      } else {
        toast.error(data.error || 'Error al crear fuente de datos');
      }
    } catch (error) {
      toast.error('Error al crear fuente de datos');
    }
  };

  const handleUpdateDataSource = async () => {
    if (!editingDataSource) return;

    try {
      const response = await fetch(`/api/data-sources/${editingDataSource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Fuente de datos actualizada exitosamente');
        setIsEditDialogOpen(false);
        setEditingDataSource(null);
        resetForm();
        loadDataSources();
      } else {
        toast.error(data.error || 'Error al actualizar fuente de datos');
      }
    } catch (error) {
      toast.error('Error al actualizar fuente de datos');
    }
  };

  const handleDeleteDataSource = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar fuente de datos',
      description: '¿Estás seguro de que quieres eliminar esta fuente de datos? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Fuente de datos eliminada exitosamente');
        loadDataSources();
      } else {
        toast.error(data.error || 'Error al eliminar fuente de datos');
      }
    } catch (error) {
      toast.error('Error al eliminar fuente de datos');
    }
  };

  const handleTestDataSource = async (id: string) => {
    setTestingDataSource(id);
    
    try {
      const response = await fetch(`/api/data-sources/${id}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Prueba exitosa: ${data.message}`);
      } else {
        toast.error(`Prueba fallida: ${data.message || 'Error desconocido'}`);
      }
      
      loadDataSources(); // Recargar para actualizar el estado de la prueba
    } catch (error) {
      toast.error('Error al probar fuente de datos');
    } finally {
      setTestingDataSource(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      connector_id: '',
      product_id: '',
      config: {
        tables: [],
        queries: [],
        schema: '',
        filters: {},
        transformations: []
      }
    });
  };

  const openEditDialog = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    setFormData({
      name: dataSource.name,
      description: dataSource.description || '',
      connector_id: dataSource.connector_id,
      product_id: dataSource.product_id,
      config: dataSource.config || {
        tables: [],
        queries: [],
        schema: '',
        filters: {},
        transformations: []
      }
    });
    setIsEditDialogOpen(true);
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'DATABASE': return <Database className="h-4 w-4" />;
      case 'API': return <Globe className="h-4 w-4" />;
      case 'FILE': return <FileText className="h-4 w-4" />;
      case 'WEBHOOK': return <Webhook className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="default" className="bg-green-500">Exitoso</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Fallido</Badge>;
      default:
        return <Badge variant="secondary">Sin probar</Badge>;
    }
  };

  const filteredDataSources = dataSources.filter(ds => {
    const matchesSearch = ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ds.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = !selectedProduct || ds.product_id === selectedProduct;
    const matchesConnectorType = !selectedConnectorType || ds.connector.type === selectedConnectorType;
    
    return matchesSearch && matchesProduct && matchesConnectorType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl ring-1 ring-white/5">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Fuentes de Datos</h2>
            <p className="text-gray-400 mt-1">
              Gestiona las fuentes de datos conectadas a tus productos
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fuente de Datos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Crear Nueva Fuente de Datos</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configura una nueva fuente de datos para conectar con tus productos.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre de la fuente de datos"
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="product" className="text-gray-300">Producto</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="connector" className="text-gray-300">Conector</Label>
                  <Select
                    value={formData.connector_id}
                    onValueChange={(value) => setFormData({ ...formData, connector_id: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Seleccionar conector" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                      {connectors.map((connector) => (
                        <SelectItem key={connector.id} value={connector.id}>
                          <div className="flex items-center gap-2">
                            {getConnectorIcon(connector.type)}
                            {connector.name} ({connector.type})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-gray-300">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional de la fuente de datos"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                  />
                </div>
                
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="bg-white/5 border border-white/10">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Configuración Básica</TabsTrigger>
                    <TabsTrigger value="advanced" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Configuración Avanzada</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="schema" className="text-gray-300">Esquema</Label>
                      <Input
                        id="schema"
                        value={formData.config.schema}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: { ...formData.config, schema: e.target.value }
                        })}
                        placeholder="public"
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tables" className="text-gray-300">Tablas (separadas por comas)</Label>
                      <Input
                        id="tables"
                        value={formData.config.tables.join(', ')}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            tables: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          }
                        })}
                        placeholder="users, products, orders"
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="queries" className="text-gray-300">Consultas personalizadas (una por línea)</Label>
                      <Textarea
                        id="queries"
                        value={formData.config.queries.join('\n')}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            queries: e.target.value.split('\n').filter(Boolean)
                          }
                        })}
                        placeholder="SELECT * FROM users WHERE active = true"
                        rows={4}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
                  Cancelar
                </Button>
                <Button onClick={handleCreateDataSource} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Crear Fuente de Datos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar fuentes de datos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
          />
        </div>
        
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-48 bg-black/20 border-white/10 text-white">
            <SelectValue placeholder="Filtrar por producto" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
            <SelectItem value="">Todos los productos</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedConnectorType} onValueChange={setSelectedConnectorType}>
          <SelectTrigger className="w-48 bg-black/20 border-white/10 text-white">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
            <SelectItem value="">Todos los tipos</SelectItem>
            <SelectItem value="DATABASE">Base de Datos</SelectItem>
            <SelectItem value="API">API</SelectItem>
            <SelectItem value="FILE">Archivo</SelectItem>
            <SelectItem value="WEBHOOK">Webhook</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={loadDataSources} className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white">
          Actualizar
        </Button>
      </div>

      {/* Lista de fuentes de datos */}
      <div className="grid gap-4">
        {filteredDataSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <Database className="h-12 w-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No se encontraron fuentes de datos</p>
            <p className="text-gray-600 text-sm">Prueba ajustando los filtros o crea una nueva.</p>
          </div>
        ) : (
          filteredDataSources.map((dataSource) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={dataSource.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all hover:shadow-xl hover:shadow-blue-900/5 group backdrop-blur-sm"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                      {getConnectorIcon(dataSource.connector.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white leading-none mb-1">{dataSource.name}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">
                        {dataSource.description || 'Sin descripción'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(dataSource.last_test_status)}
                    <Badge variant="outline" className={dataSource.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}>
                      {dataSource.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-black/20 p-4 rounded-lg border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Producto</span>
                    <span className="text-sm text-gray-300 font-medium">{dataSource.product.nombre}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Conector</span>
                    <span className="text-sm text-gray-300 font-medium">
                      {dataSource.connector.name} ({dataSource.connector.type})
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Última prueba</span>
                    <span className="text-sm text-gray-300">
                      {dataSource.last_test_at 
                        ? new Date(dataSource.last_test_at).toLocaleDateString()
                        : 'Nunca'
                      }
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Actualizado</span>
                    <span className="text-sm text-gray-300">
                      {new Date(dataSource.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {dataSource.last_test_message && (
                  <div className={`mb-4 text-xs p-3 rounded-lg border ${
                    dataSource.last_test_status === 'SUCCESS' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-300' 
                      : 'bg-red-500/10 border-red-500/20 text-red-300'
                  }`}>
                    <strong>Resultado:</strong> {dataSource.last_test_message}
                  </div>
                )}
                
                <div className="flex gap-2 pt-4 border-t border-white/5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTestDataSource(dataSource.id)}
                    disabled={testingDataSource === dataSource.id}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-white/10 h-9"
                  >
                    {testingDataSource === dataSource.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Probar Conexión
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(dataSource)}
                    className="h-9 w-9 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDataSource(dataSource.id)}
                    className="h-9 w-9 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Fuente de Datos</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modifica la configuración de la fuente de datos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name" className="text-gray-300">Nombre</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre de la fuente de datos"
                  className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="edit-product" className="text-gray-300">Producto</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description" className="text-gray-300">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional de la fuente de datos"
                className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
              />
            </div>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Configuración Básica</TabsTrigger>
                <TabsTrigger value="advanced" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Configuración Avanzada</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="edit-schema" className="text-gray-300">Esquema</Label>
                  <Input
                    id="edit-schema"
                    value={formData.config.schema}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, schema: e.target.value }
                    })}
                    placeholder="public"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-tables" className="text-gray-300">Tablas (separadas por comas)</Label>
                  <Input
                    id="edit-tables"
                    value={formData.config.tables.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        tables: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      }
                    })}
                    placeholder="users, products, orders"
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="edit-queries" className="text-gray-300">Consultas personalizadas (una por línea)</Label>
                  <Textarea
                    id="edit-queries"
                    value={formData.config.queries.join('\n')}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        queries: e.target.value.split('\n').filter(Boolean)
                      }
                    })}
                    placeholder="SELECT * FROM users WHERE active = true"
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-blue-500"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleUpdateDataSource} className="bg-blue-600 hover:bg-blue-700 text-white">
              Actualizar Fuente de Datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
};

export default DataSourceManager;