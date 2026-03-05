'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Zap, ArrowUpCircle, Calendar, AlertCircle,
  Building2, FolderKanban, Bot, Users, MessageSquare,
  FileText, ExternalLink, Download, XCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useConfirm } from '@/components/ui/confirm-dialog';
import PricingSection from './PricingSection';
import CancellationModal from './CancellationModal';
import {
  Plan, BillingInterval, PLANS, getPlanById, getPlanPrice,
  formatLimit, matchBackendPlan,
} from '@/lib/billing/plans';
import { useMercadoPagoCheckout } from '@/hooks/useMercadoPagoCheckout';
import { MercadoPagoIcon } from '@/components/icons/MercadoPagoLogo';

interface BillingOrg {
  id: string;
  name: string;
}

interface BillingOrgStats {
  totalOrganizations: number;
  totalProjects: number;
  totalChatbots: number;
  totalUsers: number;
  totalMessagesThisMonth: number;
}

interface BillingSettings {
  currentPlan: string;
  billingEmail: string;
  autoRenewal: boolean;
  paymentMethod: string;
}

interface BillingStatusMeta {
  orgPlanId: string | null;
  planId: string | null;
  planName: string | null;
}

interface BillingTabProps {
  billingSettings: BillingSettings;
  setBillingSettings: React.Dispatch<React.SetStateAction<BillingSettings>>;
  billingOrganizations: BillingOrg[];
  selectedBillingOrgId: string;
  setSelectedBillingOrgId: (id: string) => void;
  billingOrgStats: BillingOrgStats | null;
  billingStatusLoading: boolean;
  billingStatusError: string | null;
  billingStatusMeta: BillingStatusMeta;
  upgradeLoading: boolean;
  setUpgradeLoading: (v: boolean) => void;
  loadBillingStatus: (orgId: string) => Promise<void>;
  handleSaveSettings: (section: string) => Promise<void>;
  hasBillingChanges: boolean;
  handleResetSection: (section: string) => void;
  saving: boolean;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function BillingTab({
  billingSettings,
  setBillingSettings,
  billingOrganizations,
  selectedBillingOrgId,
  setSelectedBillingOrgId,
  billingOrgStats,
  billingStatusLoading,
  billingStatusError,
  billingStatusMeta,
  upgradeLoading,
  setUpgradeLoading,
  loadBillingStatus,
  handleSaveSettings,
  hasBillingChanges,
  handleResetSection,
  saving,
  notify,
}: BillingTabProps) {
  const { applyThemeClass } = useThemeMode();
  const { confirm, ConfirmDialog } = useConfirm();
  const { redirectToCheckout, loading: checkoutLoading, error: checkoutError } = useMercadoPagoCheckout();

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const currentPlan = getPlanById(billingSettings.currentPlan);

  // --- Upgrade Flow ---
  const applyOrgPlanUpgrade = async (plan: Plan, interval: BillingInterval = 'month') => {
    const orgId = selectedBillingOrgId;
    if (!orgId) {
      notify('error', 'Selecciona una organización para cambiar el plan.');
      return;
    }

    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      notify('error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }
    const auth = JSON.parse(authData);

    try {
      setUpgradeLoading(true);

      const price = getPlanPrice(plan, interval);
      if (price > 0) {
        try {
          const url = await redirectToCheckout({
            plan,
            interval,
            billingEmail: billingSettings.billingEmail || auth.email || '',
          });
          if (url) return; // Redirecting to MercadoPago
        } catch (checkoutErr: any) {
          // Error already stored in checkoutError state via hook
        }
        notify('error', 'No se pudo iniciar el proceso de pago. Verifica la configuración de MercadoPago.');
        return;
      }

      // Free plan (downgrade) — assign directly
      const plansResp = await fetch('/api/backend/billing/plans', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const plansJson = await plansResp.json();
      const backendPlans = Array.isArray(plansJson?.data) ? plansJson.data : [];
      const matchedBackendPlan = matchBackendPlan(backendPlans, plan);

      if (!matchedBackendPlan?.id) {
        notify('error', 'No se encontró el plan en el backend.');
        return;
      }

      const existingOrgPlanId = billingStatusMeta.orgPlanId;
      let assignJson: any = null;
      if (existingOrgPlanId) {
        const resp = await fetch('/api/backend/billing/org-plan', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingOrgPlanId, id_plan: matchedBackendPlan.id, id_organization: orgId }),
        });
        assignJson = await resp.json();
      } else {
        const resp = await fetch('/api/backend/billing/org-plan', {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_plan: matchedBackendPlan.id, id_organization: orgId }),
        });
        assignJson = await resp.json();
      }

