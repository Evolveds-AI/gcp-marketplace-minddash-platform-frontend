export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientReadRole } from '@/lib/utils/admin-client-role';
import { backendClient } from '@/lib/api/backend-client';

const APP_NAME = 'minddash_notifications';

type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  createdAt: string;
  group: 'billing' | 'health' | 'activity';
  source: 'billing' | 'products' | 'conversations';
  isRead?: boolean;
  actionLabel?: string;
  actionHref?: string;
};

type StoredState = {
  dismissedIds: string[];
  readIds: string[];
  preferences?: {
    hideNextSteps?: boolean;
    dismissedSetupStepIds?: string[];
    pinnedQuickActionIds?: string[];
  };
};

function getAuthUserId(request: NextRequest): { userId: string; role: string } | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  if (!decoded) return null;
  return { userId: decoded.userId, role: decoded.role };
}

async function getUserState(userId: string): Promise<StoredState> {
  const rows = await prisma.$queryRaw<{ state: any }[]>`
    SELECT state
    FROM user_states
    WHERE app_name = ${APP_NAME} AND user_id = ${userId}
    LIMIT 1
  `;

  const raw = rows?.[0]?.state;
  if (!raw)
    return {
      dismissedIds: [],
      readIds: [],
      preferences: { hideNextSteps: false, dismissedSetupStepIds: [], pinnedQuickActionIds: [] },
    };

  if (typeof raw === 'object') {
    const dismissedIds = Array.isArray((raw as any).dismissedIds) ? (raw as any).dismissedIds : [];
    const readIds = Array.isArray((raw as any).readIds) ? (raw as any).readIds : [];
    const prefRaw = (raw as any).preferences;
    const hideNextSteps = typeof prefRaw?.hideNextSteps === 'boolean' ? prefRaw.hideNextSteps : false;
    const dismissedSetupStepIds = Array.isArray(prefRaw?.dismissedSetupStepIds) ? prefRaw.dismissedSetupStepIds : [];
    const pinnedQuickActionIds = Array.isArray(prefRaw?.pinnedQuickActionIds) ? prefRaw.pinnedQuickActionIds : [];
    return { dismissedIds, readIds, preferences: { hideNextSteps, dismissedSetupStepIds, pinnedQuickActionIds } };
  }

  try {
    const parsed = JSON.parse(raw);
    const dismissedIds = Array.isArray(parsed?.dismissedIds) ? parsed.dismissedIds : [];
    const readIds = Array.isArray(parsed?.readIds) ? parsed.readIds : [];
    const prefRaw = parsed?.preferences;
    const hideNextSteps = typeof prefRaw?.hideNextSteps === 'boolean' ? prefRaw.hideNextSteps : false;
    const dismissedSetupStepIds = Array.isArray(prefRaw?.dismissedSetupStepIds) ? prefRaw.dismissedSetupStepIds : [];
    const pinnedQuickActionIds = Array.isArray(prefRaw?.pinnedQuickActionIds) ? prefRaw.pinnedQuickActionIds : [];
    return { dismissedIds, readIds, preferences: { hideNextSteps, dismissedSetupStepIds, pinnedQuickActionIds } };
  } catch {
    return {
      dismissedIds: [],
      readIds: [],
      preferences: { hideNextSteps: false, dismissedSetupStepIds: [], pinnedQuickActionIds: [] },
    };
  }
}

