export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

interface LegacyClientSettings {
  client_id: string;
  company_name?: string | null;
  company_description?: string | null;
  timezone?: string | null;
  language?: string | null;
  ui_theme?: string | null;
  avatar_data?: string | null;
  two_factor_enabled?: boolean | null;
  session_timeout?: number | null;
  password_min_length?: number | null;
  password_require_special?: boolean | null;
  password_require_numbers?: boolean | null;
  password_require_uppercase?: boolean | null;
  ip_whitelist?: any;
  email_notifications?: boolean | null;
  sms_notifications?: boolean | null;
  user_alerts?: boolean | null;
  system_alerts?: boolean | null;
  reports_enabled?: boolean | null;
  maintenance_alerts?: boolean | null;
  current_plan?: string | null;
  billing_email?: string | null;
  payment_method?: string | null;
  auto_renewal?: boolean | null;
}

type UsersWithRole = {
  id: string;
  username: string;
  email: string | null;
  iam_role?: string;
  role?: {
    name?: string | null;
  } | null;
  access_user_client?: {
    client_id: string | null;
    clients?: {
      nombre?: string | null;
      description?: string | null;
    } | null;
  }[];
};

type VerifiedAuth = {
  user: UsersWithRole;
  decoded: {
    userId?: string;
    role?: string;
    clientId?: string;
    client_id?: string;
  };
};

function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  if (!headerValue.startsWith('Bearer ')) return null;
  const token = headerValue.substring(7).trim();
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

// Función para verificar el token JWT y obtener el usuario
async function verifyToken(request: NextRequest): Promise<VerifiedAuth | null> {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const headerToken = extractBearerToken(authHeader);
    const cookieToken = request.cookies.get('access-token')?.value || null;

    console.log('🔐 Settings verifyToken:', {
      hasAuthHeader: !!authHeader,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken
    });

    const candidates = [headerToken, cookieToken].filter(Boolean) as string[];
    if (candidates.length === 0) {
      console.log('❌ No tokens found');
      return null;
    }

    let decoded: any = null;
    for (const candidate of candidates) {
      try {
        decoded = verifyAccessToken(candidate) as any;
        console.log('🔑 Token verification result:', { hasDecoded: !!decoded, userId: decoded?.userId });
        if (decoded?.userId) break;
      } catch (tokenError) {
        console.log('❌ Token verification error:', tokenError);
      }
      decoded = null;
    }
    if (!decoded?.userId) {
      console.log('❌ No valid userId in decoded token');
      return null;
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        access_user_client: {
          select: {
            client_id: true,
            clients: {
              select: {
                nombre: true,
                description: true
              }
            }
          }
        }
      }
    });

    console.log('👤 User lookup result:', { found: !!user, userId: decoded.userId });

    if (!user) {
      console.log('❌ User not found in database');
      return null;
    }

    // Obtener el rol usando raw query si es necesario
    const roleResult = await prisma.$queryRawUnsafe<any[]>(
      `SELECT r.name FROM roles r WHERE r.id = $1 LIMIT 1`,
      user.role_id
    );

    const userWithRole = {
      ...user,
      role: roleResult.length > 0 ? { name: roleResult[0].name } : null
    };

    return { user: userWithRole as UsersWithRole, decoded };
  } catch (error) {
    console.log('❌ verifyToken catch error:', error);
    return null;
  }
}

function getLegacyRole(user: UsersWithRole | null): string | undefined {
  if (!user) return undefined;
  if (user.iam_role) return user.iam_role;
  return user.role?.name?.toLowerCase();
}

function isValidUUID(value: string | undefined | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildDefaultSettings(companyName = '', companyDescription = '') {
  return {
    profile: {
      companyName,
      companyDescription,
      avatarData: null
    },
    appearance: {
      uiTheme: 'dark'
    },
    general: {
      companyName,
      companyDescription,
      timezone: 'UTC',
      language: 'es'
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        requireUppercase: true
      },
      ipWhitelist: []
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      userAlerts: true,
      systemAlerts: true,
      reportsEnabled: true,
      maintenanceAlerts: true
    },
    billing: {
      currentPlan: 'free',
      billingEmail: '',
      paymentMethod: '',
      autoRenewal: true
    }
  };
}

