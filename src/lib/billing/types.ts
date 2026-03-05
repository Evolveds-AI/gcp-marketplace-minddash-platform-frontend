/**
 * Typed interfaces for Billing Management API responses.
 * Based on enpoints.json schemas: OrganizationBillingStatus, PlanQuota, Plan.
 */

export interface BillingPlanDetails {
  id: string;
  plan_name: string;
  description: string | null;
}

export interface BillingQuota {
  id: string;
  metric_name: string;
  level: string | null;
  quota: number;
}

export interface OrganizationBillingStatus {
  organization_id: string;
  org_plan_id?: string;
  plan_details: BillingPlanDetails | null;
  quotas: BillingQuota[];
}

export interface BillingStatusMeta {
  orgPlanId: string | null;
  planId: string | null;
  planName: string | null;
}

/**
 * Normalizes the raw billing status response from backend into a typed shape.
 * Handles the various field name alternatives the backend may return.
 */
export function normalizeBillingStatus(raw: any): OrganizationBillingStatus | null {
  if (!raw) return null;

  const orgId = raw.organization_id || raw.organizationId || '';

  const planDetails: BillingPlanDetails | null = raw.plan_details
    ? {
        id: raw.plan_details.id || '',
        plan_name: raw.plan_details.plan_name || raw.plan_details.planName || '',
        description: raw.plan_details.description ?? null,
      }
    : null;

  const quotas: BillingQuota[] = Array.isArray(raw.quotas)
    ? raw.quotas.map((q: any) => ({
        id: q.id || '',
        metric_name: q.metric_name || q.metricName || '',
        level: q.level ?? null,
        quota: typeof q.quota === 'number' ? q.quota : 0,
      }))
    : [];

  return {
    organization_id: orgId,
    org_plan_id: raw.org_plan_id || raw.orgPlanId || undefined,
    plan_details: planDetails,
    quotas,
  };
}

/**
 * Extracts commonly needed meta fields from a normalized billing status.
 */
export function extractBillingStatusMeta(status: OrganizationBillingStatus | null): BillingStatusMeta {
  if (!status) {
    return { orgPlanId: null, planId: null, planName: null };
  }
  return {
    orgPlanId: status.org_plan_id || null,
    planId: status.plan_details?.id || null,
    planName: status.plan_details?.plan_name || null,
  };
}

// Request/response types matching enpoints.json schemas

export interface PlanRegisterRequest {
  plan_name: string;
  description?: string | null;
}

export interface PlanUpdateRequest {
  id: string;
  plan_name: string;
  description?: string | null;
}

export interface PlanDeleteRequest {
  id: string;
}

export interface QuotaRegisterRequest {
  id_plan: string;
  metric_name: string;
  level?: string | null;
  quota: number;
}

export interface QuotaUpdateRequest {
  id: string;
  id_plan: string;
  metric_name: string;
  level?: string | null;
  quota: number;
}

export interface QuotaDeleteRequest {
  id: string;
}

export interface OrgPlanRegisterRequest {
  id_plan: string;
  id_organization: string;
}

export interface OrgPlanUpdateRequest {
  id: string;
  id_plan: string;
  id_organization: string;
}

export interface OrgPlanDeleteRequest {
  id: string;
}
