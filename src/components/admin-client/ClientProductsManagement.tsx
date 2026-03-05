'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, 
  FiEdit3, 
  FiTrash2, 
  FiSearch, 
  FiPackage,
  FiActivity,
  FiPlay,
  FiPause,
  FiSettings,
  FiUsers,
  FiMessageSquare,
  FiExternalLink
} from '@/lib/icons';
import KnowledgeFileManager from './KnowledgeFileManager';
import ModalPortal from '@/components/ui/ModalPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/utils';

// Componente de icono de WhatsApp oficial
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.9.81 2.033c.102.134 1.382 2.109 3.35 2.955.467.202.831.322 1.114.41.469.15.895.129 1.232.078.376-.056 1.17-.478 1.335-.94.165-.463.165-.859.115-.94-.05-.085-.182-.133-.38-.232"/>
  </svg>
);

interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'chatbot' | 'api' | 'web';
  is_active: boolean;
  created_at: string;
  usuarios_asignados: number;
  mensajes_mes: number;
  config?: {
    welcomeMessage?: string;
    maxUsers?: number;
    features?: string[];
    about?: string;
    suggestedPrompts?: string[];
    exampleQuestions?: string[];
    customPrompt?: string;
    systemContext?: string;
  };
}

interface ClientProductsManagementProps {
  clientId: string;
  token: string;
}

