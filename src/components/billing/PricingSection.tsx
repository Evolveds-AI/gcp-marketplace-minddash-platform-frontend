'use client';

import { useState } from 'react';
import { User, Users, Building2, CircleCheckBig } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PLANS, Plan, BillingInterval, getPlanPrice, getPlanPriceNote } from '@/lib/billing/plans';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';

interface PricingSectionProps {
  title?: string | false;
  description?: string | false;
  currentPlanId?: string;
  onSelectPlan?: (plan: Plan, interval: BillingInterval) => void;
  onSkip?: () => void;
  showSkip?: boolean;
  className?: string;
  compact?: boolean;
  defaultInterval?: BillingInterval;
  showIntervalToggle?: boolean;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <User className="size-4" />,
  pro: <Users className="size-4" />,
  enterprise: <Building2 className="size-4" />,
};

export default function PricingSection({
  title = 'Elige tu plan',
  description = 'Selecciona el plan que mejor se adapte a tus necesidades. Puedes cambiar en cualquier momento.',
  currentPlanId,
  onSelectPlan,
  onSkip,
  showSkip = false,
  className = '',
  compact = false,
  defaultInterval = 'month',
  showIntervalToggle = true,
}: PricingSectionProps) {
  const { applyThemeClass, isDark } = useThemeMode();
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);

  return (
    <div className={cn('w-full', className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
        {(title || description) && (
          <div className="flex flex-col items-center gap-4 px-4 text-center">
            {title && (
              <h2 className={cn(
                'text-2xl leading-tight font-semibold sm:text-3xl',
                applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)
              )}>
                {title}
              </h2>
            )}
            {description && (
              <p className={cn(
                'text-sm max-w-[600px] font-medium sm:text-base',
                applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)
              )}>
                {description}
              </p>
            )}
          </div>
        )}

        {showIntervalToggle && (
          <div className={cn(
            'flex items-center gap-3 rounded-full p-1',
            applyThemeClass('bg-[#1a1a1a] border border-gray-800', 'bg-gray-100 border border-gray-200')
          )}>
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                interval === 'month'
                  ? applyThemeClass('bg-white/10 text-white', 'bg-white text-gray-900 shadow-sm')
                  : applyThemeClass('text-gray-400 hover:text-gray-300', 'text-gray-500 hover:text-gray-700')
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5',
                interval === 'year'
                  ? applyThemeClass('bg-white/10 text-white', 'bg-white text-gray-900 shadow-sm')
                  : applyThemeClass('text-gray-400 hover:text-gray-300', 'text-gray-500 hover:text-gray-700')
              )}
            >
              Anual
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                interval === 'year'
                  ? 'bg-green-500/20 text-green-400'
                  : applyThemeClass('bg-green-500/10 text-green-500', 'bg-green-100 text-green-700')
              )}>
                -20%
              </span>
            </button>
          </div>
        )}

        <div className={cn(
          'w-full grid',
          compact ? 'grid-cols-1 sm:grid-cols-3 gap-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        )}>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlanId === plan.id}
              onSelect={() => onSelectPlan?.(plan, interval)}
              icon={planIcons[plan.id]}
              compact={compact}
              interval={interval}
            />
          ))}
        </div>

        {showSkip && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className={cn(
              'mt-2 text-sm',
              applyThemeClass(
                'text-gray-400 hover:text-white hover:bg-white/5',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )
            )}
          >
            Continuar con plan Free
          </Button>
        )}
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
  interval?: BillingInterval;
}

