'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiMessageSquare,
  FiX,
  FiSave,
  FiAlertCircle,
  FiCode
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { postBackend } from '@/lib/api-helpers';
import ModalPortal from '@/components/ui/ModalPortal';
import { useThemeMode } from '@/hooks/useThemeMode';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';

interface Example {
  id: string;
  product_id: string;
  name: string;
  description: string;
  data_query: string;
  created_at: string;
  updated_at?: string;
}

interface ExamplesManagementViewProps {
  productId: string;
}

export default function ExamplesManagementView({ productId }: ExamplesManagementViewProps) {
  const pathname = usePathname();
  const { applyThemeClass } = useThemeMode();

  const encodeBase64Url = (input: string) => {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<Example | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_query: ''
  });

  useEffect(() => {
    loadExamples();
  }, [productId]);

  const loadExamples = async () => {
    try {
      setLoading(true);
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);
      const response = await fetch(`/api/backend/examples?product_id=${productId}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setExamples(Array.isArray(result.data) ? result.data : []);
      } else {
        setExamples([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setExamples([]);
      toast.error('Error al cargar ejemplos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingExample(null);
    setFormData({
      name: '',
      description: '',
      data_query: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (example: Example) => {
    setEditingExample(example);
    setFormData({
      name: example.name,
      description: example.description ?? '',
      data_query: example.data_query
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar ejemplo',
      description: '¿Estás seguro de eliminar este ejemplo? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);
      const response = await fetch(`/api/backend/examples/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Ejemplo eliminado');
        loadExamples();
      } else {
        toast.error('Error al eliminar ejemplo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar ejemplo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim() || !formData.data_query.trim()) {
      toast.error('Nombre, descripción y query SQL son requeridos');
      return;
    }

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        toast.error('Sesión expirada');
        return;
      }

      const { accessToken: token } = JSON.parse(authData);
      const url = editingExample 
        ? `/api/backend/examples/${editingExample.id}`
        : '/api/backend/examples/create';
      
      const method = editingExample ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          data_query_b64: encodeBase64Url(formData.data_query.trim())
        })
      });

      if (response.ok) {
        toast.success(editingExample ? 'Ejemplo actualizado' : 'Ejemplo creado');
        setIsModalOpen(false);
        loadExamples();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar ejemplo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar ejemplo');
    }
  };

  const filteredExamples = examples.filter(example =>
    example.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    example.data_query.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (example.description && example.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={applyThemeClass('text-2xl font-bold text-white flex items-center gap-2', 'text-2xl font-bold text-gray-900 flex items-center gap-2')}>
            <FiMessageSquare className={applyThemeClass('text-primary', 'text-primary')} />
            Ejemplos Few-Shot
          </h2>
          <p className={applyThemeClass('text-gray-400 mt-1', 'text-gray-600 mt-1')}>
            Gestiona ejemplos de preguntas y respuestas SQL para entrenar el modelo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            <FiPlus /> Nuevo Ejemplo
          </button>
          <button
            onClick={async () => {
              const { ok, error } = await postBackend('/examples/deploy', { product_id: productId, environment: 'develop' });
              if (ok) toast.success('Deploy de ejemplos ejecutado');
              else toast.error(typeof error === 'string' ? error : 'Error en deploy de ejemplos');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Deploy Ejemplos
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar ejemplos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-card border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="list" count={4} />}

      {/* Lista de Ejemplos */}
      {!loading && (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredExamples.map((example) => (
              <motion.div
                key={example.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-teal-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                      <FiMessageSquare className="text-teal-400" />
                    </div>
                    <div className="flex-1">
                      {example.description && (
                        <p className="text-xs text-gray-500 mb-1">{example.description}</p>
                      )}
                      <div className="space-y-3">
                        {/* Pregunta del Usuario */}
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <FiMessageSquare size={12} /> Nombre del Ejemplo
                          </p>
                          <div className="bg-gray-50 dark:bg-minddash-elevated/50 rounded-lg p-3">
                            <p className="text-gray-900 dark:text-white text-sm">{example.name}</p>
                          </div>
                        </div>

                        {/* Respuesta SQL */}
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                            <FiCode size={12} /> Respuesta SQL
                          </p>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                            <code className="text-teal-400 text-xs font-mono break-all">
                              {example.data_query}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(example)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-teal-400"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(example.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-400"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Creado: {new Date(example.created_at).toLocaleString()}
                  {example.updated_at && (
                    <span className="ml-2">
                      · Actualizado: {new Date(example.updated_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredExamples.length === 0 && (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No se encontraron ejemplos' : 'No hay ejemplos creados'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Los ejemplos few-shot ayudan al modelo a entender mejor las consultas
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
              className="bg-white dark:bg-minddash-card rounded-lg p-6 w-full max-w-3xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingExample ? 'Editar Ejemplo' : 'Nuevo Ejemplo'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del Ejemplo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: Ventas mensuales por región"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ej: Consulta de ventas por mes"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Texto descriptivo visible para el equipo.</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FiMessageSquare size={16} /> Contenido del Ejemplo
                  </label>
                  <textarea
                    value={formData.data_query}
                    onChange={(e) => setFormData({ ...formData, data_query: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-minddash-elevated border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="SELECT COUNT(*) FROM ventas WHERE fecha >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
                    rows={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Query SQL que responde a la lógica del ejemplo
                  </p>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
                  <p className="text-sm text-teal-400 mb-2 font-medium">💡 Consejo</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Los ejemplos few-shot mejoran la precisión del modelo. Incluye variaciones de preguntas
                    similares y asegúrate de que las queries SQL sean correctas y eficientes.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FiSave /> Guardar
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
