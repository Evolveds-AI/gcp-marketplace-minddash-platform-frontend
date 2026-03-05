'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiPackage,
  FiX,
  FiSave,
  FiAlertCircle,
  FiToggleLeft,
  FiToggleRight,
  FiCode
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ModalPortal from '@/components/ui/ModalPortal';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  description: string | null;
  tipo: string;
  language: string | null;
  project_id: string;
  is_active: boolean;
  is_active_rag: boolean;
  is_active_alerts: boolean;
  is_active_insight: boolean;
  config: any;
  created_at: string;
  projects?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function ProductsManagementView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tipo: 'chatbot',
    language: 'es',
    project_id: '',
    is_active_rag: false,
    is_active_alerts: false,
    is_active_insight: false,
    config: '{}'
  });

  useEffect(() => {
    loadProducts();
    loadProjects();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/backend/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProducts(Array.isArray(result.data) ? result.data : []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setProducts([]);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/backend/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setProjects(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      tipo: 'chatbot',
      language: 'es',
      project_id: projects[0]?.id || '',
      is_active_rag: false,
      is_active_alerts: false,
      is_active_insight: false,
      config: '{}'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      tipo: product.tipo,
      language: product.language || 'es',
      project_id: product.project_id,
      is_active_rag: product.is_active_rag,
      is_active_alerts: product.is_active_alerts,
      is_active_insight: product.is_active_insight,
      config: JSON.stringify(product.config || {}, null, 2)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    const confirmed = await confirm({
      title: 'Eliminar producto',
      description: '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      setDeletingId(id);

      const response = await fetch(`/api/backend/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Producto eliminado');
        loadProducts();
      } else {
        toast.error('Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar producto');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSaving) return;

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    // Validar JSON
    let configJson;
    try {
      configJson = JSON.parse(formData.config);
    } catch (error) {
      toast.error('El JSON de configuración no es válido');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      setIsSaving(true);
      const url = editingProduct 
        ? `/api/backend/products/${editingProduct.id}`
        : '/api/backend/products/create';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          tipo: formData.tipo,
          language: formData.language,
          project_id: formData.project_id,
          is_active_rag: formData.is_active_rag,
          is_active_alerts: formData.is_active_alerts,
          is_active_insight: formData.is_active_insight,
          config: configJson
        })
      });

      if (response.ok) {
        toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
        setIsModalOpen(false);
        loadProducts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar producto');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar producto');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeIcon = (tipo: string) => {
    return tipo === 'chatbot' ? '💬' : tipo === 'api' ? '🔌' : '🌐';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiPackage className="text-purple-400" />
            Productos
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los productos y chatbots del sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <FiPlus /> Crear Producto
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="cards" count={6} columns={3} />}

      {/* Lista de Productos */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-colors shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="text-2xl">{getTypeIcon(product.tipo)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                      {product.projects && (
                        <p className="text-xs text-gray-500 truncate">
                          {product.projects.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-purple-500 dark:text-purple-400"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500 dark:text-red-400 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deletingId === product.id ? (
                        <>
                          <span className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Eliminando...</span>
                        </>
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.is_active_rag && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                      RAG
                    </span>
                  )}
                  {product.is_active_alerts && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                      Alertas
                    </span>
                  )}
                  {product.is_active_insight && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                      Insights
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{product.tipo}</span>
                  <span>{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron productos' : 'No hay productos creados'}
          </p>
        </div>
      )}

      {/* Modal */}
      <ModalPortal>
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
              onClick={() => setIsModalOpen(false)}
            >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-minddash-card rounded-xl p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto shadow-xl dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button
                  onClick={() => {
                    if (isSaving) return;
                    setIsModalOpen(false);
                  }}
                  disabled={isSaving}
                  className="text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Proyecto *
                    </label>
                    <Select
                      value={formData.project_id || undefined}
                      onValueChange={(next) => setFormData({ ...formData, project_id: next })}
                    >
                      <SelectTrigger className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo *
                    </label>
                    <Select value={formData.tipo} onValueChange={(next) => setFormData({ ...formData, tipo: next })}>
                      <SelectTrigger className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        <SelectItem value="chatbot">Chatbot</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Nombre del producto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descripción del producto"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Idioma
                  </label>
                  <Select value={formData.language} onValueChange={(next) => setFormData({ ...formData, language: next })}>
                    <SelectTrigger className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Features Toggles */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Características</p>
                  
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">RAG (Retrieval Augmented Generation)</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active_rag: !formData.is_active_rag })}
                      className="relative"
                    >
                      {formData.is_active_rag ? (
                        <FiToggleRight className="text-blue-500" size={32} />
                      ) : (
                        <FiToggleLeft className="text-gray-500" size={32} />
                      )}
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Alertas</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active_alerts: !formData.is_active_alerts })}
                      className="relative"
                    >
                      {formData.is_active_alerts ? (
                        <FiToggleRight className="text-yellow-500" size={32} />
                      ) : (
                        <FiToggleLeft className="text-gray-500" size={32} />
                      )}
                    </button>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Insights</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active_insight: !formData.is_active_insight })}
                      className="relative"
                    >
                      {formData.is_active_insight ? (
                        <FiToggleRight className="text-green-500" size={32} />
                      ) : (
                        <FiToggleLeft className="text-gray-500" size={32} />
                      )}
                    </button>
                  </label>
                </div>

                {/* Config JSON */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiCode /> Configuración JSON
                  </label>
                  <textarea
                    value={formData.config}
                    onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-surface border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder='{"key": "value"}'
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Configuración personalizada en formato JSON</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSaving) return;
                      setIsModalOpen(false);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <FiSave /> Guardar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      {ConfirmDialog}
    </div>
  );
}
