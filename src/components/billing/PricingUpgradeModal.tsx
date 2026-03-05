'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PricingSection from './PricingSection';
import { Plan, PlanLimit, BillingInterval, formatLimit, getPlanById } from '@/lib/billing/plans';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';

type LimitType = keyof PlanLimit;

const limitLabels: Record<LimitType, string> = {
  organizations: 'organizaciones',
  projects: 'proyectos',
  chatbots: 'chatbots',
  users: 'usuarios',
  messagesPerMonth: 'mensajes por mes',
};

interface PricingUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: LimitType;
  currentPlanId: string;
  currentUsage: number;
  onSelectPlan?: (plan: Plan, interval: BillingInterval) => void;
}

export default function PricingUpgradeModal({
  open,
  onOpenChange,
  limitType,
  currentPlanId,
  currentUsage,
  onSelectPlan,
}: PricingUpgradeModalProps) {
  const { applyThemeClass } = useThemeMode();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const currentPlan = getPlanById(currentPlanId);
  const currentLimit = currentPlan?.limits[limitType] ?? 0;
  const limitLabel = limitLabels[limitType];

  const handleSelectPlan = async (plan: Plan, interval: BillingInterval) => {
    if (plan.id === currentPlanId) return;
    
    setLoading(true);
    try {
      onSelectPlan?.(plan, interval);
      onOpenChange(false);
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-w-4xl max-h-[90vh] overflow-y-auto',
        applyThemeClass(
          'bg-[#111111] border-gray-800',
          'bg-white border-gray-200'
        )
      )}>
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              applyThemeClass('bg-yellow-500/20', 'bg-yellow-100')
            )}>
              <AlertTriangle className={cn(
                'w-5 h-5',
                applyThemeClass('text-yellow-400', 'text-yellow-600')
              )} />
            </div>
            <DialogTitle className={cn(
              'text-xl font-bold',
              applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)
            )}>
              Límite de {limitLabel} alcanzado
            </DialogTitle>
          </div>
          <DialogDescription className={cn(
            'text-sm',
            applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)
          )}>
            Has alcanzado el límite de <strong>{formatLimit(currentLimit)} {limitLabel}</strong> de tu plan {currentPlan?.name || 'actual'}. 
            Actualiza tu plan para continuar creando más {limitLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          'my-4 p-4 rounded-lg border',
          applyThemeClass(
            'bg-[#1a1a1a] border-gray-800',
            'bg-gray-50 border-gray-200'
          )
        )}>
          <div className="flex items-center justify-between text-sm">
            <span className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
              Uso actual de {limitLabel}:
            </span>
            <span className={cn(
              'font-semibold',
              applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)
            )}>
              {currentUsage} / {formatLimit(currentLimit)}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full transition-all"
              style={{ width: `${Math.min((currentUsage / (currentLimit || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <PricingSection
          title={false}
          description={false}
          currentPlanId={currentPlanId}
          onSelectPlan={handleSelectPlan}
          compact
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              router.push('/dashboard/admin/settings');
            }}
          >
            Ir a Facturación
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className={applyThemeClass(
              'text-gray-400 hover:text-white',
              'text-gray-500 hover:text-gray-700'
            )}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para facilitar el uso del modal
export function usePricingUpgradeModal() {
  const [modalState, setModalState] = useState<{
    open: boolean;
    limitType: LimitType;
    currentPlanId: string;
    currentUsage: number;
  }>({
    open: false,
    limitType: 'organizations',
    currentPlanId: 'free',
    currentUsage: 0,
  });

  const showUpgradeModal = (
    limitType: LimitType,
    currentPlanId: string,
    currentUsage: number
  ) => {
    setModalState({
      open: true,
      limitType,
      currentPlanId,
      currentUsage,
    });
  };

  const hideUpgradeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  return {
    modalState,
    showUpgradeModal,
    hideUpgradeModal,
    setModalOpen: (open: boolean) => setModalState((prev) => ({ ...prev, open })),
  };
}
