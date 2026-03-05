'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import AuthLayout from '@/components/ui/AuthLayout';
import AuthInput from '@/components/ui/AuthInput';
import AuthButton from '@/components/ui/AuthButton';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheck, FiCreditCard } from '@/lib/icons';
import { IconMappings } from '@/lib/icons';
import PricingSection from '@/components/billing/PricingSection';
import { Plan, BillingInterval, getDefaultPlan, getPlanPrice } from '@/lib/billing/plans';
import { useMercadoPagoCheckout } from '@/hooks/useMercadoPagoCheckout';

interface FormData {
  // Datos del cliente
  clientName: string;
  clientDescription: string;
  
  // Datos del usuario admin
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Términos y condiciones
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

interface FormErrors {
  clientName?: string;
  clientDescription?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  acceptPrivacy?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    clientDescription: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Cliente, 2: Usuario, 3: Plan, 4: Confirmación
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(getDefaultPlan());
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('month');
  const { redirectToCheckout, loading: checkoutLoading, error: checkoutError } = useMercadoPagoCheckout();

  const getPasswordMetrics = (password: string) => {
    const value = password || '';
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    const length8 = value.length >= 8;
    const length6 = value.length >= 6;

    const score = [length8, hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    const label = score <= 1 ? 'Débil' : score <= 3 ? 'Media' : 'Fuerte';
    const colorClass = score <= 1 ? 'bg-red-500' : score <= 3 ? 'bg-yellow-500' : 'bg-green-500';

    return {
      length6,
      length8,
      hasLower,
      hasUpper,
      hasNumber,
      hasSymbol,
      score,
      label,
      colorClass,
    };
  };

  const stepVariants = {
    enter: (dir: 1 | -1) => ({
      opacity: 0,
      x: dir > 0 ? 24 : -24
    }),
    center: {
      opacity: 1,
      x: 0
    },
    exit: (dir: 1 | -1) => ({
      opacity: 0,
      x: dir > 0 ? -24 : 24
    })
  };

  const validateStep1 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'El nombre del cliente es requerido';
    } else if (formData.clientName.length < 3) {
      newErrors.clientName = 'El nombre debe tener al menos 3 caracteres';
    }
    
    const descriptionTrimmed = formData.clientDescription.trim();

    if (descriptionTrimmed && descriptionTrimmed.length < 10) {
      newErrors.clientDescription = 'La descripción debe tener al menos 10 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El usuario debe tener al menos 3 caracteres';
    } else {
      const usernameRegex = /^[a-zA-Z0-9._-]+$/;
      if (!usernameRegex.test(formData.username)) {
        newErrors.username = 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios).';
      }
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
    }
    