export default function ClientProductsManagement({ clientId, token }: ClientProductsManagementProps) {
  const { applyThemeClass } = useThemeMode();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'chatbot' | 'api' | 'web'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBayerAdmin, setIsBayerAdmin] = useState(false);

  // Estados para formulario de creación/edición
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'chatbot' as 'chatbot' | 'api' | 'web',
    welcomeMessage: '',
    maxUsers: 100,
    about: '',
    suggestedPrompts: [] as string[],
    exampleQuestions: [] as string[],
    customPrompt: '',
    systemContext: ''
  });

  useEffect(() => {
    checkIfBayerAdmin();
  }, [clientId]);

  useEffect(() => {
    loadProducts();
  }, [clientId, isBayerAdmin]);

  const checkIfBayerAdmin = () => {
    const authData = localStorage.getItem('evolve-auth');
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        // Verificar si es el usuario admin específico de Bayer
        const isBayer = auth.userId === 'fdbc7a27d1d4b7747192';
        console.log(' Verificando si es admin de Bayer:', isBayer);
        setIsBayerAdmin(isBayer);
        console.log(' Estado isBayerAdmin actualizado:', isBayer);
      } catch (error) {
        console.error('Error verificando usuario Bayer:', error);
      }
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin-client/products?clientId=${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.log('Token expirado, dejar al interceptor manejar refresh/modal');
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      
      const data = await response.json();
      const productsData = data.data.products || [];
      console.log(' DEBUG - Original products from API:', productsData);
      console.log(' DEBUG - isBayerAdmin value in loadProducts:', isBayerAdmin);
      
      // Para el cliente Bayer, solo mostrar productos existentes sin agregar EVA
      if (isBayerAdmin) {
        console.log(' DEBUG - Bayer admin verified, showing only existing Chatbot Bayer');
      }
      
      console.log(' DEBUG - Final products array:', productsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error cargando productos:', error);
      // Solo mostrar datos mock si no es un error de autenticación
      const mockProducts: Product[] = [
        {
          id: '1',
          nombre: 'Chatbot Ventas',
          descripcion: 'Asistente virtual para el departamento de ventas',
          tipo: 'chatbot',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
          usuarios_asignados: 12,
          mensajes_mes: 1547,
          config: {
            welcomeMessage: '¡Hola! Soy tu asistente de ventas.',
            maxUsers: 50,
            features: ['chat', 'reports', 'analytics']
          }
        }
      ];
      setProducts(mockProducts);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || product.tipo === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateProduct = async () => {
    try {
      const response = await fetch('/api/admin-client/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          tipo: formData.tipo,
          config: {
            welcomeMessage: formData.welcomeMessage,
            maxUsers: formData.maxUsers,
            about: formData.about,
            suggestedPrompts: formData.suggestedPrompts,
            exampleQuestions: formData.exampleQuestions,
            customPrompt: formData.customPrompt,
            systemContext: formData.systemContext,
            features: []
          }
        })
      });
      
      if (response.status === 401) {
        console.log('Token expirado, redirigiendo al login...');
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        window.location.href = '/login?expired=true';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al crear producto');
      }
      
      const data = await response.json();
      setProducts([data.data.product, ...products]);
      setShowCreateModal(false);
      setFormData({ nombre: '', descripcion: '', tipo: 'chatbot', welcomeMessage: '', maxUsers: 100, about: '', suggestedPrompts: [], exampleQuestions: [], customPrompt: '', systemContext: '' });
    } catch (error) {
      console.error('Error creando producto:', error);
      alert('Error al crear el producto');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion,
      tipo: product.tipo,
      welcomeMessage: product.config?.welcomeMessage || '',
      maxUsers: product.config?.maxUsers || 100,
      about: product.config?.about || '',
      suggestedPrompts: product.config?.suggestedPrompts || [],
      exampleQuestions: product.config?.exampleQuestions || [],
      customPrompt: product.config?.customPrompt || '',
      systemContext: product.config?.systemContext || ''
    });
    setShowCreateModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const response = await fetch(`/api/admin-client/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          tipo: formData.tipo,
          config: {
            welcomeMessage: formData.welcomeMessage,
            maxUsers: formData.maxUsers,
            about: formData.about,
            suggestedPrompts: formData.suggestedPrompts,
            exampleQuestions: formData.exampleQuestions,
            customPrompt: formData.customPrompt,
            systemContext: formData.systemContext,
            features: editingProduct.config?.features || []
          }
        })
      });
      
      if (response.status === 401) {
        console.log('Token expirado, redirigiendo al login...');
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        window.location.href = '/login?expired=true';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al actualizar producto');
      }
      
      const data = await response.json();
      setProducts(products.map(product => 
        product.id === editingProduct.id ? data.data.product : product
      ));
      
      setShowCreateModal(false);
      setEditingProduct(null);
      setFormData({ nombre: '', descripcion: '', tipo: 'chatbot', welcomeMessage: '', maxUsers: 100, about: '', suggestedPrompts: [], exampleQuestions: [], customPrompt: '', systemContext: '' });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      alert('Error al actualizar el producto');
    }
  };

  const handleToggleProductStatus = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const response = await fetch(`/api/admin-client/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: !product.is_active
        })
      });
      
      if (response.status === 401) {
        console.log('Token expirado, redirigiendo al login...');
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        window.location.href = '/login?expired=true';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al cambiar estado del producto');
      }
      
      const data = await response.json();
      setProducts(products.map(p => 
        p.id === productId ? data.data.product : p
      ));
    } catch (error) {
      console.error('Error cambiando estado del producto:', error);
      alert('Error al cambiar el estado del producto');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    
    try {
      const response = await fetch(`/api/admin-client/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        console.log('Token expirado, redirigiendo al login...');
        localStorage.removeItem('evolve-auth');
        localStorage.removeItem('evolve-selected-client');
        window.location.href = '/login?expired=true';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Error al eliminar producto');
      }
      
      setProducts(products.filter(product => product.id !== productId));
    } catch (error) {
      console.error('Error eliminando producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chatbot': return FiMessageSquare;
      case 'api': return FiSettings;
      case 'web': return FiPackage;
      default: return FiPackage;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chatbot': return 'blue';
      case 'api': return 'green';
      case 'web': return 'purple';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={applyThemeClass('w-8 h-8 border-2 border-minddash-verde-500 border-t-transparent rounded-full animate-spin', 'w-8 h-8 border-2 border-minddash-verde-500 border-t-transparent rounded-full animate-spin')}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className={'text-2xl font-bold text-gray-900 dark:text-white'}>Gestión de Productos</h2>
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>Administra tus chatbots y productos</p>
        </div>
        {!isBayerAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className={applyThemeClass(
              'bg-minddash-verde-600 hover:bg-minddash-verde-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors',
              'bg-minddash-verde-600 hover:bg-minddash-verde-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors'
            )}
          >
            <FiPlus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Productos', value: products.length, icon: FiPackage, color: 'blue' },
          { label: 'Activos', value: products.filter(p => p.is_active).length, icon: FiActivity, color: 'green' },
          { label: 'Usuarios Asignados', value: products.reduce((sum, p) => sum + p.usuarios_asignados, 0), icon: FiUsers, color: 'purple' },
          { label: 'Mensajes/Mes', value: products.reduce((sum, p) => sum + p.mensajes_mes, 0), icon: FiMessageSquare, color: 'orange' }
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={applyThemeClass(
              'bg-minddash-card border border-minddash-border rounded-xl p-4',
              'bg-white border border-gray-200 rounded-xl p-4'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={applyThemeClass('text-gray-400 text-sm', 'text-gray-600 text-sm')}>{stat.label}</p>
                <p className={applyThemeClass('text-xl font-bold text-white', 'text-xl font-bold text-gray-900')}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-600/20`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <div
        className={applyThemeClass(
          'bg-minddash-card border border-minddash-border rounded-xl p-6',
          'bg-white border border-gray-200 rounded-xl p-6'
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className={cn('absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4', applyThemeClass('text-gray-400', 'text-gray-500'))} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={applyThemeClass(
                'w-full pl-10 pr-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                'w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
              )}
            />
          </div>
          
          <Select value={filterType} onValueChange={(next) => setFilterType(next as any)}>
            <SelectTrigger className={applyThemeClass('w-full md:w-auto bg-minddash-elevated border-minddash-border text-white focus:ring-minddash-verde-500', 'w-full md:w-auto bg-white border-gray-300 text-gray-900 focus:ring-green-600')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={applyThemeClass('bg-minddash-card border-minddash-border text-white', 'bg-white border-gray-200 text-gray-900')}>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="chatbot">Chatbots</SelectItem>
              <SelectItem value="api">APIs</SelectItem>
              <SelectItem value="web">Web Apps</SelectItem>
            </SelectContent>
          </Select>
          
          <div className={applyThemeClass('text-sm text-gray-400 flex items-center', 'text-sm text-gray-600 flex items-center')}>
            <FiPackage className="w-4 h-4 mr-2" />
            {filteredProducts.length} de {products.length} productos
          </div>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const TypeIcon = getTypeIcon(product.tipo);
          const typeColor = getTypeColor(product.tipo);
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={applyThemeClass(
                'bg-minddash-card border border-minddash-border rounded-xl p-6 hover:bg-minddash-elevated transition-colors',
                'bg-white border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${typeColor}-600/20`}>
                    <TypeIcon className={`w-5 h-5 text-${typeColor}-400`} />
                  </div>
                  <div>
                    <h3 className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{product.nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full bg-${typeColor}-900/30 text-${typeColor}-300`}>
                      {product.tipo.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isBayerAdmin && (
                    <button
                      onClick={() => handleToggleProductStatus(product.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.is_active 
                          ? 'text-green-400 hover:bg-green-900/20' 
                          : 'text-gray-400 hover:bg-gray-700'
                      }`}
                      title={product.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {product.is_active ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              
              <p className={applyThemeClass('text-gray-400 text-sm mb-4 line-clamp-2', 'text-gray-600 text-sm mb-4 line-clamp-2')}>{product.descripcion}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className={'text-2xl font-bold text-gray-900 dark:text-white'}>{product.usuarios_asignados}</p>
                  <p className={applyThemeClass('text-xs text-gray-400', 'text-xs text-gray-500')}>Usuarios</p>
                </div>
                <div className="text-center">
                  <p className={'text-2xl font-bold text-gray-900 dark:text-white'}>{product.mensajes_mes}</p>
                  <p className={applyThemeClass('text-xs text-gray-400', 'text-xs text-gray-500')}>Mensajes/mes</p>
                </div>
              </div>
              
              <div className={`w-full h-1 rounded-full mb-4 ${
                product.is_active ? 'bg-green-600' : 'bg-gray-600'
              }`}></div>
              
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  product.is_active 
                    ? 'bg-green-900/30 text-green-300' 
                    : 'bg-red-900/30 text-red-300'
                }`}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </span>
                
                <div className="flex items-center space-x-2">
                  {product.tipo === 'chatbot' && (
                    <button
                      onClick={() => {
                        // Para Bayer, usar URL específica; para otros clientes, usar ID del producto
                        const chatbotUrl = isBayerAdmin ? '/chatbot/bayer' : `/chatbot/${product.id}`;
                        window.open(chatbotUrl, '_blank');
                      }}
                      className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Acceder al Chatbot"
                    >
                      <FiExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  {/* Botón de WhatsApp solo para admin de Bayer */}
                  {isBayerAdmin && product.tipo === 'chatbot' && (
                    <button
                      onClick={() => {
                        window.open('https://wa.me/56923799140', '_blank');
                      }}
                      className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Contactar por WhatsApp"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </button>
                  )}
                  {!isBayerAdmin && (
                    <>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <FiEdit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className={applyThemeClass('text-center py-12 bg-minddash-card border border-minddash-border rounded-xl', 'text-center py-12 bg-white border border-gray-200 rounded-xl')}>
          <FiPackage className={cn('w-12 h-12 mx-auto mb-4', applyThemeClass('text-gray-600', 'text-gray-400'))} />
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>No se encontraron productos</p>
        </div>
      )}

      {/* Modal de creación/edición */}
      <ModalPortal>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={applyThemeClass(
                'bg-minddash-card border border-minddash-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto',
                'bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto'
              )}
            >
              <h3 className={applyThemeClass('text-xl font-bold text-white mb-6', 'text-xl font-bold text-gray-900 mb-6')}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className={applyThemeClass(
                      'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                      'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                    )}
                    placeholder="ej: Chatbot Ventas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className={applyThemeClass(
                      'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                      'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                    )}
                    placeholder="Describe el propósito de este producto..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tipo de producto
                  </label>
                  <Select value={formData.tipo} onValueChange={(next) => setFormData({ ...formData, tipo: next as any })}>
                    <SelectTrigger className={applyThemeClass('w-full bg-minddash-elevated border-minddash-border text-white focus:ring-minddash-verde-500', 'w-full bg-white border-gray-300 text-gray-900 focus:ring-green-600')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={applyThemeClass('bg-minddash-card border-minddash-border text-white', 'bg-white border-gray-200 text-gray-900')}>
                      <SelectItem value="chatbot">Chatbot - Asistente conversacional</SelectItem>
                      <SelectItem value="api">API - Integración de sistemas</SelectItem>
                      <SelectItem value="web">Web App - Aplicación web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.tipo === 'chatbot' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Mensaje de bienvenida
                      </label>
                      <input
                        type="text"
                        value={formData.welcomeMessage}
                        onChange={(e) => setFormData({...formData, welcomeMessage: e.target.value})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="¡Hola! ¿En qué puedo ayudarte?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Acerca del chatbot
                      </label>
                      <textarea
                        value={formData.about}
                        onChange={(e) => setFormData({...formData, about: e.target.value})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="Describe qué hace este chatbot y cómo puede ayudar..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Contexto del sistema
                      </label>
                      <textarea
                        value={formData.systemContext}
                        onChange={(e) => setFormData({...formData, systemContext: e.target.value})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="Instrucciones específicas sobre cómo debe comportarse el chatbot..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Prompt personalizado
                      </label>
                      <textarea
                        value={formData.customPrompt}
                        onChange={(e) => setFormData({...formData, customPrompt: e.target.value})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="Prompt específico para personalizar las respuestas..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Preguntas sugeridas (una por línea)
                      </label>
                      <textarea
                        value={formData.suggestedPrompts.join('\n')}
                        onChange={(e) => setFormData({...formData, suggestedPrompts: e.target.value.split('\n').filter(p => p.trim())})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="¿Cuáles son tus servicios?\n¿Cómo puedo contactarte?\n¿Qué horarios manejas?"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Preguntas de ejemplo (una por línea)
                      </label>
                      <textarea
                        value={formData.exampleQuestions.join('\n')}
                        onChange={(e) => setFormData({...formData, exampleQuestions: e.target.value.split('\n').filter(q => q.trim())})}
                        className={applyThemeClass(
                          'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                          'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                        )}
                        placeholder="¿Necesitas ayuda con algo específico?\n¿Tienes alguna duda sobre nuestros productos?"
                        rows={3}
                      />
                    </div>
                    
                    {/* Gestor de archivos de conocimiento */}
                    {editingProduct && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Archivos de conocimiento
                        </label>
                        <div
                          className={applyThemeClass(
                            'bg-minddash-elevated border border-minddash-border rounded-lg p-4',
                            'bg-gray-50 border border-gray-200 rounded-lg p-4'
                          )}
                        >
                          <KnowledgeFileManager productId={editingProduct.id} />
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Máximo de usuarios
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({...formData, maxUsers: parseInt(e.target.value) || 100})}
                    className={applyThemeClass(
                      'w-full px-4 py-2 bg-minddash-elevated border border-minddash-border rounded-lg text-white focus:outline-none focus:border-minddash-verde-500',
                      'w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-green-600'
                    )}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingProduct(null);
                    setFormData({ nombre: '', descripcion: '', tipo: 'chatbot', welcomeMessage: '', maxUsers: 100, about: '', suggestedPrompts: [], exampleQuestions: [], customPrompt: '', systemContext: '' });
                  }}
                  className={cn(
                    'px-4 py-2 transition-colors',
                    applyThemeClass('text-gray-400 hover:text-white', 'text-gray-600 hover:text-gray-900')
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                  className={applyThemeClass(
                    'bg-minddash-verde-600 hover:bg-minddash-verde-700 text-white px-4 py-2 rounded-lg transition-colors',
                    'bg-minddash-verde-600 hover:bg-minddash-verde-700 text-white px-4 py-2 rounded-lg transition-colors'
                  )}
                >
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}