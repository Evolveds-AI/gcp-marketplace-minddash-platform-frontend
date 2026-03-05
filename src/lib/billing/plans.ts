import { ReactNode } from 'react';

export interface PlanLimit {
  organizations: number;
  projects: number;
  chatbots: number;
  users: number;
  messagesPerMonth: number;
}

export interface PlanFeature {
  label: string;
  included: boolean;
}

export type BillingInterval = 'month' | 'year';

export interface Plan {
  id: string;
  backendPlanCode: string;
  name: string;
  description: string;
  price: number;
  annualPrice: number;
  currency: string;
  interval: 'month' | 'year' | 'lifetime';
  priceNote: string;
  annualPriceNote: string;
  limits: PlanLimit;
  features: string[];
  recommended?: boolean;
  variant: 'default' | 'glow' | 'glow-brand';
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    backendPlanCode: 'free',
    name: 'Free',
    description: 'Para empezar con tu primer proyecto de chatbot',
    price: 0,
    annualPrice: 0,
    currency: 'USD',
    interval: 'month',
    priceNote: 'Gratis para siempre. Comienza ahora.',
    annualPriceNote: 'Gratis para siempre. Comienza ahora.',
    limits: {
      organizations: 1,
      projects: 2,
      chatbots: 3,
      users: 2,
      messagesPerMonth: 1000,
    },
    features: [
      '1 organización',
      'Hasta 2 proyectos',
      'Hasta 3 chatbots',
      '1,000 mensajes/mes',
      'Soporte por email',
    ],
    variant: 'default',
  },
  {
    id: 'pro',
    backendPlanCode: 'pro',
    name: 'Pro',
    description: 'Para equipos en crecimiento con múltiples proyectos',
    price: 49,
    annualPrice: 39,
    currency: 'USD',
    interval: 'month',
    priceNote: 'Facturado mensualmente. Cancela cuando quieras.',
    annualPriceNote: 'Facturado anualmente. Ahorra un 20%.',
    limits: {
      organizations: 5,
      projects: 10,
      chatbots: 20,
      users: 10,
      messagesPerMonth: 10000,
    },
    features: [
      'Hasta 5 organizaciones',
      'Hasta 10 proyectos',
      'Hasta 20 chatbots',
      '10,000 mensajes/mes',
      'Soporte prioritario',
      'Analytics avanzados',
      'Integraciones premium',
    ],
    recommended: true,
    variant: 'glow-brand',
  },
  {
    id: 'enterprise',
    backendPlanCode: 'enterprise',
    name: 'Enterprise',
    description: 'Para empresas con necesidades avanzadas y sin límites',
    price: 199,
    annualPrice: 159,
    currency: 'USD',
    interval: 'month',
    priceNote: 'Facturado mensualmente. Soporte dedicado.',
    annualPriceNote: 'Facturado anualmente. Ahorra un 20%.',
    limits: {
      organizations: -1, // -1 = unlimited
      projects: -1,
      chatbots: -1,
      users: -1,
      messagesPerMonth: -1,
    },
    features: [
      'Organizaciones ilimitadas',
      'Proyectos ilimitados',
      'Chatbots ilimitados',
      'Mensajes ilimitados',
      'Soporte 24/7 dedicado',
      'SLA garantizado',
      'Onboarding personalizado',
      'API acceso completo',
    ],
    variant: 'glow',
  },
];

export function getPlanById(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getDefaultPlan(): Plan {
  return PLANS.find((p) => p.id === 'free')!;
}

export function canCreateOrganization(currentPlanId: string, currentOrgCount: number): boolean {
  const plan = getPlanById(currentPlanId);
  if (!plan) return false;
  if (plan.limits.organizations === -1) return true;
  return currentOrgCount < plan.limits.organizations;
}

export function canCreateProject(currentPlanId: string, currentProjectCount: number): boolean {
  const plan = getPlanById(currentPlanId);
  if (!plan) return false;
  if (plan.limits.projects === -1) return true;
  return currentProjectCount < plan.limits.projects;
}

export function canCreateChatbot(currentPlanId: string, currentChatbotCount: number): boolean {
  const plan = getPlanById(currentPlanId);
  if (!plan) return false;
  if (plan.limits.chatbots === -1) return true;
  return currentChatbotCount < plan.limits.chatbots;
}

export function checkPlanLimit(
  currentPlanId: string,
  resource: keyof PlanLimit,
  currentCount: number
): { allowed: boolean; limit: number; current: number } {
  const plan = getPlanById(currentPlanId);
  if (!plan) return { allowed: false, limit: 0, current: currentCount };
  
  const limit = plan.limits[resource];
  if (limit === -1) return { allowed: true, limit: -1, current: currentCount };
  
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  };
}

export function formatLimit(limit: number): string {
  if (limit === -1) return 'Ilimitado';
  return limit.toLocaleString();
}

export function getPlanPrice(plan: Plan, interval: BillingInterval): number {
  return interval === 'year' ? plan.annualPrice : plan.price;
}

export function getPlanPriceNote(plan: Plan, interval: BillingInterval): string {
  return interval === 'year' ? plan.annualPriceNote : plan.priceNote;
}

export function getPlanByBackendCode(code: string): Plan | undefined {
  return PLANS.find((p) => p.backendPlanCode === code);
}

export function matchBackendPlan(
  backendPlans: Array<{ id: string; plan_name?: string; planName?: string }>,
  plan: Plan
): { id: string; plan_name?: string; planName?: string } | undefined {
  return backendPlans.find((bp) => {
    const bpName = (bp.plan_name || bp.planName || '').toString().toLowerCase();
    return bpName === plan.backendPlanCode || bpName === plan.name.toLowerCase();
  });
}