function PlanCard({ plan, isCurrentPlan, onSelect, icon, compact, interval = 'month' }: PlanCardProps) {
  const { applyThemeClass, isDark } = useThemeMode();

  const getVariantClasses = () => {
    if (plan.variant === 'glow-brand') {
      return cn(
        'relative overflow-hidden',
        applyThemeClass(
          'bg-gradient-to-b from-green-900/40 to-[#1f1f1f] border-green-500/50',
          'bg-gradient-to-b from-green-50 to-white border-green-300'
        ),
        'after:content-[""] after:absolute after:-top-[80px] after:left-1/2 after:h-[80px] after:w-full after:-translate-x-1/2 after:rounded-[50%] after:blur-[48px]',
        isDark ? 'after:bg-green-500/30' : 'after:bg-green-300/50'
      );
    }
    if (plan.variant === 'glow') {
      return cn(
        'relative overflow-hidden',
        applyThemeClass(
          'bg-gradient-to-b from-blue-900/30 to-[#1f1f1f] border-blue-500/40',
          'bg-gradient-to-b from-blue-50 to-white border-blue-300'
        ),
        'after:content-[""] after:absolute after:-top-[80px] after:left-1/2 after:h-[80px] after:w-full after:-translate-x-1/2 after:rounded-[50%] after:blur-[48px]',
        isDark ? 'after:bg-blue-500/20' : 'after:bg-blue-300/40'
      );
    }
    return applyThemeClass(
      'bg-[#1f1f1f] border-gray-700',
      'bg-white border-gray-200'
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border shadow-lg transition-all duration-200',
        compact ? 'gap-3 p-4' : 'gap-4 p-5',
        getVariantClasses(),
        isCurrentPlan && 'ring-2 ring-green-500',
        plan.recommended && !isCurrentPlan && 'ring-1 ring-green-400/50'
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h3 className={cn(
            'flex items-center gap-1.5 font-bold',
            compact ? 'text-base' : 'text-lg',
            applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)
          )}>
            {icon && (
              <span className={applyThemeClass('text-gray-400', 'text-gray-500')}>
                {icon}
              </span>
            )}
            {plan.name}
          </h3>
          {plan.recommended && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              Recomendado
            </span>
          )}
          {isCurrentPlan && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              Plan actual
            </span>
          )}
        </div>
        <p className={cn(
          compact ? 'text-xs' : 'text-sm',
          applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)
        )}>
          {plan.description}
        </p>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-0.5">
        <span className={cn(
          'font-bold',
          compact ? 'text-base' : 'text-xl',
          applyThemeClass('text-gray-400', 'text-gray-500')
        )}>
          $
        </span>
        <span className={cn(
          'font-bold',
          compact ? 'text-3xl' : 'text-4xl',
          applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)
        )}>
          {getPlanPrice(plan, interval)}
        </span>
        {getPlanPrice(plan, interval) > 0 && (
          <span className={cn(
            'ml-0.5',
            compact ? 'text-xs' : 'text-sm',
            applyThemeClass('text-gray-500', 'text-gray-400')
          )}>
            /mes
          </span>
        )}
        {interval === 'year' && plan.price > 0 && plan.annualPrice < plan.price && (
          <span className={cn(
            'ml-1 line-through',
            compact ? 'text-xs' : 'text-sm',
            applyThemeClass('text-gray-600', 'text-gray-400')
          )}>
            ${plan.price}
          </span>
        )}
      </div>

      <p className={cn(
        compact ? 'text-[10px]' : 'text-xs',
        applyThemeClass('text-gray-500', 'text-gray-400')
      )}>
        {getPlanPriceNote(plan, interval)}
      </p>

      {/* CTA Button */}
      <Button
        onClick={onSelect}
        disabled={isCurrentPlan}
        size={compact ? 'sm' : 'default'}
        className={cn(
          'w-full',
          compact && 'text-xs h-8',
          plan.variant === 'glow-brand'
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : plan.variant === 'glow'
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : applyThemeClass(
                'bg-gray-700 hover:bg-gray-600 text-white',
                'bg-gray-100 hover:bg-gray-200 text-gray-900'
              ),
          isCurrentPlan && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isCurrentPlan
          ? 'Plan actual'
          : plan.price === 0
          ? 'Comenzar gratis'
          : plan.id === 'enterprise'
          ? 'Contactar ventas'
          : 'Suscribirse'}
      </Button>

      <hr className={applyThemeClass('border-gray-700', 'border-gray-200')} />

      {/* Features - always visible */}
      <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-2')}>
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={cn(
              'flex items-center gap-2',
              compact ? 'text-xs' : 'text-sm',
              applyThemeClass('text-gray-300', LIGHT_THEME_CLASSES.TEXT_SECONDARY)
            )}
          >
            <CircleCheckBig className={cn(
              'shrink-0',
              compact ? 'size-3' : 'size-4',
              plan.variant === 'glow-brand' ? 'text-green-400' :
              plan.variant === 'glow' ? 'text-blue-400' :
              applyThemeClass('text-gray-500', 'text-gray-400')
            )} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { PlanCard };