      if (!assignJson?.success) {
        notify('error', assignJson?.message || 'No se pudo actualizar el plan.');
        return;
      }

      setBillingSettings((prev) => ({ ...prev, currentPlan: plan.id }));
      setShowPricingModal(false);
      notify('success', `Plan actualizado a ${plan.name}.`);
      await handleSaveSettings('billing');
      await loadBillingStatus(orgId);
    } catch (e: any) {
      notify('error', e?.message || 'Error al actualizar el plan.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  // --- Cancellation Flow ---
  const handleCancelPlan = async (reason: string, feedback: string) => {
    try {
      setUpgradeLoading(true);
      const freePlan = getPlanById('free');
      if (freePlan) {
        await applyOrgPlanUpgrade(freePlan, 'month');
      }
      console.log('[Billing] Cancellation reason:', reason, 'Feedback:', feedback);
      notify('info', 'Tu plan ha sido cambiado a Free.');
    } catch (e: any) {
      notify('error', e?.message || 'Error al cancelar.');
    } finally {
      setUpgradeLoading(false);
      setShowCancellationModal(false);
    }
  };

  // --- Usage data ---
  const plan = currentPlan;
  const stats = billingOrgStats;

  const usageItems = [
    { key: 'organizations' as const, label: 'Organizaciones', icon: Building2, color: 'text-purple-400', bgColor: 'bg-purple-500' },
    { key: 'projects' as const, label: 'Proyectos', icon: FolderKanban, color: 'text-blue-400', bgColor: 'bg-blue-500' },
    { key: 'chatbots' as const, label: 'Chatbots', icon: Bot, color: 'text-green-400', bgColor: 'bg-green-500' },
    { key: 'users' as const, label: 'Usuarios', icon: Users, color: 'text-orange-400', bgColor: 'bg-orange-500' },
    { key: 'messagesPerMonth' as const, label: 'Mensajes/mes', icon: MessageSquare, color: 'text-cyan-400', bgColor: 'bg-cyan-500' },
  ];

  const getUsageValue = (key: string): number => {
    if (!stats) return 0;
    const map: Record<string, number> = {
      organizations: stats.totalOrganizations,
      projects: stats.totalProjects,
      chatbots: stats.totalChatbots,
      users: stats.totalUsers,
      messagesPerMonth: stats.totalMessagesThisMonth,
    };
    return map[key] ?? 0;
  };

  const getLimit = (key: string): number => {
    if (!plan) return 0;
    return plan.limits[key as keyof typeof plan.limits] ?? 0;
  };

  return (
    <>
      <Card className={applyThemeClass('bg-[#1f1f1f] border-gray-800', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
        <CardHeader>
          <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
            Facturación
          </CardTitle>
          <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
            Plan, uso, método de pago e historial de facturas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Organization selector */}
          <div className="max-w-sm">
            <Label className={cn('text-sm mb-2 block', applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>
              Organización
            </Label>
            {billingOrganizations.length > 1 ? (
              <Select value={selectedBillingOrgId} onValueChange={setSelectedBillingOrgId}>
                <SelectTrigger className={applyThemeClass('bg-[#2a2a2a] border-gray-700 text-white', LIGHT_THEME_CLASSES.INPUT)}>
                  <SelectValue placeholder="Seleccionar organización" />
                </SelectTrigger>
                <SelectContent>
                  {billingOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className={cn('h-10 px-3 rounded-md flex items-center border text-sm', applyThemeClass('bg-[#2a2a2a] border-gray-700 text-white', LIGHT_THEME_CLASSES.INPUT))}>
                {billingOrganizations[0]?.name || '—'}
              </div>
            )}
          </div>

          {/* ═══════════════════ CARD 1: Current Plan ═══════════════════ */}
          <div className={cn(
            'rounded-xl border p-6',
            applyThemeClass('bg-[#161616] border-gray-800', 'bg-white border-gray-200')
          )}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2.5 rounded-lg', billingSettings.currentPlan === 'enterprise' ? 'bg-blue-500/20' : billingSettings.currentPlan === 'pro' ? 'bg-green-500/20' : 'bg-gray-500/20')}>
                    <Zap className={cn('w-6 h-6', billingSettings.currentPlan === 'enterprise' ? 'text-blue-400' : billingSettings.currentPlan === 'pro' ? 'text-green-400' : 'text-gray-400')} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn('text-xl font-bold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                        Plan {currentPlan?.name || billingSettings.currentPlan}
                      </h3>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        applyThemeClass('bg-green-500/10 border-green-500/20 text-green-400', 'bg-green-100 border-green-200 text-green-700')
                      )}>
                        ACTIVO
                      </span>
                    </div>
                    <p className={cn('text-sm mt-0.5', applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>
                      {currentPlan?.description || ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className={cn('w-4 h-4', applyThemeClass('text-gray-500', 'text-gray-400'))} />
                    <span className={applyThemeClass('text-gray-300', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Precio: <span className={cn('font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                        {currentPlan && currentPlan.price > 0 ? `$${currentPlan.price}/mes` : 'Gratis'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className={cn('w-4 h-4', applyThemeClass('text-gray-500', 'text-gray-400'))} />
                    <span className={applyThemeClass('text-gray-300', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Renovación: <span className={cn('font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                        {billingSettings.autoRenewal ? 'Automática' : 'Manual'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[180px]">
                {billingSettings.currentPlan !== 'enterprise' && (
                  <Button
                    type="button"
                    onClick={() => setShowPricingModal(true)}
                    disabled={!selectedBillingOrgId || upgradeLoading || checkoutLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    {upgradeLoading || checkoutLoading ? 'Procesando…' : 'Mejorar Plan'}
                  </Button>
                )}
                {billingSettings.currentPlan !== 'free' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancellationModal(true)}
                    className={cn('w-full', applyThemeClass('border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50', 'border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300'))}
                  >
                    Cancelar suscripción
                  </Button>
                )}
                {checkoutError && (
                  <p className="text-xs text-red-400 text-center mt-1">{checkoutError}</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════ CARD 2: Usage Dashboard ═══════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className={cn('text-lg font-semibold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                Uso de recursos
              </h4>
              {billingStatusError && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedBillingOrgId && loadBillingStatus(selectedBillingOrgId)}
                  disabled={billingStatusLoading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Reintentar
                </Button>
              )}
            </div>

            {billingStatusLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {usageItems.map((item) => {
                  const current = getUsageValue(item.key);
                  const limit = getLimit(item.key);
                  const isUnlimited = limit === -1 || limit === Infinity;
                  const pct = isUnlimited ? 0 : Math.min((current / Math.max(1, Number(limit))) * 100, 100);
                  const isNearLimit = !isUnlimited && pct > 80;
                  const isAtLimit = !isUnlimited && pct >= 100;

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'p-4 rounded-xl border',
                        applyThemeClass('bg-[#161616] border-gray-800', 'bg-white border-gray-200')
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn('p-1.5 rounded-lg', applyThemeClass('bg-gray-800', 'bg-gray-100'))}>
                          <item.icon className={cn('w-4 h-4', item.color)} />
                        </div>
                        <span className={cn(
                          'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                          isUnlimited
                            ? applyThemeClass('bg-gray-800 text-gray-500', 'bg-gray-100 text-gray-400')
                            : isAtLimit
                            ? 'bg-red-500/10 text-red-400'
                            : isNearLimit
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : applyThemeClass('bg-gray-800 text-gray-400', 'bg-gray-100 text-gray-600')
                        )}>
                          {isUnlimited ? '∞' : `${Math.round(pct)}%`}
                        </span>
                      </div>

                      <p className={cn('text-xs font-medium mb-1', applyThemeClass('text-gray-500', 'text-gray-400'))}>
                        {item.label}
                      </p>
                      <div className="flex items-end gap-1 mb-2">
                        <span className={cn('text-xl font-bold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                          {current.toLocaleString()}
                        </span>
                        <span className={cn('text-xs mb-0.5', applyThemeClass('text-gray-600', 'text-gray-400'))}>
                          / {formatLimit(limit)}
                        </span>
                      </div>

                      {!isUnlimited && (
                        <div className={cn('h-1 w-full rounded-full overflow-hidden', applyThemeClass('bg-gray-800', 'bg-gray-200'))}>
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : item.bgColor
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />

          {/* ═══════════════════ CARD 3: Payment & Contact ═══════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h4 className={cn('text-lg font-semibold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                Método de Pago
              </h4>
              <div className={cn(
                'p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
                applyThemeClass('bg-[#161616] border-gray-800', 'bg-white border-gray-200')
              )}>
                <div className="flex items-center gap-3">
                  <MercadoPagoIcon size={36} />
                  <div>
                    <p className={cn('text-sm font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                      Mercado Pago
                    </p>
                    <p className={cn('text-xs', applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>
                      {billingSettings.currentPlan === 'free'
                        ? 'Se configurará al mejorar tu plan'
                        : 'Pagos gestionados por Mercado Pago'}
                    </p>
                  </div>
                </div>
                {billingSettings.currentPlan !== 'free' && (
                  <Button variant="outline" size="sm" className={applyThemeClass('border-gray-700 hover:bg-gray-800 text-sm', 'border-gray-200 hover:bg-gray-50 text-sm')}>
                    Gestionar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className={cn('text-lg font-semibold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                Contacto
              </h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className={cn('text-xs', applyThemeClass('text-gray-500', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>
                    Email de facturación
                  </Label>
                  <Input
                    type="email"
                    value={billingSettings.billingEmail}
                    onChange={(e) => setBillingSettings((prev) => ({ ...prev, billingEmail: e.target.value }))}
                    className={cn('h-9 text-sm', applyThemeClass('bg-[#2a2a2a] border-gray-700 text-white', LIGHT_THEME_CLASSES.INPUT))}
                    placeholder="facturacion@empresa.com"
                  />
                </div>
                <div className={cn(
                  'p-3 rounded-lg flex items-center justify-between',
                  applyThemeClass('bg-[#161616] border border-gray-800', 'bg-white border border-gray-200')
                )}>
                  <div>
                    <p className={cn('text-sm font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>Renovación auto</p>
                    <p className={cn('text-[11px]', applyThemeClass('text-gray-500', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>Cobrar automáticamente</p>
                  </div>
                  <Switch
                    checked={billingSettings.autoRenewal}
                    onCheckedChange={(checked) => setBillingSettings((prev) => ({ ...prev, autoRenewal: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />

          {/* ═══════════════════ CARD 4: Invoice History ═══════════════════ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className={cn('text-lg font-semibold', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                Historial de Facturas
              </h4>
            </div>
            <div className={cn('rounded-xl border overflow-hidden', applyThemeClass('border-gray-800 bg-[#161616]', 'border-gray-200 bg-white'))}>
              <table className="w-full text-sm text-left">
                <thead className={applyThemeClass('bg-[#111] text-gray-500', 'bg-gray-50 text-gray-500')}>
                  <tr>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide">Descripción</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide">Monto</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wide text-right">Factura</th>
                  </tr>
                </thead>
                <tbody className={applyThemeClass('divide-y divide-gray-800/50', 'divide-y divide-gray-100')}>
                  {billingSettings.currentPlan === 'free' ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <p className={cn('text-sm', applyThemeClass('text-gray-600', 'text-gray-400'))}>
                          No hay facturas aún. Las facturas aparecerán aquí al suscribirte a un plan pago.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className={cn('px-4 py-3', applyThemeClass('text-gray-300', 'text-gray-900'))}>
                        {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={cn('px-4 py-3', applyThemeClass('text-gray-300', 'text-gray-900'))}>
                        Plan {currentPlan?.name || billingSettings.currentPlan} — Mensual
                      </td>
                      <td className={cn('px-4 py-3 font-medium', applyThemeClass('text-white', 'text-gray-900'))}>
                        ${currentPlan?.price || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Pagado
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Download className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>

        {/* Footer with save/reset */}
        <div className={cn('flex items-center justify-between px-6 py-4 border-t', applyThemeClass('border-gray-800', 'border-gray-200'))}>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleResetSection('billing')}
            disabled={saving || !hasBillingChanges}
          >
            Restablecer
          </Button>
          <Button
            type="button"
            onClick={() => handleSaveSettings('billing')}
            disabled={saving || !hasBillingChanges}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…</> : 'Guardar cambios'}
          </Button>
        </div>
      </Card>

      {/* Pricing Modal */}
      <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
        <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-y-auto', applyThemeClass('bg-[#111111] border-gray-800', 'bg-white border-gray-200'))}>
          <DialogHeader>
            <DialogTitle className={applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}>
              Mejorar Plan
            </DialogTitle>
            <DialogDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
              Selecciona un nuevo plan para desbloquear más funcionalidades
            </DialogDescription>
          </DialogHeader>
          <PricingSection
            title={false}
            description={false}
            currentPlanId={billingSettings.currentPlan}
            onSelectPlan={async (plan, interval) => {
              if (upgradeLoading || checkoutLoading) return;
              if (plan.id === billingSettings.currentPlan) return;

              const orgName = billingOrganizations.find((o) => o.id === selectedBillingOrgId)?.name;
              const ok = await confirm({
                title: 'Confirmar cambio de plan',
                description: `Se aplicará el plan ${plan.name} (${interval === 'year' ? 'anual' : 'mensual'}) a la organización ${orgName || selectedBillingOrgId}.`,
                confirmText: 'Aplicar',
                cancelText: 'Cancelar',
              });
              if (!ok) return;
              await applyOrgPlanUpgrade(plan, interval);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cancellation Modal */}
      <CancellationModal
        open={showCancellationModal}
        onOpenChange={setShowCancellationModal}
        currentPlanName={currentPlan?.name || 'actual'}
        onConfirmCancel={handleCancelPlan}
        loading={upgradeLoading}
      />

      {ConfirmDialog}
    </>
  );
}
