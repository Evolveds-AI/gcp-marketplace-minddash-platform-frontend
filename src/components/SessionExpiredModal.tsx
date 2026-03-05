'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiLogOut } from '@/lib/icons';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function SessionExpiredModal() {
  const [show, setShow] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [countdown, setCountdown] = useState(5);
  const [continueError, setContinueError] = useState<string | null>(null);
  const fetchPatchedRef = useRef(false);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Interceptar errores 401 globalmente con reintento tras refresh
    if (fetchPatchedRef.current) return;
    fetchPatchedRef.current = true;
    originalFetchRef.current = window.fetch.bind(window);

    const retryMap = new Map<string, number>();

    window.fetch = async (...args) => {
      const res = await originalFetchRef.current!(...args);
      try {
        // Ignorar si estamos en login o si el endpoint es de refresh
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (url?.includes('/api/auth/refresh') || pathnameRef.current?.startsWith('/login')) {
          return res;
        }

        if (res.status !== 401) return res;

        const retryCount = retryMap.get(url) || 0;
        if (retryCount >= 1) {
          if (!show) setShow(true);
          retryMap.delete(url);
          return res;
        }

        // Intentar refresh una vez
        const raw = localStorage.getItem('evolve-auth');
        const parsed = raw ? JSON.parse(raw) : null;
        const refreshToken = parsed?.refreshToken;

        const refreshRes = await originalFetchRef.current!('/api/auth/refresh',
          refreshToken
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              }
            : {
                method: 'POST',
              }
        );

        if (!refreshRes.ok) {
          if (!show) setShow(true);
          return res;
        }

        const json = await refreshRes.json();
        if (json?.tokens?.accessToken && json?.tokens?.refreshToken) {
          const updated = {
            ...(parsed || {}),
            accessToken: json.tokens.accessToken,
            refreshToken: json.tokens.refreshToken,
            timestamp: new Date().getTime(),
          };
          localStorage.setItem('evolve-auth', JSON.stringify(updated));

          // Reintentar la solicitud original una sola vez
          retryMap.set(url, retryCount + 1);

          // Inyectar nuevo Authorization si procede
          let nextArgs = [...args] as Parameters<typeof window.fetch>;
          try {
            const token = json.tokens.accessToken;
            if (typeof nextArgs[0] === 'string') {
              const init: RequestInit = {
                ...(nextArgs[1] || {}),
                headers: {
                  ...(nextArgs[1]?.headers as Record<string, string>),
                  Authorization: `Bearer ${token}`,
                },
              };
              nextArgs = [nextArgs[0], init];
            } else {
              const req = nextArgs[0] as Request;
              const headers = new Headers(req.headers);
              headers.set('Authorization', `Bearer ${json.tokens.accessToken}`);
              nextArgs[0] = new Request(req, { headers });
            }
          } catch {}

          const retried = await originalFetchRef.current!(...nextArgs);
          return retried;
        } else {
          if (!show) setShow(true);
          return res;
        }
      } catch {
        return res;
      }
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      retryMap.clear();
      fetchPatchedRef.current = false;
      originalFetchRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('forceSessionExpired') === 'true' && !pathname?.startsWith('/login')) {
        setShow(true);
      }
    } catch {}
  }, [pathname]);

  useEffect(() => {
    if (show && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (show && countdown === 0) {
      handleLogout();
    }
  }, [show, countdown]);

  const handleLogout = () => {
    localStorage.removeItem('evolve-auth');
    localStorage.removeItem('evolve-selected-client');
    setShow(false);
    router.replace('/login?expired=true');
  };

  const handleContinue = async () => {
    setContinueError(null);
    try {
      const raw = localStorage.getItem('evolve-auth');
      const parsed = raw ? JSON.parse(raw) : null;
      const refreshToken = parsed?.refreshToken;

      const res = await fetch('/api/auth/refresh',
        refreshToken
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            }
          : {
              method: 'POST'
            }
      );
      if (!res.ok) {
        setContinueError('No se pudo renovar la sesión en este momento. Intenta nuevamente o ve al login.');
        return;
      }
      const json = await res.json();
      if (json?.tokens?.accessToken && json?.tokens?.refreshToken) {
        const updated = {
          ...(parsed || {}),
          accessToken: json.tokens.accessToken,
          refreshToken: json.tokens.refreshToken,
          timestamp: new Date().getTime()
        };
        localStorage.setItem('evolve-auth', JSON.stringify(updated));
        setShow(false);
        setCountdown(5);
      } else {
        setContinueError('Respuesta inválida al renovar sesión.');
      }
    } catch (e) {
      setContinueError('Error de red al renovar sesión.');
    }
  };

  // No mostrar la modal en la pantalla de login
  useEffect(() => {
    if (pathname?.startsWith('/login') && show) {
      setShow(false);
    }
  }, [pathname, show]);
  if (pathname?.startsWith('/login')) return null;

  return (
    <AnimatePresence>
      <Dialog open={show} onOpenChange={(open) => setShow(open)}>
        {show && (
          <DialogContent className="glass-panel border border-white/10 rounded-2xl p-0 max-w-md w-full mx-4 shadow-2xl bg-black/80 backdrop-blur-xl">
            <div className="p-8">
              {/* Icono de alerta animado */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop"
                  }}
                  className="bg-red-500/10 p-4 rounded-full border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                >
                  <FiAlertCircle className="w-16 h-16 text-red-500" />
                </motion.div>
              </div>

              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Sesión expirada</DialogTitle>
                <DialogDescription className="text-gray-400 text-center text-sm leading-relaxed">
                  Tu sesión ha expirado por inactividad. Puedes continuar trabajando o iniciar sesión nuevamente.
                </DialogDescription>
              </DialogHeader>

              {/* Contador */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-8 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3 relative z-10">
                  Redirigiendo en
                </p>
                <div className="flex justify-center relative z-10">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="text-6xl font-bold text-red-500 tabular-nums"
                    style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
                  >
                    {countdown}
                  </motion.div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleContinue} 
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm transition-all" 
                  variant="secondary"
                >
                  Continuar sesión
                </Button>
                <Button 
                  onClick={handleLogout} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]" 
                  variant="destructive"
                >
                  <FiLogOut className="w-4 h-4 mr-2" />
                  Ir al Login
                </Button>
              </div>

              {continueError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center"
                >
                  {continueError}
                </motion.div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AnimatePresence>
  );
}
