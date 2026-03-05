'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Demasiado caro' },
  { id: 'not_using', label: 'No uso lo suficiente' },
  { id: 'missing_features', label: 'Faltan funcionalidades' },
  { id: 'switching', label: 'Cambio a otra plataforma' },
  { id: 'temporary', label: 'Pausa temporal' },
  { id: 'other', label: 'Otro motivo' },
];

interface CancellationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanName: string;
  onConfirmCancel: (reason: string, feedback: string) => Promise<void>;
  loading: boolean;
}

export default function CancellationModal({
  open,
  onOpenChange,
  currentPlanName,
  onConfirmCancel,
  loading,
}: CancellationModalProps) {
  const { applyThemeClass } = useThemeMode();
  const [step, setStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  const handleClose = () => {
    setStep('reason');
    setSelectedReason('');
    setFeedback('');
    onOpenChange(false);
  };

  const handleNextFromReason = () => {
    if (!selectedReason) return;
    // Show retention offer for price-sensitive reasons
    if (selectedReason === 'too_expensive' || selectedReason === 'temporary') {
      setStep('offer');
    } else {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    await onConfirmCancel(selectedReason, feedback);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        'max-w-md',
        applyThemeClass('bg-[#111111] border-gray-800', 'bg-white border-gray-200')
      )}>
        {step === 'reason' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-full', applyThemeClass('bg-red-500/20', 'bg-red-100'))}>
                  <AlertTriangle className={cn('w-5 h-5', applyThemeClass('text-red-400', 'text-red-600'))} />
                </div>
                <DialogTitle className={applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}>
                  Cancelar suscripción
                </DialogTitle>
              </div>
              <DialogDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                Lamentamos que quieras cancelar tu plan {currentPlanName}. Nos ayudaría saber el motivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 mt-4">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setSelectedReason(reason.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                    selectedReason === reason.id
                      ? applyThemeClass(
                          'border-red-500/50 bg-red-500/10 text-white',
                          'border-red-300 bg-red-50 text-gray-900'
                        )
                      : applyThemeClass(
                          'border-gray-800 bg-[#1a1a1a] text-gray-300 hover:border-gray-700',
                          'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        )
                  )}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 mt-3">
              <Label className={cn('text-xs', applyThemeClass('text-gray-500', 'text-gray-400'))}>
                Comentarios adicionales (opcional)
              </Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="¿Qué podemos mejorar?"
                rows={3}
                className={cn('text-sm resize-none', applyThemeClass('bg-[#1a1a1a] border-gray-800 text-white', LIGHT_THEME_CLASSES.INPUT))}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Volver
              </Button>
              <Button
                onClick={handleNextFromReason}
                disabled={!selectedReason}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
              >
                Continuar
              </Button>
            </div>
          </>
        )}

        {step === 'offer' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-full', applyThemeClass('bg-green-500/20', 'bg-green-100'))}>
                  <Gift className={cn('w-5 h-5', applyThemeClass('text-green-400', 'text-green-600'))} />
                </div>
                <DialogTitle className={applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}>
                  ¡Espera! Tenemos una oferta
                </DialogTitle>
              </div>
              <DialogDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                Antes de irte, queremos ofrecerte algo especial.
              </DialogDescription>
            </DialogHeader>

            <div className={cn(
              'mt-4 p-5 rounded-xl border text-center space-y-3',
              applyThemeClass('bg-green-500/5 border-green-500/20', 'bg-green-50 border-green-200')
            )}>
              <p className={cn('text-2xl font-bold', applyThemeClass('text-green-400', 'text-green-700'))}>
                20% OFF
              </p>
              <p className={cn('text-sm', applyThemeClass('text-gray-300', 'text-gray-600'))}>
                Cambia a facturación anual y obtén un <strong>20% de descuento</strong> en tu plan actual. Sin compromiso adicional.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-500 text-white"
              >
                Cambiar a plan anual (-20%)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('confirm')}
                className={applyThemeClass('text-gray-500 hover:text-gray-300', 'text-gray-400 hover:text-gray-600')}
              >
                No gracias, continuar cancelación
              </Button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-full', applyThemeClass('bg-red-500/20', 'bg-red-100'))}>
                  <AlertTriangle className={cn('w-5 h-5', applyThemeClass('text-red-400', 'text-red-600'))} />
                </div>
                <DialogTitle className={applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}>
                  Confirmar cancelación
                </DialogTitle>
              </div>
              <DialogDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                ¿Estás seguro? Al cancelar:
              </DialogDescription>
            </DialogHeader>

            <div className={cn(
              'mt-3 p-4 rounded-lg border space-y-2',
              applyThemeClass('bg-red-500/5 border-red-500/20', 'bg-red-50 border-red-200')
            )}>
              <ul className={cn('text-sm space-y-1.5 list-disc list-inside', applyThemeClass('text-gray-300', 'text-gray-600'))}>
                <li>Tu plan pasará a <strong>Free</strong> al final del período actual</li>
                <li>Perderás acceso a funcionalidades premium</li>
                <li>Los límites se reducirán a los del plan gratuito</li>
                <li>Tus datos se conservarán, pero el excedente quedará en solo lectura</li>
              </ul>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Mantener plan
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelando…</> : 'Confirmar cancelación'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
