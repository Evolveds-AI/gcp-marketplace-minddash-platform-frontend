'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Search, Download, Upload, Play, Edit, Trash2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import yaml from 'js-yaml';

interface Product {
  id: string;
  nombre: string;
  yaml_config?: any;
  yaml_version?: number;
}

interface YamlConfiguration {
  id: string;
  product_id: string;
  version: number;
  config_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

const YamlConfigManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [configurations, setConfigurations] = useState<YamlConfiguration[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<YamlConfiguration | null>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [activatingConfig, setActivatingConfig] = useState<string | null>(null);

  // Template YAML por defecto
  const defaultYamlTemplate = `# Configuración del Chatbot
name: "Mi Chatbot"
description: "Descripción del chatbot"
version: "1.0.0"

# Configuración del modelo
model:
  provider: "openai"
  model_name: "gpt-3.5-turbo"
  temperature: 0.7
  max_tokens: 1000

# Configuración de prompts
prompts:
  system: |
    Eres un asistente útil y amigable.
    Responde de manera clara y concisa.
  welcome: "¡Hola! ¿En qué puedo ayudarte hoy?"
  fallback: "Lo siento, no entendí tu pregunta. ¿Podrías reformularla?"

# Fuentes de datos
data_sources:
  - name: "knowledge_base"
    type: "database"
    connector_id: ""
    config:
      tables: ["articles", "faqs"]
      schema: "public"

# Flujos de conversación
flows:
  - name: "greeting_flow"
    trigger:
      type: "intent"
      value: "greeting"
    actions:
      - type: "message"
        content: "{{ prompts.welcome }}"

# Configuración de roles
roles:
  - name: "user"
    permissions: ["chat", "view_history"]
  - name: "admin"
    permissions: ["chat", "view_history", "manage_config"]

# Configuración de seguridad
security:
  rate_limit:
    requests_per_minute: 60
    requests_per_hour: 1000
  content_filter:
    enabled: true
    strict_mode: false

# Configuración de integración
integrations:
  whatsapp:
    enabled: false
    webhook_url: ""
  telegram:
    enabled: false
    bot_token: ""
  web:
    enabled: true
    theme: "default"`;

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadConfigurations();
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        toast.error('Error al cargar productos');
      }
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigurations = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}/yaml`);
      const data = await response.json();
      
      if (data.success) {
        setConfigurations(data.data.configurations || []);
      } else {
        toast.error('Error al cargar configuraciones');
      }
    } catch (error) {
      toast.error('Error al cargar configuraciones');
    }
  };

  const validateYaml = (content: string): boolean => {
    try {
      yaml.load(content);
      setYamlError(null);
      return true;
    } catch (error) {
      setYamlError(error instanceof Error ? error.message : 'Error de validación YAML');
      return false;
    }
  };

  const handleYamlChange = (content: string) => {
    setYamlContent(content);
    validateYaml(content);
  };

  const handleCreateConfiguration = async () => {
    if (!selectedProduct || !yamlContent.trim()) {
      toast.error('Selecciona un producto y proporciona contenido YAML');
      return;
    }

    if (!validateYaml(yamlContent)) {
      toast.error('El contenido YAML no es válido');
      return;
    }

    try {
      const response = await fetch(`/api/products/${selectedProduct}/yaml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_data: yaml.load(yamlContent),
          activate: true // Activar automáticamente la nueva configuración
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Configuración YAML creada y activada exitosamente');
        setIsCreateDialogOpen(false);
        setYamlContent('');
        loadConfigurations();
        loadProducts(); // Recargar para actualizar la versión activa
      } else {
        toast.error(data.error || 'Error al crear configuración');
      }
    } catch (error) {
      toast.error('Error al crear configuración');
    }
  };

  const handleUpdateConfiguration = async () => {
    if (!editingConfig || !yamlContent.trim()) {
      toast.error('Proporciona contenido YAML válido');
      return;
    }

    if (!validateYaml(yamlContent)) {
      toast.error('El contenido YAML no es válido');
      return;
    }

    try {
      // Crear nueva versión basada en la editada
      const response = await fetch(`/api/products/${selectedProduct}/yaml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_data: yaml.load(yamlContent),
          activate: false // No activar automáticamente
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Nueva versión de configuración creada exitosamente');
        setIsEditDialogOpen(false);
        setEditingConfig(null);
        setYamlContent('');
        loadConfigurations();
      } else {
        toast.error(data.error || 'Error al actualizar configuración');
      }
    } catch (error) {
      toast.error('Error al actualizar configuración');
    }
  };

  const handleActivateConfiguration = async (configId: string) => {
    setActivatingConfig(configId);
    
    try {
      const response = await fetch(`/api/products/${selectedProduct}/yaml`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configuration_id: configId
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Configuración activada exitosamente');
        loadConfigurations();
        loadProducts(); // Recargar para actualizar la versión activa
      } else {
        toast.error(data.error || 'Error al activar configuración');
      }
    } catch (error) {
      toast.error('Error al activar configuración');
    } finally {
      setActivatingConfig(null);
    }
  };

  const handleDownloadYaml = (config: YamlConfiguration) => {
    const yamlString = yaml.dump(config.config_data, { indent: 2 });
    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-v${config.version}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openCreateDialog = () => {
    setYamlContent(defaultYamlTemplate);
    setYamlError(null);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (config: YamlConfiguration) => {
    setEditingConfig(config);
    setYamlContent(yaml.dump(config.config_data, { indent: 2 }));
    setYamlError(null);
    setIsEditDialogOpen(true);
  };

  const filteredConfigurations = configurations.filter(config => {
    const searchLower = searchTerm.toLowerCase();
    return config.version.toString().includes(searchLower) ||
           config.created_by.toLowerCase().includes(searchLower);
  });

  const selectedProductData = products.find(p => p.id === selectedProduct);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl ring-1 ring-white/5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Configuraciones YAML</h2>
          <p className="text-gray-400 mt-1">
            Gestiona las configuraciones YAML de tus productos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={!selectedProduct} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 transition-all hover:scale-105 disabled:opacity-50">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Crear Nueva Configuración YAML</DialogTitle>
              <DialogDescription className="text-gray-400">
                Define la configuración de tu chatbot usando formato YAML.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="yaml-content" className="text-gray-300">Configuración YAML</Label>
                <Textarea
                  id="yaml-content"
                  value={yamlContent}
                  onChange={(e) => handleYamlChange(e.target.value)}
                  placeholder="Ingresa tu configuración YAML aquí..."
                  className="font-mono text-sm min-h-[400px] bg-black/40 border-white/10 text-gray-300 focus-visible:ring-purple-500"
                />
                {yamlError && (
                  <Alert className="mt-2 bg-red-500/10 border-red-500/20 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Error de sintaxis YAML:</strong> {yamlError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
                Cancelar
              </Button>
              <Button onClick={handleCreateConfiguration} disabled={!!yamlError || !yamlContent.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                Crear y Activar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de producto */}
      <div className="flex gap-4 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg ring-1 ring-white/5">
        <div className="flex-1 max-w-sm">
          <Label htmlFor="product-select" className="text-xs text-gray-400 mb-1.5 block">Producto</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="bg-black/20 border-white/10 text-white">
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.nombre}
                  {product.yaml_version && (
                    <span className="ml-2 text-gray-500">
                      (v{product.yaml_version})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedProduct && (
          <div className="relative flex-1 max-w-sm mt-auto">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar configuraciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-black/20 border-white/10 text-white placeholder-gray-500 focus-visible:ring-purple-500 h-10"
            />
          </div>
        )}
        
        <Button variant="outline" onClick={loadConfigurations} disabled={!selectedProduct} className="mt-auto h-10 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white">
          Actualizar
        </Button>
      </div>

      {/* Información del producto seleccionado */}
      {selectedProductData && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              {selectedProductData.nombre}
            </h3>
            <p className="text-sm text-gray-400">
              Configuración activa: {selectedProductData.yaml_version ? <span className="text-purple-400 font-medium">Versión {selectedProductData.yaml_version}</span> : 'Sin configuración'}
            </p>
          </div>
        </div>
      )}

      {/* Lista de configuraciones */}
      {selectedProduct && (
        <div className="grid gap-4">
          {filteredConfigurations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
              <FileText className="h-12 w-12 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No se encontraron configuraciones</p>
            </div>
          ) : (
            filteredConfigurations.map((config) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={config.id}
                className={`bg-white/5 border rounded-xl overflow-hidden transition-all backdrop-blur-sm ${
                  config.is_active 
                    ? 'border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'border-white/10 hover:border-white/20 hover:shadow-xl'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                        Versión {config.version}
                        {config.is_active && (
                          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Creada por <span className="text-gray-300">{config.created_by}</span> el {new Date(config.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadYaml(config)}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(config)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      {!config.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivateConfiguration(config.id)}
                          disabled={activatingConfig === config.id}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        >
                          {activatingConfig === config.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Activar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Estado</p>
                      <p className="text-gray-300 font-medium">
                        {config.is_active ? 'Configuración activa' : 'Configuración inactiva'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Última actualización</p>
                      <p className="text-gray-300 font-medium">
                        {new Date(config.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Preview de la configuración */}
                  <div className="mt-4">
                    <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Vista previa de la configuración</Label>
                    <div className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto">
                      <pre>
                        {yaml.dump(config.config_data, { indent: 2 }).substring(0, 500)}
                        {yaml.dump(config.config_data, { indent: 2 }).length > 500 && <span className="text-gray-500">... (contenido truncado)</span>}
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#121212]/95 border border-white/10 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Configuración YAML</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modifica la configuración y crea una nueva versión.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-yaml-content" className="text-gray-300">Configuración YAML</Label>
              <Textarea
                id="edit-yaml-content"
                value={yamlContent}
                onChange={(e) => handleYamlChange(e.target.value)}
                placeholder="Ingresa tu configuración YAML aquí..."
                className="font-mono text-sm min-h-[400px] bg-black/40 border-white/10 text-gray-300 focus-visible:ring-purple-500"
              />
              {yamlError && (
                <Alert className="mt-2 bg-red-500/10 border-red-500/20 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error de sintaxis YAML:</strong> {yamlError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleUpdateConfiguration} disabled={!!yamlError || !yamlContent.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
              Crear Nueva Versión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YamlConfigManager;