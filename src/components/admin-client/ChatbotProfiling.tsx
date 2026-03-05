'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiSave,
  FiDatabase,
} from '@/lib/icons';
import { useThemeMode } from '@/hooks/useThemeMode';

interface ChatbotProfilingProps {
  chatbotId: string;
  chatbotName: string;
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface ProfilingTable {
  id: string;
  tableName: string;
  fieldProfile: string;
  fieldDescription: string;
}

export default function ChatbotProfiling({ chatbotId, chatbotName, showNotification }: ChatbotProfilingProps) {
  const pathname = usePathname();
  const { applyThemeClass } = useThemeMode();

  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<ProfilingTable[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Formulario para agregar/editar
  const [formData, setFormData] = useState({
    tableName: '',
    fieldProfile: '',
    fieldDescription: '',
  });

  // Datos demo de tablas de profiling
  const mockTables: ProfilingTable[] = [
    {
      id: 'prof-1',
      tableName: 'users',
      fieldProfile: 'id, email, name, created_at',
      fieldDescription: 'Tabla principal de usuarios del sistema. Contiene información básica de autenticación y perfil.'
    },
    {
      id: 'prof-2',
      tableName: 'messages',
      fieldProfile: 'id, user_id, content, timestamp, chatbot_id',
      fieldDescription: 'Registros de mensajes del chat. Almacena todas las interacciones entre usuarios y chatbots.'
    },
    {
      id: 'prof-3',
      tableName: 'conversations',
      fieldProfile: 'id, user_id, chatbot_id, started_at, ended_at, status',
      fieldDescription: 'Sesiones de conversación. Agrupa mensajes relacionados en una conversación continua.'
    },
  ];

  useEffect(() => {
    loadProfilingData();
  }, [chatbotId]);

  const loadProfilingData = async () => {
    try {
      setLoading(true);
      // Simulación de carga de datos
      setTimeout(() => {
        setTables(mockTables);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error cargando datos de profiling:', error);
      showNotification('error', 'Error al cargar datos de profiling');
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    if (!formData.tableName.trim()) {
      showNotification('error', 'El nombre de la tabla es requerido');
      return;
    }

    const newTable: ProfilingTable = {
      id: `prof-${Date.now()}`,
      tableName: formData.tableName,
      fieldProfile: formData.fieldProfile,
      fieldDescription: formData.fieldDescription,
    };

    setTables([...tables, newTable]);
    setFormData({ tableName: '', fieldProfile: '', fieldDescription: '' });
    showNotification('success', 'Tabla de profiling agregada exitosamente');
  };

  // Estado para guardar datos originales al editar
  const [originalFormData, setOriginalFormData] = useState(formData);

  const handleEditTable = (table: ProfilingTable) => {
    setEditingId(table.id);
    const editData = {
      tableName: table.tableName,
      fieldProfile: table.fieldProfile,
      fieldDescription: table.fieldDescription,
    };
    setFormData(editData);
    setOriginalFormData(editData);
    // Scroll hacia arriba al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Detectar si hay cambios en edición
  const hasEditChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const handleSaveEdit = () => {
    if (!formData.tableName.trim()) {
      showNotification('error', 'El nombre de la tabla es requerido');
      return;
    }

    setTables(tables.map(table => 
      table.id === editingId
        ? { ...table, ...formData }
        : table
    ));
    
    setEditingId(null);
    setFormData({ tableName: '', fieldProfile: '', fieldDescription: '' });
    showNotification('success', 'Tabla de profiling actualizada');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ tableName: '', fieldProfile: '', fieldDescription: '' });
  };

  const handleDeleteTable = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta tabla de profiling?')) {
      setTables(tables.filter(table => table.id !== id));
      showNotification('success', 'Tabla de profiling eliminada');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando configuración de profiling...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={applyThemeClass('text-2xl font-bold text-white mb-2', 'text-2xl font-bold text-gray-900 mb-2')}>Profiling</h3>
          <p className={applyThemeClass('text-gray-400', 'text-gray-600')}>
            Configura los perfiles de tablas para mejorar el análisis de datos del chatbot
          </p>
        </div>
      </div>

      {/* Formulario de Agregar/Editar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-800"
      >
        <div className="grid grid-cols-1 gap-6">
          {/* Table Name */}
          <div>
            <label 
              htmlFor="table-name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Table Name
            </label>
            <input
              id="table-name"
              type="text"
              value={formData.tableName}
              onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
              className="w-full bg-gray-100 dark:bg-minddash-elevated border border-transparent rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition"
              placeholder="Enter table name"
            />
          </div>

          {/* Field Profile */}
          <div>
            <label 
              htmlFor="field-profile" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Field Profile
            </label>
            <textarea
              id="field-profile"
              value={formData.fieldProfile}
              onChange={(e) => setFormData({ ...formData, fieldProfile: e.target.value })}
              rows={4}
              className="w-full bg-gray-100 dark:bg-minddash-elevated border border-transparent rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition resize-none"
              placeholder="Enter field profile (e.g., id, name, email, created_at)"
            />
          </div>

          {/* Field Description */}
          <div>
            <label 
              htmlFor="field-description" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Field Description
            </label>
            <textarea
              id="field-description"
              value={formData.fieldDescription}
              onChange={(e) => setFormData({ ...formData, fieldDescription: e.target.value })}
              rows={4}
              className="w-full bg-gray-100 dark:bg-minddash-elevated border border-transparent rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition resize-none"
              placeholder="Enter field description"
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {editingId ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!formData.tableName.trim() || !hasEditChanges}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave className="w-4 h-4" />
                Guardar Cambios
              </button>
            </>
          ) : (
            <button
              onClick={handleAddTable}
              className="flex items-center justify-center gap-2 w-full bg-blue-600/20 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 font-semibold py-3 rounded-lg hover:bg-blue-600/30 dark:hover:bg-blue-600/40 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add table profiling</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Lista de Tablas */}
      {tables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tablas Configuradas ({tables.length})
          </h4>

          <div className="grid grid-cols-1 gap-4">
            {tables.map((table, index) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-gray-900/50 rounded-lg p-6 border transition-all ${
                  editingId === table.id
                    ? 'border-blue-500 dark:border-blue-500 shadow-lg'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FiDatabase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {table.tableName}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tabla de base de datos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTable(table)}
                      className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Editar"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Field Profile
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-minddash-elevated/50 p-2 rounded">
                      {table.fieldProfile || 'No definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Field Description
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {table.fieldDescription || 'No definido'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {tables.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FiDatabase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No hay tablas de profiling configuradas
          </p>
          <p className="text-sm text-gray-400">
            Agrega tu primera tabla usando el formulario de arriba
          </p>
        </motion.div>
      )}
    </div>
  );
}
