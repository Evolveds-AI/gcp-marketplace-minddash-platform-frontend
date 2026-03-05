'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import AuthLayout from '@/components/ui/AuthLayout';
import AuthInput from '@/components/ui/AuthInput';
import AuthButton from '@/components/ui/AuthButton';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();
      
      setMessage(result.message);
      setIsSuccess(result.success);

      if (result.success) {
        // Limpiar el campo de email después del éxito
        setEmail('');
      }

    } catch (error) {
      console.error('Error en forgot password:', error);
      setMessage('Error de conexión. Intenta nuevamente.');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar Contraseña" subtitle="Te enviaremos instrucciones a tu email">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        {!isSuccess ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <AuthInput
              label="Email"
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="tu@email.com"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            {message && !isSuccess && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                <div className="flex">
                  <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <AuthButton type="submit" loading={loading} loadingText="Enviando...">
              Enviar instrucciones
            </AuthButton>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center mx-auto"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al login
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-center justify-center">
                <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{message}</span>
              </div>
            </div>
            <div className="text-muted-foreground text-sm">Revisa tu bandeja de entrada y la carpeta de spam.</div>
            <AuthButton type="button" onClick={() => router.push('/login')}>
              Volver al login
            </AuthButton>
          </div>
        )}
      </motion.div>
    </AuthLayout>
  );
} 