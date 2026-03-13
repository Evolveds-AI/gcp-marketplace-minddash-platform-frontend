'use client';

import { useEffect, useRef, useState } from 'react';
import { FiUpload, FiFileText, FiAlertCircle, FiEye, FiX, FiClock, FiCheck, FiTrash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RagDocument {
  id: string;
  filename: string;
  content_type: string;
  uri: string;
  status: string;
  created_at: string;
}

interface RagDocumentsManagerProps {
  productId: string;
}

export default function RagDocumentsManager({ productId }: RagDocumentsManagerProps) {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detailDocument, setDetailDocument] = useState<RagDocument | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<RagDocument | null>(null);
  const [ragEnabled, setRagEnabled] = useState<boolean | null>(null);
  const [updatingRagEnabled, setUpdatingRagEnabled] = useState(false);

  const [testQueriesText, setTestQueriesText] = useState('');
  const [testingRag, setTestingRag] = useState(false);
  const [testRagError, setTestRagError] = useState<string | null>(null);
  const [testRagResult, setTestRagResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getKeywordFromFilename = (filename?: string | null) => {
    if (!filename) return null;
    const base = String(filename).split('/').pop() || String(filename);
    const withoutExt = base.replace(/\.[^/.]+$/, '');
    const cleaned = withoutExt.replace(/[_-]+/g, ' ').trim();
    const firstWord = cleaned.split(/\s+/).find(Boolean) || '';
    const keyword = firstWord.trim();
    return keyword ? keyword.slice(0, 40) : null;
  };

  const exampleKeyword =
    getKeywordFromFilename(selectedFile?.name) || getKeywordFromFilename(documents[0]?.filename);

  const testRagExamples = [
    'Resumí el contenido principal de los documentos.',
    exampleKeyword ? `¿Qué información relevante aparece sobre "${exampleKeyword}"?` : null,
    'Listá los puntos importantes en formato bullets.',
    'Extraé cualquier fecha o número relevante mencionado en los documentos.',
  ].filter((q): q is string => Boolean(q));

  const appendTestQuery = (q: string) => {
    setTestQueriesText((prev) => {
      const trimmed = (prev || '').trim();
      return trimmed ? `${trimmed}\n${q}` : q;
    });
  };

  const formatApiErrorMessage = (data: any, fallback: string) => {
    const raw = data?.message ?? data?.error ?? data?.detail;
    if (!raw) return fallback;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      const joined = raw
        .map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
        .filter(Boolean)
        .join(' | ');
      return joined || fallback;
    }
    try {
      return JSON.stringify(raw);
    } catch {
      return fallback;
    }
  };

  const canRunTest =
    Boolean(testQueriesText.trim()) &&
    Boolean(productId) &&
    ragEnabled === true &&
    !testingRag;

  const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024;
  const MAX_FILE_SIZE_LABEL = '32MB';

  const formatFileSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo es demasiado grande (${formatFileSize(file.size)}). Máximo ${MAX_FILE_SIZE_LABEL}.`;
    }
    return null;
  };

  const selectedFileValidationError = selectedFile ? validateFile(selectedFile) : null;

  useEffect(() => {
    if (productId) {
      loadRagConfig();
      loadDocuments();
    }
  }, [productId]);

  useEffect(() => {
    const hasPending = documents.some((doc) => {
      const status = (doc.status || '').toUpperCase();
      return status === 'PENDING' || status === 'RUNNING' || status === 'IN_PROGRESS';
    });

    if (!hasPending || !productId) {
      return;
    }

    const id = setInterval(() => {
      loadDocuments(true);
    }, 4000);

    return () => clearInterval(id);
  }, [documents, productId]);

  const loadRagConfig = async () => {
    try {
      setError(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        setRagEnabled(null);
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/admin-client/chatbots/${productId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data && (data.message || data.detail || data.error)) || 'Error al cargar configuración de RAG';
        setError(String(message));
        setRagEnabled(null);
        return;
      }

      const chatbot = data?.chatbot ?? data?.data ?? data;
      const raw = chatbot?.is_active_rag;
      setRagEnabled(raw === false ? false : true);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar configuración de RAG');
      setRagEnabled(null);
    }
  };

  const updateRagEnabled = async (nextValue: boolean) => {
    const previous = ragEnabled;
    setRagEnabled(nextValue);
    setUpdatingRagEnabled(true);
    setError(null);

    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        setRagEnabled(previous);
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/admin-client/chatbots/${productId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ is_active_rag: nextValue }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(formatApiErrorMessage(data, 'Error al actualizar configuración de RAG'));
        setRagEnabled(previous);
        return;
      }

      const updated = data?.chatbot ?? data?.data ?? data;
      const raw = updated?.is_active_rag;
      setRagEnabled(raw === false ? false : true);
    } catch (e: any) {
      setError(e?.message || 'Error al actualizar configuración de RAG');
      setRagEnabled(previous);
    } finally {
      setUpdatingRagEnabled(false);
    }
  };

  const loadDocuments = async (silent?: boolean) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        setDocuments([]);
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/backend/rag/documents?product_id=${productId}&_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data && (data.message || data.detail || data.error)) || 'Error al listar documentos';
        setError(String(message));
        setDocuments([]);
        return;
      }

      let items: any = data;
      if (data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data && Array.isArray(data.documents)) {
        items = data.documents;
      }

      if (!Array.isArray(items)) {
        items = [];
      }

      setDocuments(
        items.map((d: any) => ({
          id: d.id || d.document_id || '',
          filename: d.filename || d.name || 'Sin nombre',
          content_type: d.content_type || d.mime_type || 'application/octet-stream',
          uri: d.uri || d.path || '',
          status: d.status || 'PENDING',
          created_at: d.created_at || d.createdAt || new Date().toISOString(),
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Error al cargar documentos');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      setDeletingDocumentId(id);
      setError(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/backend/rag/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(formatApiErrorMessage(data, 'Error al eliminar documento'));
        return;
      }

      if (detailDocument?.id === id) {
        setDetailDocument(null);
      }

      await loadDocuments(true);
    } catch (e: any) {
      setError(e?.message || 'Error al eliminar documento');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleTestRag = async () => {
    if (ragEnabled !== true) {
      setTestRagError('El RAG está deshabilitado para este chatbot. Habilítalo para poder hacer pruebas.');
      return;
    }

    const queries = testQueriesText
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);

    if (!queries.length) {
      setTestRagError('Escribí al menos una consulta para probar.');
      return;
    }

    try {
      setTestingRag(true);
      setTestRagError(null);
      setTestRagResult(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setTestRagError('Sesión expirada');
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch('/api/backend/rag/query', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ product_id: productId, queries }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setTestRagError(formatApiErrorMessage(data, 'Error al ejecutar consulta RAG'));
        return;
      }

      setTestRagResult(data);
    } catch (e: any) {
      setTestRagError(e?.message || 'Error al ejecutar consulta RAG');
    } finally {
      setTestingRag(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (ragEnabled !== true) {
      setError('El RAG está deshabilitado para este chatbot. Habilítalo para poder subir documentos.');
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (ragEnabled !== true) {
      setError('El RAG está deshabilitado para este chatbot. Habilítalo para poder subir documentos.');
      return;
    }
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setSelectedFile(event.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (ragEnabled !== true) {
      setError('El RAG está deshabilitado para este chatbot. Habilítalo para poder subir documentos.');
      return;
    }

    if (!selectedFile) {
      setError('Selecciona un archivo para subir');
      return;
    }

    if (selectedFileValidationError) {
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/backend/rag/upload?product_id=${productId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data && (data.message || data.detail || data.error)) || 'Error al subir documento';
        setError(String(message));
        return;
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Optimistic update: add document immediately so it shows as PENDING
      // without waiting for the next loadDocuments round-trip
      if (data?.id) {
        setDocuments((prev) => [
          {
            id: data.id,
            filename: data.filename || selectedFile.name,
            content_type: data.content_type || selectedFile.type,
            uri: data.uri || '',
            status: data.status || 'PENDING',
            created_at: data.created_at || new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        await loadDocuments(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const normalized = (status || '').toUpperCase();

    if (normalized === 'PENDING') {
      return {
        label: 'Pendiente',
        className: 'bg-gray-700/60 text-gray-200 border-gray-500/80',
      };
    }

    if (normalized === 'RUNNING' || normalized === 'IN_PROGRESS') {
      return {
        label: 'En progreso',
        className: 'bg-blue-700/40 text-blue-200 border-blue-500/80',
      };
    }

    if (normalized === 'DONE') {
      return {
        label: 'Completado',
        className: 'bg-green-700/40 text-green-200 border-green-500/80',
      };
    }

    if (normalized === 'ERROR') {
      return {
        label: 'Error',
        className: 'bg-red-700/40 text-red-200 border-red-500/80',
      };
    }

    return {
      label: normalized || 'Desconocido',
      className: 'bg-gray-700/60 text-gray-200 border-gray-500/80',
    };
  };

  const formatDate = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const handleViewDetail = async (id: string) => {
    try {
      setDetailOpen(true);
      setLoadingDetail(true);
      setError(null);
      setDetailDocument(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setError('Sesión expirada');
        return;
      }

      const token = JSON.parse(authData).accessToken;

      const response = await fetch(`/api/backend/rag/documents/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data && (data.message || data.detail || data.error)) || 'Error al obtener detalle del documento';
        setError(String(message));
        setDetailOpen(false);
        return;
      }

      const d: any = data && (data.data || data.document || data);

      if (!d) {
        return;
      }

      const mapped: RagDocument = {
        id: d.id || d.document_id || id,
        filename: d.filename || d.name || 'Sin nombre',
        content_type: d.content_type || d.mime_type || 'application/octet-stream',
        uri: d.uri || d.path || '',
        status: d.status || 'PENDING',
        created_at: d.created_at || d.createdAt || new Date().toISOString(),
      };

      setDetailDocument(mapped);
    } catch (e: any) {
      setError(e?.message || 'Error al obtener detalle del documento');
      setDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">Base de conocimiento (RAG)</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Habilita o deshabilita el uso de documentos como contexto para el asistente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                ragEnabled === null
                  ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600'
                  : ragEnabled
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-700/30 dark:text-emerald-200 dark:border-emerald-600/60'
                  : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600'
              }
            >
              {ragEnabled === null ? 'Cargando…' : ragEnabled ? 'Habilitado' : 'Deshabilitado'}
            </Badge>
            <Switch
              checked={ragEnabled === true}
              onCheckedChange={(checked) => updateRagEnabled(Boolean(checked))}
              disabled={updatingRagEnabled || ragEnabled === null}
            />
          </div>
        </div>

        {ragEnabled === false && (
          <Alert className="mt-3 bg-amber-50 border-amber-200 text-amber-900 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-200">
            <FiAlertCircle className="h-4 w-4" />
            <div className="text-xs">
              El RAG está deshabilitado. Puedes mantener los documentos, pero el asistente no los usará hasta volver a habilitarlo.
            </div>
          </Alert>
        )}
      </div>

      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Documentos de conocimiento</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Sube documentos que el asistente usará como conocimiento adicional para responder.
            </p>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300"
              title="La ingesta es asíncrona, los estados pueden tardar unos segundos en actualizarse."
            >
              <FiClock className="w-3 h-3" />
              Actualización automática cuando hay ingestas en curso
            </span>
          </div>
        </div>

        {/* Upload Card - estilo alineado con el input del rol del prompt */}
        <div className="relative w-full mx-auto" role="complementary" aria-label="File upload">
          <div className="group relative w-full rounded-xl bg-gray-50 dark:bg-minddash-elevated/50 ring-1 ring-gray-200 dark:ring-gray-700 p-0.5">
            {/* Top gradient line */}
            <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            <div className="relative w-full rounded-[10px] bg-white dark:bg-gray-900/50 p-1.5">
              <div
                className="relative mx-auto w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {/* Hover glow effect */}
                <div className="absolute -right-4 -top-4 h-8 w-8 bg-gradient-to-br from-emerald-500/20 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="relative flex min-h-[220px] flex-col items-center justify-center p-6">
                  {/* Icon */}
                  <div className="relative mb-5 w-16 h-16">
                    <div className="w-full h-full rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/30">
                      <FiUpload className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>

                  {/* Text */}
                  <div className="text-center space-y-2 mb-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                      Sube tu archivo
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      PDF, CSV, XLSX o texto plano — hasta {MAX_FILE_SIZE_LABEL}
                    </p>
                  </div>

                  {/* Selected file chip */}
                  {selectedFile && (
                    <div
                      className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                        selectedFileValidationError
                          ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                          : 'bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/10 dark:border-white/10 dark:text-gray-200'
                      }`}
                    >
                      <FiFileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="max-w-[160px] truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <span className={selectedFileValidationError ? 'text-red-300' : 'text-gray-400'}>
                        {formatFileSize(selectedFile.size)} / {MAX_FILE_SIZE_LABEL}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="ml-1 text-gray-400 hover:text-red-400 transition-colors"
                        aria-label="Quitar archivo seleccionado"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Upload button */}
                  <Button
                    type="button"
                    disabled={uploading || ragEnabled !== true}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedFile && !selectedFileValidationError) {
                        handleUpload();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    variant="secondary"
                    className="w-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 dark:bg-white/10 dark:hover:bg-white/20 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
                        <span>Subiendo...</span>
                      </>
                    ) : selectedFile ? (
                      <>
                        <FiUpload className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                        <span>{selectedFileValidationError ? 'Cambiar archivo' : 'Subir archivo'}</span>
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200" />
                        <span>Elegir archivo</span>
                      </>
                    )}
                  </Button>

                  {/* Bottom text */}
                  <p className="mt-4 text-xs text-gray-500">
                    También podés arrastrar y soltar el archivo aquí
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    disabled={ragEnabled !== true}
                    className="sr-only"
                    accept=".pdf,.csv,.xlsx,.txt,text/plain,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    aria-label="Seleccionar archivo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {(selectedFileValidationError || error) && (
          <Alert
            variant="destructive"
            className="mt-4 bg-red-900/20 border-red-500/50 text-red-200 [&>svg]:text-red-200"
          >
            <FiAlertCircle className="h-4 w-4" />
            <div className="text-xs">{selectedFileValidationError || error}</div>
          </Alert>
        )}
      </div>

      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">Documentos subidos</h4>
          <span className="text-xs text-gray-500">{documents.length} documento(s)</span>
        </div>

        {loading && documents.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mr-3" />
            <span>Cargando documentos...</span>
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
            <FiFileText className="w-8 h-8 mb-2 opacity-60" />
            <p>No hay documentos subidos todavía.</p>
          </div>
        )}

        {documents.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-full text-xs text-left text-gray-700 dark:text-gray-300">
              <TableHeader className="bg-gray-50 dark:bg-gray-900/80 text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">
                <TableRow className="border-gray-200 dark:border-gray-700/60">
                  <TableHead className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Nombre</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Tipo</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Creado</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Estado</TableHead>
                  <TableHead className="px-3 py-2 font-medium text-right text-gray-600 dark:text-gray-400">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const statusConfig = getStatusConfig(doc.status);
                  const isError = (doc.status || '').toUpperCase() === 'ERROR';
                  const isDone = (doc.status || '').toUpperCase() === 'DONE';
                  const isRunning =
                    (doc.status || '').toUpperCase() === 'RUNNING' ||
                    (doc.status || '').toUpperCase() === 'IN_PROGRESS';

                  return (
                    <TableRow key={doc.id} className="border-gray-200 dark:border-gray-700/60">
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2 max-w-xs">
                          <FiFileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate text-gray-900 dark:text-gray-100 text-[13px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle text-[11px] text-gray-400">
                        {doc.content_type}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle text-[11px] text-gray-400">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <Badge
                          variant="outline"
                          className={`gap-1 px-2 py-0.5 text-[10px] ${statusConfig.className}`}
                          title={isError ? 'La ingesta falló' : undefined}
                        >
                          {isRunning && (
                            <span className="inline-block w-3 h-3 border-b-2 border-blue-200 rounded-full animate-spin" />
                          )}
                          {isDone && <FiCheck className="w-3 h-3" />}
                          {!isRunning && !isDone && !isError && <FiClock className="w-3 h-3" />}
                          {isError && <FiAlertCircle className="w-3 h-3" />}
                          <span>{statusConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewDetail(doc.id)}
                            className="h-7 px-2 bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-700 dark:bg-gray-700/80 dark:hover:bg-gray-600 dark:text-gray-100"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>Ver detalle</span>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setDocumentToDelete(doc)}
                            disabled={deletingDocumentId === doc.id}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-300 hover:text-red-200 hover:bg-red-500/10"
                            title="Eliminar documento"
                            aria-label="Eliminar documento"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-minddash-elevated/50 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-200">Pregúntale a tus archivos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-gray-700 dark:text-gray-300" htmlFor="rag-test-queries">
                  Escribe tu pregunta (una por línea)
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2"
                      >
                        Cómo usar
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Puedes escribir varias preguntas (una por línea). Te ayuda a ver si los documentos subidos tienen la información que buscas.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Tip: usa palabras exactas que estén en tus documentos (nombres, códigos o frases).
              </p>
            </div>

            <Textarea
              id="rag-test-queries"
              value={testQueriesText}
              onChange={(e) => setTestQueriesText(e.target.value)}
              disabled={ragEnabled !== true}
              placeholder={'Ejemplo (una por línea):\nResumí el documento.\n¿Dónde se menciona "X"?'}
              className="min-h-[90px] bg-white dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />

            <div className="flex flex-wrap gap-2">
              {testRagExamples.map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => appendTestQuery(q)}
                  disabled={testingRag || ragEnabled !== true}
                  className="h-7 px-2 bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-700 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-100"
                >
                  {q}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Haz una prueba rápida antes de usar el asistente con usuarios.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setTestQueriesText('');
                    setTestRagError(null);
                    setTestRagResult(null);
                  }}
                  disabled={testingRag}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700/80 dark:hover:bg-gray-600 dark:text-gray-100"
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  onClick={handleTestRag}
                  disabled={!canRunTest}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {testingRag ? 'Probando…' : 'Probar'}
                </Button>
              </div>
            </div>

            {testRagError && (
              <Alert
                variant="destructive"
                className="bg-red-900/20 border-red-500/50 text-red-200 [&>svg]:text-red-200"
              >
                <FiAlertCircle className="h-4 w-4" />
                <div className="text-xs">{testRagError}</div>
              </Alert>
            )}

            {testRagResult !== null && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Respuesta</div>
                  {typeof testRagResult === 'object' && Array.isArray((testRagResult as any)?.results) && (
                    <div className="text-[11px] text-gray-500">
                      {(testRagResult as any).results.length} resultado(s)
                    </div>
                  )}
                </div>

                {typeof testRagResult === 'object' && Array.isArray((testRagResult as any)?.results) ? (
                  (testRagResult as any).results.length === 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">Sin resultados.</div>
                      <div className="rounded-md border border-gray-800 bg-gray-950/40 p-2 text-[11px] text-gray-400">
                        <div className="font-medium text-gray-300 mb-1">Sugerencias</div>
                        <div>
                          1) Verificá que el documento esté en estado <span className="text-gray-200">Completado</span>.
                        </div>
                        <div>
                          2) Probá con una palabra exacta que exista en el texto (una frase corta o un código).
                        </div>
                        <div>
                          3) Si subiste imágenes, es posible que no tengan texto indexable.
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => appendTestQuery('Devolvé fragmentos textuales donde aparezca la palabra "X".')}
                          className="h-7 px-2 bg-gray-700/50 hover:bg-gray-600 text-[11px] text-gray-100"
                        >
                          Probar con palabra exacta
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(testRagResult as any).results.map((r: any, idx: number) => (
                        <div key={idx} className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/40 p-2">
                          <div className="text-[11px] text-gray-500 mb-1">Resultado {idx + 1}</div>
                          <pre className="max-h-[160px] overflow-auto text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                            {typeof r === 'string' ? r : JSON.stringify(r, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <pre className="max-h-[260px] overflow-auto text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {typeof testRagResult === 'string'
                      ? testRagResult
                      : JSON.stringify(testRagResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailDocument(null);
            setLoadingDetail(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900/95 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle>Detalle del documento</DialogTitle>
            <DialogDescription className="text-gray-400">
              Información del archivo y estado de ingesta.
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
              <span>Cargando detalle...</span>
            </div>
          ) : detailDocument ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <div className="text-gray-500">ID</div>
                <div className="font-mono break-all text-[11px]">{detailDocument.id}</div>
              </div>
              <div>
                <div className="text-gray-500">Nombre de archivo</div>
                <div>{detailDocument.filename}</div>
              </div>
              <div>
                <div className="text-gray-500">Content type</div>
                <div>{detailDocument.content_type}</div>
              </div>
              <div>
                <div className="text-gray-500">Fecha de creación</div>
                <div>{formatDate(detailDocument.created_at)}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-500">URI</div>
                <div className="font-mono break-all text-[11px]">{detailDocument.uri || 'No disponible'}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No hay información disponible.</div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetailOpen(false)}
              className="bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(documentToDelete)} onOpenChange={(open) => (!open ? setDocumentToDelete(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el documento y sus embeddings asociados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {documentToDelete && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{documentToDelete.filename}</div>
              <div className="text-xs text-muted-foreground mt-1">{documentToDelete.id}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              className="mt-0"
              disabled={Boolean(deletingDocumentId)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!documentToDelete) return;
                await handleDeleteDocument(documentToDelete.id);
                setDocumentToDelete(null);
              }}
              disabled={Boolean(deletingDocumentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDocumentId ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
