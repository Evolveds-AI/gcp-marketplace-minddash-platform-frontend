'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/ui/AuthLayout';
import AuthButton from '@/components/ui/AuthButton';
import { FiCheckCircle, FiXCircle, FiMail, FiArrowRight, FiRefreshCw } from '@/lib/icons';

type VerificationState = 'loading' | 'success' | 'error' | 'expired' | 'used';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      verifyEmailToken(token);
    } else {
      setState('error');
      setMessage('Token de verificación no encontrado');
    }
  }, [searchParams]);

  const verifyEmailToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setState('success');
        setMessage('Tu email ha sido verificado exitosamente');
      } else {
        if (data.error === 'Token expirado') {
          setState('expired');
        } else if (data.error === 'Token ya utilizado') {
          setState('used');
        } else {
          setState('error');
        }
        setMessage(data.error || 'Error al verificar el email');
        setEmail(data.email || '');
      }
    } catch (error) {
      console.error('Error verificando email:', error);
      setState('error');
      setMessage('Error de conexión');
    }
  };

  const handleResendEmail = async () => {
    if (!email) return;
    
    setResendLoading(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Email de verificación reenviado. Revisa tu bandeja de entrada.');
      } else {
        setMessage(data.error || 'Error al reenviar el email');
      }
    } catch (error) {
      console.error('Error reenviando email:', error);
      setMessage('Error de conexión');
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Verificando tu email...</h2>
            <p className="text-muted-foreground">Por favor espera mientras procesamos tu verificación</p>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">¡Email Verificado!</h2>
            <p className="text-muted-foreground mb-8">{message}</p>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-3">🎉 ¡Tu cuenta está activa!</h3>
              <div className="text-left space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Acceso completo a la plataforma</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Crear y gestionar chatbots</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Invitar miembros a tu equipo</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AuthButton
                type="button"
                onClick={() => router.push('/login')}
                icon={<FiArrowRight className="w-4 h-4" />}
              >
                Iniciar Sesión
              </AuthButton>
              <AuthButton
                type="button"
                variant="secondary"
                onClick={() => router.push('/')}
              >
                Ir al Inicio
              </AuthButton>
            </div>
          </motion.div>
        );

      case 'expired':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Token Expirado</h2>
            <p className="text-muted-foreground mb-8">{message}</p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-8">
              <p className="text-muted-foreground text-sm">
                Los enlaces de verificación expiran después de 24 horas por seguridad. 
                Puedes solicitar un nuevo enlace usando el botón de abajo.
              </p>
            </div>

            <div className="space-y-4">
              <AuthButton
                type="button"
                onClick={handleResendEmail}
                disabled={!email}
                loading={resendLoading}
                loadingText="Reenviando..."
                icon={<FiRefreshCw className="w-4 h-4" />}
              >
                Reenviar Email
              </AuthButton>
              <AuthButton
                type="button"
                variant="secondary"
                onClick={() => router.push('/login')}
              >
                Ir al Login
              </AuthButton>
            </div>
          </motion.div>
        );

      case 'used':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Ya Verificado</h2>
            <p className="text-muted-foreground mb-8">Este email ya ha sido verificado anteriormente</p>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-8">
              <p className="text-muted-foreground text-sm">
                Tu cuenta ya está activa. Puedes iniciar sesión directamente en la plataforma.
              </p>
            </div>

            <div className="space-y-4">
              <AuthButton
                type="button"
                onClick={() => router.push('/login')}
                icon={<FiArrowRight className="w-4 h-4" />}
              >
                Iniciar Sesión
              </AuthButton>
            </div>
          </motion.div>
        );

      case 'error':
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiXCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Error de Verificación</h2>
            <p className="text-muted-foreground mb-8">{message}</p>
            
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-3">¿Qué puedes hacer?</h3>
              <div className="text-left space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Verificar que el enlace esté completo</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Solicitar un nuevo email de verificación</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-muted-foreground text-sm">Contactar soporte si el problema persiste</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AuthButton
                type="button"
                onClick={() => router.push('/register')}
              >
                Registrarse Nuevamente
              </AuthButton>
              <AuthButton
                type="button"
                variant="secondary"
                onClick={() => router.push('/login')}
              >
                Ir al Login
              </AuthButton>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AuthLayout
      title="Verificación de Email"
      subtitle="Confirma tu dirección de correo electrónico"
    >
      <div className="space-y-6">
        {renderContent()}
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}