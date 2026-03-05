'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiUpload, FiFile, FiTrash2, FiAlertCircle, FiCheck, FiClock, FiX } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useThemeMode } from '@/hooks/useThemeMode';

interface KnowledgeFile {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  upload_status: string;
  processing_status: string;
  upload_date: string;
  processed_date?: string;
  error_message?: string;
  chunks_count: number;
}

interface KnowledgeStats {
  totalFiles: number;
  totalChunks: number;
  totalSize: number;
  processingFiles: number;
}

interface KnowledgeFileManagerProps {
  productId: string;
}

export default function KnowledgeFileManager({ productId }: KnowledgeFileManagerProps) {
  const { applyThemeClass } = useThemeMode();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const loadFiles = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token de autenticación no encontrado');
        return;
      }

      const response = await fetch(`/api/admin-client/products/${productId}/knowledge-files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar archivos');
      }

      const data = await response.json();
      setFiles(data.files || []);
      setStats(data.stats || { totalFiles: 0, totalChunks: 0, totalSize: 0, processingFiles: 0 });
    } catch (error) {
      console.error('Error loading files:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar archivos');
      setFiles([]);
      setStats({ totalFiles: 0, totalChunks: 0, totalSize: 0, processingFiles: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadFiles();
    }
  }, [productId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['.pdf', '.csv', '.xlsx'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return 'Solo se permiten archivos PDF, CSV y XLSX';
    }

    if (file.size > maxSize) {
      return 'El archivo es demasiado grande. Máximo 10MB';
    }

    if (files.length >= 20) {
      return 'Límite de archivos alcanzado. Máximo 20 archivos por producto';
    }

    return null;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona un archivo');
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/admin-client/products/${productId}/knowledge-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir archivo');
      }

      const data = await response.json();
      
      // Limpiar selección
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Recargar archivos
      await loadFiles();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar archivo',
      description: '¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const response = await fetch(`/api/admin-client/products/${productId}/knowledge-files?fileId=${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar archivo');
      }

      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar archivo');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (uploadStatus: string, processingStatus: string) => {
    if (uploadStatus === 'FAILED' || processingStatus === 'FAILED') {
      return <FiX className="w-4 h-4 text-red-500" />;
    }
    if (processingStatus === 'COMPLETED') {
      return <FiCheck className="w-4 h-4 text-green-500" />;
    }
    if (processingStatus === 'PROCESSING') {
      return <FiClock className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
    return <FiClock className="w-4 h-4 text-gray-500" />;
  };

  const getStatusText = (uploadStatus: string, processingStatus: string) => {
    if (uploadStatus === 'FAILED') return 'Error en subida';
    if (processingStatus === 'FAILED') return 'Error en procesamiento';
    if (processingStatus === 'COMPLETED') return 'Completado';
    if (processingStatus === 'PROCESSING') return 'Procesando...';
    if (processingStatus === 'PENDING') return 'Pendiente';
    return 'Desconocido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        <span className="ml-2 text-gray-400">Cargando archivos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-3', 'bg-white border border-gray-200 rounded-lg p-3')}>
            <div className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-600')}>Archivos</div>
            <div className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{stats.totalFiles}</div>
          </div>
          <div className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-3', 'bg-white border border-gray-200 rounded-lg p-3')}>
            <div className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-600')}>Chunks</div>
            <div className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{stats.totalChunks}</div>
          </div>
          <div className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-3', 'bg-white border border-gray-200 rounded-lg p-3')}>
            <div className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-600')}>Tamaño</div>
            <div className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{formatFileSize(stats.totalSize)}</div>
          </div>
          <div className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-3', 'bg-white border border-gray-200 rounded-lg p-3')}>
            <div className={applyThemeClass('text-sm text-gray-400', 'text-sm text-gray-600')}>Procesando</div>
            <div className={applyThemeClass('text-lg font-semibold text-white', 'text-lg font-semibold text-gray-900')}>{stats.processingFiles}</div>
          </div>
        </div>
      )}

      {/* Área de subida simplificada */}
      <div className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-4', 'bg-white border border-gray-200 rounded-lg p-4')}>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Subir archivo de conocimiento</h4>
        
        <div className="space-y-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xlsx"
              onChange={handleFileSelect}
              className={applyThemeClass('w-full px-3 py-2 bg-minddash-card border border-minddash-border rounded-lg text-white text-sm focus:outline-none focus:border-green-500', 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-green-600')}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos permitidos: PDF, CSV, XLSX. Tamaño máximo: 10MB
            </p>
          </div>

          {selectedFile && (
            <div className={applyThemeClass('flex items-center justify-between bg-minddash-card border border-minddash-border rounded-lg p-3', 'flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3')}>
              <div className="flex items-center space-x-2">
                <FiFile className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-white">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <FiUpload className="w-4 h-4" />
                <span>Subir archivo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mostrar errores */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2"
        >
          <FiAlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <FiX className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">Archivos subidos ({files.length}/20)</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={applyThemeClass('bg-minddash-elevated border border-minddash-border rounded-lg p-3 flex items-center justify-between', 'bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between')}
              >
                <div className="flex items-center space-x-3">
                  <FiFile className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-white">{file.original_name}</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {new Date(file.upload_date).toLocaleDateString()}
                      {file.chunks_count > 0 && ` • ${file.chunks_count} chunks`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(file.upload_status, file.processing_status)}
                    <span className="text-xs text-gray-400">
                      {getStatusText(file.upload_status, file.processing_status)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Eliminar archivo"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <FiFile className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay archivos de conocimiento subidos</p>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}