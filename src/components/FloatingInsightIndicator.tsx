'use client';

import { useInsightContext } from '@/contexts/InsightContext';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiCheckCircle, FiAlertTriangle, FiX, FiTrendingUp, FiRefreshCw } from '@/lib/icons';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function FloatingInsightIndicator() {
  const { task, isIndicatorVisible, dismissIndicator, generateInsight } = useInsightContext();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show if not visible or if idle
  if (!isIndicatorVisible || task.status === 'idle') return null;

  // Don't show the floating indicator if user is already on the insight page for this product
  const isOnInsightPage = pathname === `/chatbot/${task.productId}/insight`;
  if (isOnInsightPage && task.status === 'loading') return null;

  const handleClick = () => {
    router.push(`/chatbot/${task.productId}/insight`);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissIndicator();
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const raw = sessionStorage.getItem('minddash-insight-params');
      if (raw) {
        const params = JSON.parse(raw);
        generateInsight(params);
      } else {
        // No params — navigate to insight page
        router.push(`/chatbot/${task.productId}/insight`);
      }
    } catch {
      router.push(`/chatbot/${task.productId}/insight`);
    }
  };

  const isLoading = task.status === 'loading';
  const isSuccess = task.status === 'success';
  const isError = task.status === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-6 right-6 z-[9999]"
      >
        <div
          onClick={handleClick}
          className={`
            group relative cursor-pointer rounded-2xl border backdrop-blur-xl shadow-2xl
            transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl
            ${isLoading
              ? 'border-blue-500/20 bg-[#111111]/95 shadow-blue-500/10 hover:border-blue-500/30'
              : isSuccess
                ? 'border-emerald-500/20 bg-[#111111]/95 shadow-emerald-500/10 hover:border-emerald-500/30'
                : 'border-amber-500/20 bg-[#111111]/95 shadow-amber-500/10 hover:border-amber-500/30'
            }
          `}
        >
          {/* Dismiss button */}
          {!isLoading && (
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 z-10"
            >
              <FiX className="w-3 h-3" />
            </button>
          )}

          <div className="px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-[360px]">
            {/* Icon */}
            <div className="flex-shrink-0 relative">
              {isLoading && (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FiZap className="w-4 h-4 text-blue-400" />
                  </div>
                </>
              )}
              {isSuccess && (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FiCheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              {isError && (
                <button
                  onClick={handleRetry}
                  className="w-10 h-10 rounded-full bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
                  title="Reintentar"
                >
                  <FiRefreshCw className="w-5 h-5 text-amber-400" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-white truncate">
                  {isLoading && 'Generando insight...'}
                  {isSuccess && 'Insight listo'}
                  {isError && 'Error en insight'}
                </span>
                {isLoading && (
                  <span className="text-[11px] text-gray-500 tabular-nums flex-shrink-0">
                    {formatElapsed(task.elapsedSeconds)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {isLoading && task.progressStep}
                {isSuccess && (
                  <>
                    <span className="text-emerald-400/80">Haz clic para ver resultados</span>
                    {task.result.charts.length > 0 && (
                      <span className="text-gray-600"> · {task.result.charts.length} gráfico{task.result.charts.length !== 1 ? 's' : ''}</span>
                    )}
                  </>
                )}
                {isError && (
                  <span className="text-amber-400/80">Clic en ↻ para reintentar</span>
                )}
              </p>
            </div>

            {/* Arrow indicator on hover */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <FiTrendingUp className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Progress bar for loading state */}
          {isLoading && (
            <div className="h-0.5 bg-white/[0.03] rounded-b-2xl overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '60%' }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