async function upsertUserState(userId: string, state: StoredState): Promise<void> {
  const json = JSON.stringify(state);
  await prisma.$executeRaw`
    INSERT INTO user_states (app_name, user_id, state, update_time)
    VALUES (${APP_NAME}, ${userId}, ${json}::jsonb, NOW())
    ON CONFLICT (app_name, user_id)
    DO UPDATE SET state = ${json}::jsonb, update_time = NOW()
  `;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function normalizeMetricName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function findMonthlyMessagesQuota(quotas: any[] | undefined | null): number | null {
  const list = Array.isArray(quotas) ? quotas : [];
  for (const q of list) {
    const metric = normalizeMetricName(q?.metric_name);
    if (!metric) continue;
    if (metric.includes('mensaj') || metric.includes('message')) {
      const quota = Number(q?.quota);
      if (Number.isFinite(quota) && quota > 0) return quota;
    }
  }
  return null;
}

async function buildNotifications(userId: string, role: string): Promise<NotificationItem[]> {
  const adminContext = await getAdminContext(userId);

  const products = await prisma.products.findMany({
    where: { id: { in: adminContext.productIds } },
    select: {
      id: true,
      name: true,
      tipo: true,
      is_active: true,
      mensajes_mes: true,
      is_active_rag: true,
      is_active_alerts: true,
      created_at: true,
      channel_product: { select: { id: true } },
    },
  });

  const now = new Date();
  const base: NotificationItem[] = [];

  const totalMessagesMonth = products.reduce((sum, p) => sum + (p.mensajes_mes || 0), 0);

  const organizationIds = adminContext.organizationIds;
  if (organizationIds.length > 0 && (role || '').toLowerCase() !== 'editor') {
    const billingStatuses = await Promise.all(
      organizationIds.map(async (orgId) => {
        try {
          const status = await backendClient.getBillingStatusByOrg(orgId);
          return { orgId, status };
        } catch {
          return { orgId, status: null };
        }
      })
    );

    for (const entry of billingStatuses) {
      const quotas = Array.isArray(entry.status?.quotas) ? entry.status.quotas : null;

      const messagesQuota = findMonthlyMessagesQuota(quotas);
      if (messagesQuota && messagesQuota > 0) {
        const ratio = totalMessagesMonth / messagesQuota;
        if (ratio >= 1) {
          base.push({
            id: `quota:messages:over:${entry.orgId}`,
            title: 'Límite alcanzado',
            description: `${totalMessagesMonth.toLocaleString()} / ${messagesQuota.toLocaleString()} mensajes este mes`,
            severity: 'error',
            createdAt: now.toISOString(),
            group: 'billing',
            source: 'billing',
            actionLabel: 'Ampliar plan',
            actionHref: '/dashboard/admin/settings',
          });
        } else if (ratio >= 0.8) {
          const remaining = messagesQuota - totalMessagesMonth;
          base.push({
            id: `quota:messages:near:${entry.orgId}`,
            title: 'Uso elevado',
            description: `Quedan ${remaining.toLocaleString()} mensajes disponibles`,
            severity: 'warning',
            createdAt: now.toISOString(),
            group: 'billing',
            source: 'billing',
            actionLabel: 'Ver uso',
            actionHref: '/dashboard/admin/settings',
          });
        }
      }
    }
  }

  const chatbots = products.filter((p) => p.tipo === 'chatbot');
  const inactiveChatbots = chatbots.filter((p) => p.is_active === false);
  const chatbotsWithoutChannel = chatbots.filter((p) => (p.channel_product?.length || 0) === 0 && p.is_active !== false);

  if (inactiveChatbots.length > 0) {
    const names = inactiveChatbots.slice(0, 2).map((p) => p.name || 'Chatbot').join(', ');
    const extra = inactiveChatbots.length > 2 ? ` (+${inactiveChatbots.length - 2})` : '';
    base.push({
      id: `products:inactive:summary`,
      title: 'Chatbots desactivados',
      description: `${names}${extra}`,
      severity: 'warning',
      createdAt: now.toISOString(),
      group: 'health',
      source: 'products',
      actionLabel: 'Revisar',
      actionHref: '/dashboard/admin/chatbots',
    });
  }

  if (chatbotsWithoutChannel.length > 0) {
    const names = chatbotsWithoutChannel.slice(0, 2).map((p) => p.name || 'Chatbot').join(', ');
    const extra = chatbotsWithoutChannel.length > 2 ? ` (+${chatbotsWithoutChannel.length - 2})` : '';
    base.push({
      id: `products:no_channel:summary`,
      title: 'Sin canal conectado',
      description: `${names}${extra}`,
      severity: 'info',
      createdAt: now.toISOString(),
      group: 'health',
      source: 'products',
      actionLabel: 'Conectar',
      actionHref: '/dashboard/admin/chatbots',
    });
  }

  return base;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUserId(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    if (!isAdminClientReadRole(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const [state, notifications] = await Promise.all([getUserState(auth.userId), buildNotifications(auth.userId, auth.role)]);

    const dismissed = new Set(state.dismissedIds || []);
    const read = new Set(state.readIds || []);

    const visible = notifications
      .filter((n) => !dismissed.has(n.id))
      .map((n) => ({
        ...n,
        isRead: read.has(n.id),
      }));
    const unreadCount = visible.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: {
        notifications: visible,
        unreadCount,
        preferences: {
          hideNextSteps: Boolean(state.preferences?.hideNextSteps),
          dismissedSetupStepIds: Array.isArray(state.preferences?.dismissedSetupStepIds)
            ? state.preferences?.dismissedSetupStepIds
            : [],
          pinnedQuickActionIds: Array.isArray(state.preferences?.pinnedQuickActionIds)
            ? state.preferences?.pinnedQuickActionIds
            : [],
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: error?.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUserId(request);
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 401 });
    }

    if (!isAdminClientReadRole(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((v) => typeof v === 'string') : [];

    const state = await getUserState(auth.userId);

    if (action === 'dismiss') {
      const next: StoredState = {
        dismissedIds: uniq([...(state.dismissedIds || []), ...ids]),
        readIds: state.readIds || [],
        preferences: state.preferences,
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_read') {
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: uniq([...(state.readIds || []), ...ids]),
        preferences: state.preferences,
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_all_read') {
      const current = await buildNotifications(auth.userId, auth.role);
      const visible = current.filter((n) => !(state.dismissedIds || []).includes(n.id));
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: uniq([...(state.readIds || []), ...visible.map((n) => n.id)]),
        preferences: state.preferences,
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'hide_next_steps') {
      const pinnedQuickActionIds = Array.isArray(state.preferences?.pinnedQuickActionIds)
        ? state.preferences?.pinnedQuickActionIds
        : [];
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: state.readIds || [],
        preferences: {
          hideNextSteps: true,
          dismissedSetupStepIds: Array.isArray(state.preferences?.dismissedSetupStepIds)
            ? state.preferences?.dismissedSetupStepIds
            : [],
          pinnedQuickActionIds,
        },
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'show_next_steps') {
      const pinnedQuickActionIds = Array.isArray(state.preferences?.pinnedQuickActionIds)
        ? state.preferences?.pinnedQuickActionIds
        : [];
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: state.readIds || [],
        preferences: {
          hideNextSteps: false,
          dismissedSetupStepIds: Array.isArray(state.preferences?.dismissedSetupStepIds)
            ? state.preferences?.dismissedSetupStepIds
            : [],
          pinnedQuickActionIds,
        },
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss_setup_steps') {
      const existing = Array.isArray(state.preferences?.dismissedSetupStepIds)
        ? state.preferences?.dismissedSetupStepIds
        : [];
      const pinnedQuickActionIds = Array.isArray(state.preferences?.pinnedQuickActionIds)
        ? state.preferences?.pinnedQuickActionIds
        : [];
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: state.readIds || [],
        preferences: {
          hideNextSteps: Boolean(state.preferences?.hideNextSteps),
          dismissedSetupStepIds: uniq([...existing, ...ids]),
          pinnedQuickActionIds,
        },
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    if (action === 'set_pinned_quick_actions') {
      const dismissedSetupStepIds = Array.isArray(state.preferences?.dismissedSetupStepIds)
        ? state.preferences?.dismissedSetupStepIds
        : [];
      const next: StoredState = {
        dismissedIds: state.dismissedIds || [],
        readIds: state.readIds || [],
        preferences: {
          hideNextSteps: Boolean(state.preferences?.hideNextSteps),
          dismissedSetupStepIds,
          pinnedQuickActionIds: uniq(ids),
        },
      };
      await upsertUserState(auth.userId, next);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Acción inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications state:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: error?.statusCode || 500 }
    );
  }
}