    if (!formData.acceptPrivacy) {
      newErrors.acceptPrivacy = 'Debes aceptar las políticas de privacidad';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'password') {
      if (formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: value !== formData.confirmPassword ? 'Las contraseñas no coinciden' : undefined
        }));
      }
    }

    if (name === 'confirmPassword') {
      setErrors(prev => ({
        ...prev,
        confirmPassword: value !== formData.password ? 'Las contraseñas no coinciden' : undefined
      }));
    }
    
    if (name === 'username') {
      const usernameRegex = /^[a-zA-Z0-9._-]+$/;

      setErrors(prev => ({
        ...prev,
        username: value && !usernameRegex.test(value)
          ? 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios).'
          : undefined
      }));
      return;
    }
    
    if (name === 'clientDescription') {
      const descriptionTrimmed = value.trim();

      setErrors(prev => ({
        ...prev,
        clientDescription: descriptionTrimmed && descriptionTrimmed.length < 10
          ? 'La descripción debe tener al menos 10 caracteres'
          : undefined
      }));
      return;
    }
    
    // Limpiar error al escribir
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'clientName') {
      const trimmed = value.trim();

      if (!trimmed) {
        setErrors(prev => ({ ...prev, clientName: 'El nombre del cliente es requerido' }));
      } else if (trimmed.length < 3) {
        setErrors(prev => ({ ...prev, clientName: 'El nombre debe tener al menos 3 caracteres' }));
      } else {
        setErrors(prev => ({ ...prev, clientName: undefined }));
      }
      return;
    }

    if (name === 'clientDescription') {
      const descriptionTrimmed = value.trim();

      setErrors(prev => ({
        ...prev,
        clientDescription: descriptionTrimmed && descriptionTrimmed.length < 10
          ? 'La descripción debe tener al menos 10 caracteres'
          : undefined
      }));
      return;
    }

    if (name === 'username') {
      const trimmed = value.trim();

      if (!trimmed) {
        setErrors(prev => ({ ...prev, username: 'El nombre de usuario es requerido' }));
      } else if (trimmed.length < 3) {
        setErrors(prev => ({ ...prev, username: 'El usuario debe tener al menos 3 caracteres' }));
      } else {
        const usernameRegex = /^[a-zA-Z0-9._-]+$/;
        setErrors(prev => ({
          ...prev,
          username: !usernameRegex.test(trimmed)
            ? 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios).'
            : undefined
        }));
      }
      return;
    }

    if (name === 'email') {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, email: 'El email es requerido' }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErrors(prev => ({ ...prev, email: 'El email no es válido' }));
      }
      return;
    }

    if (name === 'password') {
      if (!value) {
        setErrors(prev => ({ ...prev, password: 'La contraseña es requerida' }));
      } else if (value.length < 8) {
        setErrors(prev => ({ ...prev, password: 'La contraseña debe tener al menos 8 caracteres' }));
      }
      return;
    }

    if (name === 'confirmPassword') {
      if (!value) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Confirma tu contraseña' }));
      } else if (value !== formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }));
      }
      return;
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setDirection(1);
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setDirection(1);
      setStep(3);
    } else if (step === 3) {
      setDirection(1);
      setStep(4);
    }
  };

  const handleSelectPlan = (plan: Plan, interval: BillingInterval) => {
    setSelectedPlan(plan);
    setSelectedInterval(interval);
  };

  const handleSkipPlan = () => {
    setSelectedPlan(getDefaultPlan());
    setDirection(1);
    setStep(4);
  };

  const handlePrevStep = () => {
    setDirection(-1);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    
    try {
      // 1. Register the user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          selectedPlanId: selectedPlan.id,
          selectedInterval,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        setErrors({ email: error.message || error.error || 'Error al registrar' });
        return;
      }

      const registerResult = await response.json();

      // 2. Auto-login to get auth tokens (needed for checkout and session)
      try {
        const loginResp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        if (loginResp.ok) {
          const loginResult = await loginResp.json();
          if (loginResult.success && loginResult.tokens) {
            localStorage.setItem('evolve-auth', JSON.stringify({
              isAuthenticated: true,
              isAdmin: loginResult.user?.isAdmin || false,
              username: loginResult.user?.username || formData.username,
              email: loginResult.user?.email || formData.email,
              userId: loginResult.user?.id || '',
              role: loginResult.user?.role || 'admin',
              clientId: loginResult.user?.clientId || '',
              accessToken: loginResult.tokens.accessToken,
              refreshToken: loginResult.tokens.refreshToken,
              timestamp: new Date().getTime(),
            }));
          }
        }
      } catch (loginErr) {
        console.warn('Auto-login after register failed (non-blocking):', loginErr);
      }

      // 3. If paid plan, redirect to MercadoPago checkout
      const price = getPlanPrice(selectedPlan, selectedInterval);
      if (price > 0) {
        const redirectUrl = await redirectToCheckout({
          plan: selectedPlan,
          interval: selectedInterval,
          billingEmail: formData.email,
        });
        if (redirectUrl) return; // Will redirect to MercadoPago
        // If checkout failed, still go to success (plan activation pending)
      }

      router.push('/register/success');
    } catch (error) {
      console.error('Error de registro:', error);
      setErrors({ email: 'Error de conexión' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-900/30 rounded-full mx-auto mb-3">
          <IconMappings.Building className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Información del Cliente</h2>
        <p className="text-gray-400 text-sm">Cuéntanos sobre tu organización</p>
      </div>

      <div className="space-y-4">
        <AuthInput
          label="Nombre del Cliente"
          type="text"
          name="clientName"
          value={formData.clientName}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Ingresa el nombre de tu organización"
          required
          error={errors.clientName}
          icon={<IconMappings.Building className="h-5 w-5" />}
        />

        <AuthInput
          label="Descripción (opcional)"
          type="textarea"
          name="clientDescription"
          value={formData.clientDescription}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Describe brevemente tu organización y sector..."
          error={errors.clientDescription}
          rows={4}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center mb-3">
          <div className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <FiUser className="w-5 h-5 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Cuenta de Administrador</h2>
        <p className="text-gray-400 text-sm">Crea tu cuenta de administrador</p>
      </div>

      <div className="space-y-3">
        <AuthInput
          label="Nombre de Usuario"
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Tu nombre de usuario"
          required
          error={errors.username}
          icon={<FiUser className="w-5 h-5" />}
        />

        <AuthInput
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="tu@organizacion.com"
          required
          error={errors.email}
          icon={<FiMail className="w-5 h-5" />}
        />

        <AuthInput
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Tu contraseña"
          required
          error={errors.password}
          icon={<FiLock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          }
        />

        {(() => {
          const m = getPasswordMetrics(formData.password);
          const widthPct = Math.min((m.score / 5) * 100, 100);
          const itemClass = (ok: boolean) => ok ? 'text-green-400' : 'text-gray-500';
          return (
            <div className="-mt-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Seguridad de contraseña</span>
                <span className={m.score <= 1 ? 'text-red-400' : m.score <= 3 ? 'text-yellow-400' : 'text-green-400'}>
                  {m.label}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${m.colorClass} transition-all`} style={{ width: `${widthPct}%` }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className={itemClass(m.length8)}>• 8+ caracteres (recomendado)</span>
                <span className={itemClass(m.hasNumber)}>• 1 número</span>
                <span className={itemClass(m.hasUpper)}>• 1 mayúscula</span>
                <span className={itemClass(m.hasLower)}>• 1 minúscula</span>
              </div>
            </div>
          );
        })()}

        <AuthInput
          label="Confirmar Contraseña"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="Confirma tu contraseña"
          required
          error={errors.confirmPassword}
          icon={<FiLock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          }
        />

        <div className="space-y-4 pt-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="text-gray-500 dark:text-gray-300">
                Acepto los{' '}
                <a href="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400 underline">
                  términos y condiciones
                </a>
              </label>
            </div>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.acceptTerms}</p>
          )}

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="acceptPrivacy"
                name="acceptPrivacy"
                checked={formData.acceptPrivacy}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptPrivacy" className="text-gray-500 dark:text-gray-300">
                Acepto las{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400 underline">
                  políticas de privacidad
                </a>
              </label>
            </div>
          </div>
          {errors.acceptPrivacy && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.acceptPrivacy}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-3">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2.5 bg-gradient-to-r from-green-500 to-blue-600 rounded-full">
            <FiCreditCard className="w-5 h-5 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Elige tu Plan</h2>
        <p className="text-gray-400 text-sm">Selecciona el plan que mejor se adapte a tus necesidades</p>
      </div>

      <PricingSection
        title={false}
        description={false}
        currentPlanId={selectedPlan.id}
        onSelectPlan={handleSelectPlan}
        onSkip={handleSkipPlan}
        showSkip
        compact
      />

      {selectedPlan && (
        <div className="p-3 rounded-lg bg-green-900/20 border border-green-700">
          <p className="text-xs text-green-400 text-center">
            Plan seleccionado: <strong>{selectedPlan.name}</strong>
            {getPlanPrice(selectedPlan, selectedInterval) === 0
              ? ' (Gratis)'
              : ` ($${getPlanPrice(selectedPlan, selectedInterval)}/mes${selectedInterval === 'year' ? ' — facturado anualmente' : ''})`}
          </p>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-3">
      <div className="text-center mb-3">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2.5 bg-gradient-to-r from-green-500 to-blue-600 rounded-full">
            <FiCheck className="w-5 h-5 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Confirmar Registro</h2>
        <p className="text-gray-400 text-sm">Revisa tu información antes de crear la cuenta</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="p-1.5 bg-blue-900 rounded">
              <IconMappings.Building className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="ml-2 text-sm font-semibold text-white">Cliente</h3>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Nombre</p>
            <p className="text-sm text-white truncate">{formData.clientName}</p>
          </div>
        </div>

        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="p-1.5 bg-purple-900 rounded">
              <FiUser className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="ml-2 text-sm font-semibold text-white">Cuenta</h3>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Usuario</p>
            <p className="text-sm text-white truncate">{formData.username}</p>
            <p className="text-xs text-gray-400 mt-1">Email</p>
            <p className="text-sm text-white truncate">{formData.email}</p>
          </div>
        </div>

        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="p-1.5 bg-green-900 rounded">
              <FiCreditCard className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="ml-2 text-sm font-semibold text-white">Plan</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-white font-medium">{selectedPlan.name}</p>
            <p className="text-xs text-gray-400">
              {getPlanPrice(selectedPlan, selectedInterval) === 0
                ? 'Gratis'
                : `$${getPlanPrice(selectedPlan, selectedInterval)}/mes${selectedInterval === 'year' ? ' (anual)' : ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 text-xs text-blue-400 rounded-lg bg-blue-900/20 border border-blue-800">
        <div className="flex items-center mb-2">
          <FiCheck className="w-4 h-4 mr-1.5" />
          <span className="font-medium">Próximos pasos</span>
        </div>
        <ul className="space-y-0.5 list-disc list-inside text-blue-300">
          <li>Recibirás un email de confirmación</li>
          <li>Tendrás acceso completo al sistema</li>
          {getPlanPrice(selectedPlan, selectedInterval) > 0 && <li>Serás redirigido a Mercado Pago para completar el pago</li>}
        </ul>
      </div>

      {checkoutError && (
        <div className="p-3 text-xs text-red-400 rounded-lg bg-red-900/20 border border-red-800">
          <p className="font-medium">Error en el proceso de pago:</p>
          <p className="mt-1">{checkoutError}</p>
        </div>
      )}
    </div>
  );

  return (
    <AuthLayout
      title="Crear Cuenta"
      subtitle="Únete a nuestra plataforma de chatbots"
      wideContent={step === 3 || step === 4}
    >
      {/* Progress indicator with step names - improved UI */}
      <div className="relative flex justify-between mb-8 mt-4 px-4">
        {/* Connecting lines (behind circles) */}
        <div className="absolute top-4 left-0 right-0 flex px-4">
          {[1, 2, 3].map((lineIdx) => (
            <div key={lineIdx} className="flex-1 flex items-center px-6">
              <motion.div 
                className="h-0.5 w-full rounded-full bg-gray-700 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: step > lineIdx ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </motion.div>
            </div>
          ))}
        </div>

        {/* Step circles */}
        {[
          { num: 1, name: 'Cliente' },
          { num: 2, name: 'Cuenta' },
          { num: 3, name: 'Plan' },
          { num: 4, name: 'Confirmar' },
        ].map((s) => {
          const isClickable = s.num < step; // Can only go back to completed steps
          return (
            <div key={s.num} className="flex flex-col items-center z-10">
              <motion.button
                type="button"
                onClick={() => {
                  if (isClickable) {
                    setDirection(-1);
                    setStep(s.num);
                  }
                }}
                disabled={!isClickable}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold border-2 transition-colors ${
                  step > s.num 
                    ? 'bg-blue-600 border-blue-600 text-white cursor-pointer hover:bg-blue-500 hover:border-blue-500' 
                    : step === s.num
                      ? 'bg-blue-600 border-blue-600 text-white cursor-default'
                      : 'bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                initial={false}
                animate={step > s.num ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {step > s.num ? (
                  <motion.svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <motion.path
                      d="M5 13l4 4L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.svg>
                ) : (
                  s.num
                )}
              </motion.button>
              <span className={`mt-2 text-[10px] font-medium transition-colors ${
                step >= s.num ? 'text-blue-400' : 'text-gray-500'
              }`}>
                {s.name}
              </span>
            </div>
          );
        })}
      </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <div className="sm:w-1/2">
                <AuthButton
                  type="button"
                  variant="secondary"
                  onClick={handlePrevStep}
                  disabled={step === 1}
                >
                  Anterior
                </AuthButton>
              </div>

              <div className="sm:w-1/2">
                {step < 4 ? (
                  <AuthButton
                    type="button"
                    onClick={handleNextStep}
                  >
                    {step === 3 ? 'Continuar' : 'Siguiente'}
                  </AuthButton>
                ) : (
                  <AuthButton
                    type="submit"
                    loading={loading}
                    loadingText="Registrando..."
                  >
                    Crear Cuenta
                  </AuthButton>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ¿Ya tienes una cuenta?{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400">
                Inicia sesión
              </a>
            </p>
          </div>
    </AuthLayout>
  );
}