// GET - Obtener configuraciones del cliente
export async function GET(request: NextRequest) {
  try {
    // Verificación simplificada (mismo patrón que /api/admin-client/users)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    console.log('✅ Settings GET - Token valid:', { userId: decoded.userId, role: decoded.role });

    // Obtener usuario con su cliente
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        role: { select: { name: true } },
        access_user_client: {
          select: {
            client_id: true,
            clients: { select: { nombre: true, description: true } }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      );
    }

    const role = (decoded.role || user.role?.name || '').toLowerCase();
    const clientId =
      user.access_user_client?.[0]?.client_id ||
      decoded.clientId ||
      decoded.client_id ||
      undefined;

    console.log('🔍 Settings - Role/Client check:', { 
      role, 
      clientId, 
      hasAccessUserClient: user.access_user_client?.length,
      decodedClientId: decoded.clientId,
      decodedClient_id: decoded.client_id
    });

    const allowedRoles = new Set(['admin', 'admin-client', 'admin_client', 'super_admin', 'superadmin', 'editor']);
    if (!allowedRoles.has(role)) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    // Si no hay clientId, intentar obtenerlo de otra forma o usar default
    let effectiveClientId = clientId;
    if (!effectiveClientId || !isValidUUID(effectiveClientId)) {
      // Buscar el primer cliente disponible para este usuario
      const clientAccess = await prisma.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT auc.client_id 
        FROM access_user_client auc 
        WHERE auc.user_id = $1::uuid 
        LIMIT 1
      `, decoded.userId);
      
      if (clientAccess.length > 0) {
        effectiveClientId = clientAccess[0].client_id;
      } else {
        // Buscar cualquier cliente existente (para admins globales)
        const anyClient = await prisma.$queryRawUnsafe<any[]>(`
          SELECT id FROM clients LIMIT 1
        `);
        if (anyClient.length > 0) {
          effectiveClientId = anyClient[0].id;
        }
      }
      console.log('🔍 Settings - Fallback clientId:', effectiveClientId);
    }

    if (!isValidUUID(effectiveClientId)) {
      console.warn('⚠️ Settings - clientId inválido, devolviendo defaults');
      return NextResponse.json({
        success: true,
        data: buildDefaultSettings(
          user.access_user_client?.[0]?.clients?.nombre || '',
          user.access_user_client?.[0]?.clients?.description || ''
        )
      });
    }

    if (!effectiveClientId) {
      return NextResponse.json(
        { error: 'No se encontró cliente asociado.' },
        { status: 403 }
      );
    }

    // Buscar configuraciones existentes del cliente
    let settings: any = null;
    let uiTheme: 'light' | 'dark' = 'dark';
    let avatarData: string | null = null;
    try {
      settings = await prisma.client_settings.findUnique({
        where: { client_id: effectiveClientId }
      });

      // Si no existen configuraciones, crear unas por defecto
      if (!settings) {
        settings = await prisma.client_settings.create({
          data: {
            client_id: effectiveClientId,
            company_name: user.access_user_client?.[0]?.clients?.nombre || '',
            company_description: user.access_user_client?.[0]?.clients?.description || '',
            current_plan: 'free'
          }
        });
      }

      try {
        const uiResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT ui_theme, avatar_data FROM client_settings WHERE client_id = $1::uuid LIMIT 1`,
          effectiveClientId
        );
        const rawTheme = uiResult?.[0]?.ui_theme;
        uiTheme = rawTheme === 'light' ? 'light' : 'dark';
        avatarData = uiResult?.[0]?.avatar_data ?? null;
      } catch (uiError) {
        console.warn('Settings GET - ui fields unavailable:', uiError);
      }
    } catch (dbError) {
      console.error('Settings GET - error consultando client_settings, devolviendo defaults:', dbError);
      return NextResponse.json({
        success: true,
        data: buildDefaultSettings(
          user.access_user_client?.[0]?.clients?.nombre || '',
          user.access_user_client?.[0]?.clients?.description || ''
        )
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          companyName: settings.company_name || '',
          companyDescription: settings.company_description || '',
          avatarData
        },
        appearance: {
          uiTheme
        },
        general: {
          companyName: settings.company_name || '',
          companyDescription: settings.company_description || '',
          timezone: settings.timezone || 'UTC',
          language: settings.language || 'es'
        },
        security: {
          twoFactorEnabled: settings.two_factor_enabled,
          sessionTimeout: settings.session_timeout || 30,
          passwordPolicy: {
            minLength: settings.password_min_length || 8,
            requireSpecialChars: settings.password_require_special,
            requireNumbers: settings.password_require_numbers,
            requireUppercase: settings.password_require_uppercase
          },
          ipWhitelist: settings.ip_whitelist || []
        },
        notifications: {
          emailNotifications: settings.email_notifications,
          smsNotifications: settings.sms_notifications,
          userAlerts: settings.user_alerts,
          systemAlerts: settings.system_alerts,
          reportsEnabled: settings.reports_enabled,
          maintenanceAlerts: settings.maintenance_alerts
        },
        billing: {
          currentPlan: settings.current_plan || 'free',
          billingEmail: settings.billing_email || '',
          paymentMethod: settings.payment_method || '',
          autoRenewal: settings.auto_renewal
        }
      }
    });
  } catch (error) {
    console.error('Error fetching client settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuraciones del cliente
export async function PUT(request: NextRequest) {
  try {
    // Verificación simplificada (mismo patrón que GET)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token) as any;
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    // Obtener usuario con su cliente
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        role: { select: { name: true } },
        access_user_client: {
          select: {
            client_id: true,
            clients: { select: { nombre: true, description: true } }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 401 }
      );
    }

    const role = (decoded.role || user.role?.name || '').toLowerCase();
    const allowedRoles = new Set(['admin', 'admin-client', 'admin_client', 'super_admin', 'superadmin', 'editor']);
    if (!allowedRoles.has(role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }

    // Obtener clientId con fallback
    let effectiveClientId = user.access_user_client?.[0]?.client_id || decoded.clientId || decoded.client_id;
    if (!effectiveClientId) {
      const clientAccess = await prisma.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT auc.client_id FROM access_user_client auc WHERE auc.user_id = $1::uuid LIMIT 1
      `, decoded.userId);
      if (clientAccess.length > 0) {
        effectiveClientId = clientAccess[0].client_id;
      } else {
        const anyClient = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM clients LIMIT 1`);
        if (anyClient.length > 0) effectiveClientId = anyClient[0].id;
      }
    }

    if (!effectiveClientId) {
      return NextResponse.json(
        { success: false, message: 'No se encontró cliente asociado.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { profile, appearance, general, security, notifications, billing } = body;

    const companyName = profile?.companyName ?? general?.companyName;
    const companyDescription = profile?.companyDescription ?? general?.companyDescription;
    const rawTheme = appearance?.uiTheme;
    const nextTheme: 'light' | 'dark' | null = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : null;
    const hasAvatar = !!profile && Object.prototype.hasOwnProperty.call(profile, 'avatarData');
    const nextAvatar: string | null = hasAvatar ? (profile?.avatarData ?? null) : null;

    const settings = await prisma.client_settings.upsert({
      where: { client_id: effectiveClientId },
      create: {
        client_id: effectiveClientId,
        company_name: companyName ?? user.access_user_client?.[0]?.clients?.nombre ?? null,
        company_description: companyDescription ?? user.access_user_client?.[0]?.clients?.description ?? null,
        timezone: general?.timezone ?? 'UTC',
        language: general?.language ?? 'es',
        two_factor_enabled: security?.twoFactorEnabled ?? false,
        session_timeout: security?.sessionTimeout ?? 30,
        password_min_length: security?.passwordPolicy?.minLength ?? 8,
        password_require_special: security?.passwordPolicy?.requireSpecialChars ?? true,
        password_require_numbers: security?.passwordPolicy?.requireNumbers ?? true,
        password_require_uppercase: security?.passwordPolicy?.requireUppercase ?? true,
        ip_whitelist: security?.ipWhitelist ?? [],
        email_notifications: notifications?.emailNotifications ?? true,
        sms_notifications: notifications?.smsNotifications ?? false,
        user_alerts: notifications?.userAlerts ?? true,
        system_alerts: notifications?.systemAlerts ?? true,
        reports_enabled: notifications?.reportsEnabled ?? true,
        maintenance_alerts: notifications?.maintenanceAlerts ?? true,
        current_plan: billing?.currentPlan ?? 'free',
        billing_email: billing?.billingEmail ?? '',
        payment_method: billing?.paymentMethod ?? '',
        auto_renewal: billing?.autoRenewal ?? true,
        updated_at: new Date()
      },
      update: {
        company_name: companyName,
        company_description: companyDescription,
        timezone: general?.timezone,
        language: general?.language,
        two_factor_enabled: security?.twoFactorEnabled,
        session_timeout: security?.sessionTimeout,
        password_min_length: security?.passwordPolicy?.minLength,
        password_require_special: security?.passwordPolicy?.requireSpecialChars,
        password_require_numbers: security?.passwordPolicy?.requireNumbers,
        password_require_uppercase: security?.passwordPolicy?.requireUppercase,
        ip_whitelist: security?.ipWhitelist,
        email_notifications: notifications?.emailNotifications,
        sms_notifications: notifications?.smsNotifications,
        user_alerts: notifications?.userAlerts,
        system_alerts: notifications?.systemAlerts,
        reports_enabled: notifications?.reportsEnabled,
        maintenance_alerts: notifications?.maintenanceAlerts,
        current_plan: billing?.currentPlan,
        billing_email: billing?.billingEmail,
        payment_method: billing?.paymentMethod,
        auto_renewal: billing?.autoRenewal,
        updated_at: new Date()
      }
    });

    if (typeof companyName === 'string' || typeof companyDescription === 'string') {
      try {
        await prisma.clients.update({
          where: { id: effectiveClientId },
          data: {
            ...(typeof companyName === 'string' ? { nombre: companyName } : {}),
            ...(typeof companyDescription === 'string' ? { description: companyDescription } : {})
          }
        });
      } catch (clientUpdateError) {
        console.warn('Settings PUT - clients update failed:', clientUpdateError);
      }
    }

    if (nextTheme || hasAvatar) {
      try {
        const updates: string[] = [];
        const params: any[] = [effectiveClientId];
        let idx = 2;
        if (nextTheme) {
          updates.push(`ui_theme = $${idx}`);
          params.push(nextTheme);
          idx += 1;
        }
        if (hasAvatar) {
          updates.push(`avatar_data = $${idx}`);
          params.push(nextAvatar);
          idx += 1;
        }
        updates.push(`updated_at = NOW()`);

        await prisma.$executeRawUnsafe(
          `UPDATE client_settings SET ${updates.join(', ')} WHERE client_id = $1::uuid`,
          ...params
        );
      } catch (uiUpdateError) {
        console.warn('Settings PUT - ui fields update failed:', uiUpdateError);
      }
    }

    const freshSettings = await prisma.client_settings.findUnique({
      where: { client_id: effectiveClientId }
    });

    let mergedSettings: any = freshSettings ?? settings;
    try {
      const uiRow = await prisma.$queryRawUnsafe<any[]>(
        `SELECT ui_theme, avatar_data FROM client_settings WHERE client_id = $1::uuid LIMIT 1`,
        effectiveClientId
      );
      if (uiRow?.[0]) {
        mergedSettings = {
          ...mergedSettings,
          ui_theme: uiRow[0]?.ui_theme ?? null,
          avatar_data: uiRow[0]?.avatar_data ?? null
        };
      }
    } catch (uiSelectError) {
      console.warn('Settings PUT - ui fields fetch failed:', uiSelectError);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuraciones guardadas exitosamente',
      data: mergedSettings
    });
  } catch (error) {
    console.error('Error updating client settings:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}