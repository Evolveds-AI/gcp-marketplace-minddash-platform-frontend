'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiFileText,
  FiX,
  FiSave,
  FiAlertCircle,
  FiClock,
  FiTag,
} from '@/lib/icons';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import ModalPortal from '@/components/ui/ModalPortal';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Prompt {
  id: string;
  product_id: string;
  name: string;
  prompt_type: string;
  content: string;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PromptsManagementViewProps {
  productId: string;
}

export default function PromptsManagementView({ productId }: PromptsManagementViewProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const [formData, setFormData] = useState({
    name: '',
    prompt_type: 'system',
    content: '',
    version: '1.0'
  });

  useEffect(() => {
    loadPrompts();
  }, [productId]);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/backend/prompts?product_id=${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPrompts(Array.isArray(result.data) ? result.data : []);
      } else {
        setPrompts([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setPrompts([]);
      toast.error('Error al cargar prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      prompt_type: 'system',
      content: '',
      version: '1.0'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      prompt_type: prompt.prompt_type,
      content: prompt.content,
      version: prompt.version
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar prompt',
      description: '¿Estás seguro de eliminar este prompt? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/backend/prompts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Prompt eliminado');
        loadPrompts();
      } else {
        toast.error('Error al eliminar prompt');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar prompt');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Nombre y contenido son requeridos');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingPrompt 
        ? `/api/backend/prompts/${editingPrompt.id}`
        : '/api/backend/prompts/create';
      
      const method = editingPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productId,
          name: formData.name.trim(),
          prompt_type: formData.prompt_type,
          content: formData.content.trim(),
          version: formData.version
        })
      });

      if (response.ok) {
        toast.success(editingPrompt ? 'Prompt actualizado' : 'Prompt creado');
        setIsModalOpen(false);
        loadPrompts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar prompt');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar prompt');
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || prompt.prompt_type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      sql: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      general: 'bg-green-500/20 text-green-400 border-green-500/30'
    };
    return colors[type] || colors.general;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiFileText className="text-indigo-400" />
            Biblioteca de Prompts
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona las plantillas de prompts del sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <FiPlus /> Nuevo Prompt
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-minddash-elevated border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Select value={filterType} onValueChange={(next) => setFilterType(next)}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="system">System Prompt</SelectItem>
            <SelectItem value="sql">SQL Prompt</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="list" count={4} />}

      {/* Lista de Prompts */}
      {!loading && (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredPrompts.map((prompt, index) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-white dark:bg-minddash-card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <FiFileText className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{prompt.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(prompt.prompt_type)}`}>
                          {prompt.prompt_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                        {prompt.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiTag size={12} />
                          v{prompt.version}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock size={12} />
                          {new Date(prompt.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-indigo-500 dark:text-indigo-400"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(prompt.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-red-500 dark:text-red-400"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPrompts.length === 0 && (
        <div className="text-center py-12">
          <FiAlertCircle className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No se encontraron prompts' : 'No hay prompts creados'}
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
              className="bg-white dark:bg-minddash-card rounded-xl p-6 w-full max-w-3xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto shadow-xl dark:shadow-none"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPrompt ? 'Editar Prompt' : 'Nuevo Prompt'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: System Prompt v2.1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo *
                    </label>
                    <Select
                      value={formData.prompt_type}
                      onValueChange={(next) => setFormData({ ...formData, prompt_type: next })}
                    >
                      <SelectTrigger className="w-full bg-gray-50 dark:bg-minddash-elevated border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-minddash-elevated border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                        <SelectItem value="system">System Prompt</SelectItem>
                        <SelectItem value="sql">SQL Prompt</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Versión
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contenido del Prompt *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-minddash-elevated border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="You are a helpful assistant..."
                    rows={12}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.content.length} caracteres
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
