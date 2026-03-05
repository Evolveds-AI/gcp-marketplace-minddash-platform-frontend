'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import AuthInput from '@/components/ui/AuthInput';
import AuthButton from '@/components/ui/AuthButton';

function ResetPasswordForm() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Token de reset no encontrado en la URL');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    setError('');
    setMessage('');

    // Validaciones
    if (!token) {
      setError('Token no válido');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token.trim(),
          newPassword 
        }),
      });

      const result = await response.json();
      
      setMessage(result.message);
      setIsSuccess(result.success);

      if (result.success) {
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }

    } catch (error) {
      console.error('Error en reset password:', error);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !token) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
            <div className="text-center space-y-4">
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Ir al login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="relative w-40 h-40">
            <Image 
              src="https://res.cloudinary.com/dwgu8k7ba/image/upload/v1747668946/Evolve_hrkhej.png" 
              alt="Logo"
              fill={true}
              className="mx-auto object-contain scale-[2.5]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://res.cloudinary.com/dwgu8k7ba/image/upload/v1747668946/placeholder_xwo927.svg";
              }}
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Nueva Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Ingresa tu nueva contraseña
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
          {!isSuccess ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <AuthInput
                label="Nueva Contraseña"
                type="password"
                id="newPassword"
                name="newPassword"
                required
                value={newPassword}
                onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                placeholder="Mínimo 8 caracteres"
              />

              <AuthInput
                label="Confirmar Contraseña"
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                placeholder="Repite la contraseña"
              />

              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <AuthButton
                type="submit"
                loading={loading}
                loadingText="Actualizando..."
              >
                Actualizar contraseña
              </AuthButton>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Volver al login
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 rounded-md text-sm">
                {message}
              </div>
              <div className="text-muted-foreground text-sm">
                Serás redirigido al login en unos segundos...
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Ir al login ahora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Cargando...</div>
    </div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}