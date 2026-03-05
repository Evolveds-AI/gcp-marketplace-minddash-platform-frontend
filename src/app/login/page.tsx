'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { availableClients } from '@/lib/utils/availableClients';
import AuthLayout from '@/components/ui/AuthLayout';
import AuthInput from '@/components/ui/AuthInput';
import AuthButton from '@/components/ui/AuthButton';

// Crear mapeo dinámico de usuarios a rutas
const userRoutes: Record<string, { path: string; gcpName?: string }> = {
  'admin': { path: '/selector' },
};

// Agregar rutas dinámicas para cada cliente
availableClients.forEach(client => {
  if (client.path && !client.path.includes('proximamente')) {
    userRoutes[client.id] = { 
      path: client.path, 
      gcpName: client.gcpName 
    };
  }
});

function LoginPageContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Leer callbackUrl directamente de searchParams (más confiable que useState)
  const callbackUrl = searchParams.get('callbackUrl');

  // Verificar parámetros en la URL y manejar auto-login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const cb = urlParams.get('callbackUrl');
    if (cb && cb.startsWith('/') && !cb.startsWith('//')) {
      try {
        sessionStorage.setItem('post-login-redirect', cb);
      } catch {
        // ignore
      }
    }

    
    if (urlParams.has('password') || urlParams.has('username')) {
      urlParams.delete('password');
      urlParams.delete('username');
      const sanitized = urlParams.toString();
      window.history.replaceState({}, document.title, sanitized ? `/login?${sanitized}` : '/login');
    }
    
    // Manejar logout
    if (urlParams.get('logout') === 'true') {
      // Limpiar localStorage al cerrar sesión
      localStorage.removeItem('evolve-auth');
      localStorage.removeItem('evolve-selected-client');
      localStorage.removeItem('chatbot-conversations');
      
      // Llamar a API de logout para limpiar sesión del servidor
      fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
      
      // Limpiar la URL sin el parámetro de cierre de sesión
      window.history.replaceState({}, document.title, '/login');
      return;
    }

    // Cargar usuario recordado si existe
    const savedUsername = localStorage.getItem('evolve-remembered-user');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      // Llamar a la API de login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let result: any;

      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Respuesta inesperada del servidor (${response.status}). Content-Type: ${contentType}. Body: ${text.slice(0, 200)}`
        );
      }

      if (!result.success) {
        setError(result.message || 'Error en el login');
        // Animar el error
        setTimeout(() => setError(''), 5000);
        return;
      }

      if (result.user && result.tokens) {
        // Guardar estado de autenticación en localStorage
        localStorage.setItem('evolve-auth', JSON.stringify({ 
          isAuthenticated: true,
          isAdmin: result.user.isAdmin,
          username: result.user.username,
          email: result.user.email,
          userId: result.user.id,
          role: result.user.role,
          clientId: result.user.clientId,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          timestamp: new Date().getTime()
        }));

        // Guardar username si "Recordarme" está marcado
        if (rememberMe) {
          localStorage.setItem('evolve-remembered-user', username);
        } else {
          localStorage.removeItem('evolve-remembered-user');
        }

        // Si no es admin, configurar cliente seleccionado
        if (!result.user.isAdmin && userRoutes[result.user.username]?.gcpName) {
          const gcpName = userRoutes[result.user.username].gcpName;
          const client = availableClients.find(client => client.gcpName === gcpName);
          if (client) {
            localStorage.setItem('evolve-selected-client', JSON.stringify(client));
          }
        }

        // Redirigir según el tipo de usuario y chatbots asignados
        const currentCallbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
        const cookieCallbackUrl = (() => {
          try {
            const m = document.cookie.match(/(?:^|; )post-login-redirect=([^;]*)/);
            if (!m) return null;
            return decodeURIComponent(m[1]);
          } catch {
            return null;
          }
        })();
        const storedCallbackUrl = (() => {
          try {
            return sessionStorage.getItem('post-login-redirect');
          } catch {
            return null;
          }
        })();

        const targetCallbackUrl = currentCallbackUrl || cookieCallbackUrl || storedCallbackUrl;
        if (targetCallbackUrl && targetCallbackUrl.startsWith('/') && !targetCallbackUrl.startsWith('//')) {
          try {
            sessionStorage.removeItem('post-login-redirect');
          } catch {
            // ignore
          }
          try {
            document.cookie = 'post-login-redirect=; Path=/; Max-Age=0; SameSite=Lax';
          } catch {
            // ignore
          }
          router.push(targetCallbackUrl);
          return;
        }

        const roleLower = (result.user.role || '').toLowerCase();
        if (result.user.isAdmin) {
          // Super admin y admin siempre van al selector principal
          router.push('/selector');
        } else if (roleLower === 'editor') {
          // Editor debe acceder al panel admin-client
          router.push('/dashboard/admin');
        } else {
          // Para usuarios normales, verificar chatbots asignados
          try {
            const chatbotsResponse = await fetch('/api/selector/chatbots', {
              headers: {
                'Authorization': `Bearer ${result.tokens.accessToken}`
              }
            });
            
            if (chatbotsResponse.ok) {
              const chatbotsData = await chatbotsResponse.json();
              const chatbots = chatbotsData.data?.chatbots || [];
              
              if (chatbots.length === 0) {
                // Sin chatbots asignados
                router.push('/no-chatbots');
              } else if (chatbots.length === 1) {
                // Un solo chatbot, redirigir directamente
                const chatbot = chatbots[0];
                if (chatbot.path && !chatbot.path.includes('proximamente')) {
                  router.push(chatbot.path);
                } else {
                  router.push('/selector');
                }
              } else {
                // Múltiples chatbots, ir al selector
                router.push('/selector');
              }
            } else {
              // Error al obtener chatbots, ir al selector por defecto
              router.push('/selector');
            }
          } catch (error) {
            // En caso de error, ir al selector por defecto
            router.push('/selector');
          }
        }
      } else {
        setError('Respuesta de login inválida. Intenta nuevamente.');
      }

    } catch (error) {
      console.error('Error en login:', error);
      setError(error instanceof Error ? error.message : 'Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bienvenido a MindDash"
      subtitle="Ingresa la cuenta para continuar"
    >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <AuthInput
                label="Usuario o Email"
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                required
                placeholder="Ingresa tu usuario o email"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <AuthInput
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
              />

              {/* Recordarme */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground cursor-pointer">
                    Recordarme
                  </label>
                </div>
                <div className="text-sm">
                  <a href="/forgot-password" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm animate-shake">
                  <div className="flex">
                    <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <AuthButton
                type="submit"
                loading={loading}
                loadingText="Iniciando sesión..."
              >
                Iniciar Sesión
              </AuthButton>
            </form>

            {/* Enlace de registro */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">¿No tienes cuenta?</span>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="/register"
                  className="w-full flex justify-center py-3 px-4 border border-border rounded-lg shadow-sm bg-secondary text-sm font-medium text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-blue-500 transition-all duration-200"
                >
                  Crear nueva cuenta
                </a>
              </div>
            </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
