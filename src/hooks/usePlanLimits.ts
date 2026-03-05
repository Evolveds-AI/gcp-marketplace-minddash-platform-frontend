'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plan, PLANS, getPlanById, checkPlanLimit, PlanLimit } from '@/lib/billing/plans';

interface PlanUsage {
  organizations: number;
  projects: number;
  chatbots: number;
  users: number;
  messagesThisMonth: number;
}

interface UsePlanLimitsReturn {
  currentPlan: Plan | null;
  usage: PlanUsage | null;
  loading: boolean;
  error: string | null;
  canCreate: (resource: keyof PlanLimit) => boolean;
  getLimit: (resource: keyof PlanLimit) => number;
  getUsage: (resource: keyof PlanLimit) => number;
  isAtLimit: (resource: keyof PlanLimit) => boolean;
  refresh: () => Promise<void>;
}

export function usePlanLimits(): UsePlanLimitsReturn {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [limitsOverride, setLimitsOverride] = useState<Partial<PlanLimit> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanAndUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLimitsOverride(null);

      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        setCurrentPlan(getPlanById('free') || null);
        setUsage({
          organizations: 0,
          projects: 0,
          chatbots: 0,
          users: 0,
          messagesThisMonth: 0,
        });
        return;
      }

      const auth = JSON.parse(authData);

      // Fetch current plan from settings
      const settingsRes = await fetch('/api/admin-client/settings', {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!settingsRes.ok) {
        throw new Error('Error al obtener configuración');
      }

      const settingsData = await settingsRes.json();
      const planId = settingsData.data?.billing?.currentPlan || 'free';
      
      const mappedPlanId = planId;
      const plan = getPlanById(mappedPlanId) || getPlanById('free');
      setCurrentPlan(plan || null);

      try {
        const plansRes = await fetch('/api/backend/billing/plans', {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        const plansJson = await plansRes.json();
        const backendPlans = Array.isArray(plansJson?.data) ? plansJson.data : [];

        const currentPlanName = (plan?.name || mappedPlanId || '').toString().toLowerCase();
        const matchedBackendPlan = backendPlans.find((p: any) => {
          const backendName = (p?.plan_name || p?.planName || '').toString().toLowerCase();
          return backendName === currentPlanName;
        });

        if (matchedBackendPlan?.id) {
          const quotasRes = await fetch('/api/backend/billing/quotas-by-plan', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plan_id: matchedBackendPlan.id }),
          });
          const quotasJson = await quotasRes.json();
          const quotas = Array.isArray(quotasJson?.data) ? quotasJson.data : [];

          const nextOverride: Partial<PlanLimit> = {};
          for (const q of quotas) {
            const metric = (q?.metric_name || '').toString().toLowerCase();
            const quota = typeof q?.quota === 'number' ? q.quota : null;
            if (quota === null) continue;

            if (metric.includes('organization') || metric.includes('org')) {
              nextOverride.organizations = quota;
              continue;
            }
            if (metric.includes('project')) {
              nextOverride.projects = quota;
              continue;
            }
            if (metric.includes('chatbot')) {
              nextOverride.chatbots = quota;
              continue;
            }
            if (metric.includes('user')) {
              nextOverride.users = quota;
              continue;
            }
            if (metric.includes('message') || metric.includes('mensaj')) {
              nextOverride.messagesPerMonth = quota;
              continue;
            }
          }

          if (Object.keys(nextOverride).length > 0) {
            setLimitsOverride(nextOverride);
          }
        }
      } catch (billingError) {
        console.warn('Error fetching billing quotas:', billingError);
      }

      // Fetch actual usage from backend endpoints
      try {
        // Fetch organizations count
        const orgsRes = await fetch('/api/admin-client/organizations/stats', {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        const orgsData = await orgsRes.json();
        const orgsCount = orgsData.success ? (orgsData.organizations?.length || 0) : 0;

        // Fetch projects count
        const projectsRes = await fetch('/api/admin-client/projects', {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        const projectsData = await projectsRes.json();
        const projectsCount = projectsData.success ? (projectsData.projects?.length || 0) : 0;

        // Calculate total chatbots from organizations stats
        const chatbotsCount = orgsData.success 
          ? (orgsData.organizations?.reduce((sum: number, org: any) => sum + (org.chatbots_count || 0), 0) || 0)
          : 0;

        // Calculate total users from organizations stats
        const usersCount = orgsData.success
          ? (orgsData.organizations?.reduce((sum: number, org: any) => sum + (org.users_count || 0), 0) || 0)
          : 1;

        // Messages this month from org stats
        const messagesThisMonth = orgsData.success
          ? (orgsData.stats?.totalMessagesThisMonth || orgsData.organizations?.reduce((sum: number, org: any) => sum + (org.messages_this_month || 0), 0) || 0)
          : 0;

        setUsage({
          organizations: orgsCount,
          projects: projectsCount,
          chatbots: chatbotsCount,
          users: usersCount,
          messagesThisMonth,
        });
      } catch (usageError) {
        console.warn('Error fetching usage data, using defaults:', usageError);
        setUsage({
          organizations: 1,
          projects: 0,
          chatbots: 0,
          users: 1,
          messagesThisMonth: 0,
        });
      }

    } catch (err) {
      console.error('Error fetching plan limits:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      // Fallback to free plan
      setCurrentPlan(getPlanById('free') || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanAndUsage();
  }, [fetchPlanAndUsage]);

  const canCreate = useCallback(
    (resource: keyof PlanLimit): boolean => {
      if (!currentPlan || !usage) return false;
      const limit = (limitsOverride?.[resource] ?? currentPlan.limits[resource]) as number;
      if (limit === -1) return true;
      
      const usageKey = resource === 'messagesPerMonth' ? 'messagesThisMonth' : resource;
      const current = usage[usageKey as keyof PlanUsage] || 0;
      return current < limit;
    },
    [currentPlan, usage, limitsOverride]
  );

  const getLimit = useCallback(
    (resource: keyof PlanLimit): number => {
      if (!currentPlan) return 0;
      return (limitsOverride?.[resource] ?? currentPlan.limits[resource]) as number;
    },
    [currentPlan, limitsOverride]
  );

  const getUsage = useCallback(
    (resource: keyof PlanLimit): number => {
      if (!usage) return 0;
      const usageKey = resource === 'messagesPerMonth' ? 'messagesThisMonth' : resource;
      return usage[usageKey as keyof PlanUsage] || 0;
    },
    [usage]
  );

  const isAtLimit = useCallback(
    (resource: keyof PlanLimit): boolean => {
      return !canCreate(resource);
    },
    [canCreate]
  );

  return {
    currentPlan,
    usage,
    loading,
    error,
    canCreate,
    getLimit,
    getUsage,
    isAtLimit,
    refresh: fetchPlanAndUsage,
  };
}
