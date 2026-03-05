'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet, Image, Loader2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  exportToCSV, 
  exportToXLSX, 
  exportMultipleToXLSX,
  exportElementToImage 
} from '@/lib/export-utils';

type ExportTarget = 'all' | 'single';
type DataFormat = 'csv' | 'xlsx';
type ImageFormat = 'png' | 'jpg';

interface ChartData {
  id: string;
  name: string;
  option: Record<string, any>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  charts: ChartData[];
  canvasRef?: React.RefObject<HTMLElement>;
  selectedChartIndex?: number;
}

export default function ExportModal({ 
  isOpen, 
  onClose, 
  charts, 
  canvasRef,
  selectedChartIndex 
}: Props) {
  const [exportType, setExportType] = useState<'data' | 'image'>('data');
  const [target, setTarget] = useState<ExportTarget>('all');
  const [dataFormat, setDataFormat] = useState<DataFormat>('xlsx');
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const availableCharts = charts.filter(c => c.option);

  const handleExport = useCallback(async () => {
    if (availableCharts.length === 0) return;
    
    setExporting(true);
    setSuccess(false);

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      
      if (exportType === 'data') {
        if (target === 'all' && availableCharts.length > 1) {
          // Export all charts to single Excel with multiple sheets
          if (dataFormat === 'xlsx') {
            await exportMultipleToXLSX(
              availableCharts.map(c => ({ option: c.option, name: c.name })),
              `minddash-reporte-${timestamp}`
            );
          } else {
            // CSV: export first chart only (CSV doesn't support multiple sheets)
            exportToCSV(
              availableCharts[0].option, 
              `minddash-${availableCharts[0].name}-${timestamp}`
            );
          }
        } else {
          // Export single chart
          const chartToExport = selectedChartIndex !== undefined 
            ? availableCharts[selectedChartIndex] 
            : availableCharts[0];
          
          if (chartToExport) {
            const filename = `minddash-${chartToExport.name}-${timestamp}`;
            if (dataFormat === 'xlsx') {
              await exportToXLSX(chartToExport.option, filename, chartToExport.name);
            } else {
              exportToCSV(chartToExport.option, filename);
            }
          }
        }
      } else {
        // Image export
        if (canvasRef?.current) {
          await exportElementToImage(
            canvasRef.current,
            `minddash-canvas-${timestamp}`,
            imageFormat
          );
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  }, [exportType, target, dataFormat, imageFormat, availableCharts, selectedChartIndex, canvasRef, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="glass-panel border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl bg-[#0c0c0c]/90"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Exportar datos</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {availableCharts.length} gráfico{availableCharts.length !== 1 ? 's' : ''} disponible{availableCharts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Export Type Toggle */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                  Tipo de exportación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportType('data')}
                    className={`group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border transition-all duration-200 overflow-hidden ${
                      exportType === 'data'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-300 ${exportType === 'data' ? 'opacity-100' : ''}`} />
                    <FileSpreadsheet className="w-5 h-5 relative z-10" />
                    <span className="font-medium relative z-10">Datos</span>
                  </button>
                  <button
                    onClick={() => setExportType('image')}
                    disabled={!canvasRef?.current}
                    className={`group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border transition-all duration-200 overflow-hidden ${
                      exportType === 'image'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-300 ${exportType === 'image' ? 'opacity-100' : ''}`} />
                    <Image className="w-5 h-5 relative z-10" />
                    <span className="font-medium relative z-10">Imagen</span>
                  </button>
                </div>
              </div>

              {exportType === 'data' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Target Selection */}
                  {availableCharts.length > 1 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                        ¿Qué exportar?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setTarget('all')}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            target === 'all'
                              ? 'border-blue-500/30 bg-blue-500/5 text-blue-400'
                              : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Todos ({availableCharts.length})
                        </button>
                        <button
                          onClick={() => setTarget('single')}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            target === 'single'
                              ? 'border-blue-500/30 bg-blue-500/5 text-blue-400'
                              : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Gráfico actual
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Data Format */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                      Formato
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setDataFormat('xlsx')}
                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                          dataFormat === 'xlsx'
                            ? 'border-green-500/30 bg-green-500/5 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                          XLSX
                        </span>
                        <span className="font-medium">Excel</span>
                      </button>
                      <button
                        onClick={() => setDataFormat('csv')}
                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                          dataFormat === 'csv'
                            ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">
                          CSV
                        </span>
                        <span className="font-medium">Texto</span>
                      </button>
                    </div>
                    {dataFormat === 'xlsx' && target === 'all' && availableCharts.length > 1 && (
                      <p className="text-[11px] text-gray-500 mt-2.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                        Cada gráfico se exportará en una hoja separada.
                      </p>
                    )}
                    {dataFormat === 'csv' && target === 'all' && availableCharts.length > 1 && (
                      <p className="text-[11px] text-yellow-500/70 mt-2.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-yellow-500"></span>
                        CSV solo permite un archivo. Se exportará el primer gráfico.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Image Format */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                      Formato de imagen
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setImageFormat('png')}
                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                          imageFormat === 'png'
                            ? 'border-purple-500/30 bg-purple-500/5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                          PNG
                        </span>
                        <span className="font-medium">Alta calidad</span>
                      </button>
                      <button
                        onClick={() => setImageFormat('jpg')}
                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                          imageFormat === 'jpg'
                            ? 'border-orange-500/30 bg-orange-500/5 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                          JPG
                        </span>
                        <span className="font-medium">Comprimido</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                      Se capturará todo el canvas con los gráficos visibles.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/10 bg-[#0a0a0a]/50">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 h-10 px-5"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting || availableCharts.length === 0}
                className={`min-w-[140px] h-10 px-6 font-medium shadow-lg transition-all hover:scale-105 ${
                  success 
                    ? 'bg-green-600 hover:bg-green-600 text-white shadow-green-900/20' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    ¡Listo!
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
