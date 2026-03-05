'use client';

import AuthLayout from '@/components/ui/AuthLayout';
import AuthButton from '@/components/ui/AuthButton';
import { FiCheckCircle, FiMail, FiArrowRight } from '@/lib/icons';
import { useRouter } from 'next/navigation';

export default function RegisterSuccessPage() {
  const router = useRouter();

  return (
    <AuthLayout
      title="¡Registro Exitoso!"
      subtitle="Tu organización y cuenta han sido creadas correctamente"
    >
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <FiCheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <FiMail className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirma tu Email</h3>
            <p className="text-muted-foreground text-sm">
              Hemos enviado un email de confirmación a tu dirección de correo. Revisa tu bandeja de entrada y haz
              clic en el enlace para activar tu cuenta.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Próximos Pasos</h3>
            <div className="text-left space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-muted-foreground text-sm">Confirma tu email</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-muted-foreground text-sm">Inicia sesión con tu cuenta</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-muted-foreground text-sm">Configura tu primer chatbot</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                <span className="text-muted-foreground text-sm">Invita a tu equipo</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">¿Necesitas Ayuda?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
            </p>
            <div className="space-y-2">
              <a
                href="mailto:soporte@chatbot.com"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm block"
              >
                📧 soporte@chatbot.com
              </a>
              <a
                href="/help"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm block"
              >
                📖 Centro de Ayuda
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AuthButton
            type="button"
            onClick={() => router.push('/login')}
            icon={<FiArrowRight className="w-4 h-4" />}
          >
            Ir al Login
          </AuthButton>

          <AuthButton type="button" variant="secondary" onClick={() => router.push('/')}
          >
            Volver al Inicio
          </AuthButton>
        </div>
      </div>
    </AuthLayout>
  );
}