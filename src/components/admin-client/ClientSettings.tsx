'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, CreditCard, Loader2, Palette, Save, Settings, Shield, Trash2, Upload, User, UserCog, Eye, EyeOff, FileText, CheckCircle, AlertCircle, Calendar, ExternalLink, Building2, FolderKanban, Bot, Users, Mail, MessageSquare, UserPlus, Server, PenTool, Lock, Globe, Smartphone, Key, Clock, Activity, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { applyAppTheme, startThemeTransition } from '@/lib/theme/theme-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import BillingTab from '@/components/billing/BillingTab';
import { Plan, BillingInterval, PLANS, getPlanById, formatLimit } from '@/lib/billing/plans';
// Notificaciones manejadas a través de showNotification prop

interface ClientSettingsProps {
  clientData: any;
  showNotification?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ClientSettings({ clientData, showNotification }: ClientSettingsProps) {
  // Abrir por defecto en "Mi cuenta"
  const [activeSection, setActiveSection] = useState('myaccount');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { applyThemeClass, themeMode } = useThemeMode();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const normalizePlanId = (value: string) => {
    if (!value) return 'free';
    const v = value.toLowerCase();
    if (v === 'basic') return 'free';
    if (v === 'business') return 'pro';
    if (v === 'pro') return 'pro';
    if (v === 'enterprise') return 'enterprise';
    if (v === 'free') return 'free';
    return 'free';
  };
  
  // Estados para configuraciones
  const [profileSettings, setProfileSettings] = useState({
    companyName: '',
    companyDescription: '',
    avatarData: null as string | null,
  });
  const [initialProfileSettings, setInitialProfileSettings] = useState(profileSettings);

  const [appearanceSettings, setAppearanceSettings] = useState({
    uiTheme: themeMode,
  });
  const [initialAppearanceSettings, setInitialAppearanceSettings] = useState(appearanceSettings);

  const [generalSettings, setGeneralSettings] = useState({
    timezone: 'UTC',
    language: 'es'
  });
  const [initialGeneralSettings, setInitialGeneralSettings] = useState(generalSettings);

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true
    },
    ipWhitelist: [] as string[]
  });
  const [initialSecuritySettings, setInitialSecuritySettings] = useState(securitySettings);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    userAlerts: true,
    systemAlerts: true,
    reportsEnabled: true,
    maintenanceAlerts: true
  });
  const [initialNotificationSettings, setInitialNotificationSettings] = useState(notificationSettings);

  const [billingSettings, setBillingSettings] = useState({
    currentPlan: 'free',
    billingEmail: '',
    autoRenewal: true,
    paymentMethod: ''
  });
  const [initialBillingSettings, setInitialBillingSettings] = useState(billingSettings);
  const [billingOrganizations, setBillingOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [selectedBillingOrgId, setSelectedBillingOrgId] = useState<string>('');
  const [billingStatusLoading, setBillingStatusLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<any | null>(null);
  const [billingStatusError, setBillingStatusError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const [billingStatusMeta, setBillingStatusMeta] = useState<{
    orgPlanId: string | null;
    planId: string | null;
    planName: string | null;
  }>({
    orgPlanId: null,
    planId: null,
    planName: null,
  });

  const [billingOrgStats, setBillingOrgStats] = useState<{
    totalOrganizations: number;
    totalProjects: number;
    totalChatbots: number;
    totalUsers: number;
    totalMessagesThisMonth: number;
  } | null>(null);

  // Estado para Mi Cuenta (perfil del usuario actual)
  const [myAccountSettings, setMyAccountSettings] = useState({
    username: '',
    email: '',
    avatarData: null as string | null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [initialMyAccountSettings, setInitialMyAccountSettings] = useState({
    username: '',
    email: '',
    avatarData: null as string | null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Funciones para verificar si hay cambios en cada sección
  const hasProfileChanges = JSON.stringify(profileSettings) !== JSON.stringify(initialProfileSettings);
  const hasAppearanceChanges = JSON.stringify(appearanceSettings) !== JSON.stringify(initialAppearanceSettings);
  const hasGeneralChanges = JSON.stringify(generalSettings) !== JSON.stringify(initialGeneralSettings);
  const hasSecurityChanges = JSON.stringify(securitySettings) !== JSON.stringify(initialSecuritySettings);
  const hasNotificationChanges = JSON.stringify(notificationSettings) !== JSON.stringify(initialNotificationSettings);
  const hasMyAccountChanges = myAccountSettings.username !== initialMyAccountSettings.username ||
    myAccountSettings.email !== initialMyAccountSettings.email ||
    myAccountSettings.avatarData !== initialMyAccountSettings.avatarData ||
    myAccountSettings.newPassword.length > 0;
  const hasBillingChanges = JSON.stringify(billingSettings) !== JSON.stringify(initialBillingSettings);

  // Función para mostrar notificaciones
  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    if (showNotification) {
      showNotification(type, message);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  };

  const getInitials = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'NA';
    const parts = trimmed.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  const applyThemePreference = (mode: 'light' | 'dark', animate = false) => {
    if (typeof window === 'undefined') return;

    if (animate) {
      startThemeTransition(() => {
        applyAppTheme(mode);
      }, { start: 'center', variant: 'circle' });
      return;
    }

    applyAppTheme(mode);
  };

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('error', 'Selecciona una imagen válida.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      notify('error', 'La imagen debe pesar menos de 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setProfileSettings((prev) => ({ ...prev, avatarData: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUserAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('error', 'Selecciona una imagen válida.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      notify('error', 'La imagen debe pesar menos de 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setMyAccountSettings((prev) => ({ ...prev, avatarData: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchSettings = async (token: string) => {
    const response = await fetch('/api/admin-client/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar configuraciones');
    }

    const data = await response.json();

    if (data.success && data.data) {
      if (data.data.profile || data.data.general) {
        const profileData = {
          companyName: data.data.profile?.companyName ?? data.data.general?.companyName ?? '',
          companyDescription: data.data.profile?.companyDescription ?? data.data.general?.companyDescription ?? '',
          avatarData: data.data.profile?.avatarData ?? null,
        };
        setProfileSettings(profileData);
        setInitialProfileSettings(profileData);
      }

      const storedTheme = window.localStorage.getItem('minddash-theme');
      const localTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
      const serverTheme = data.data.appearance?.uiTheme === 'light' || data.data.appearance?.uiTheme === 'dark' ? data.data.appearance.uiTheme : null;
      const effectiveTheme = (localTheme ?? serverTheme ?? themeMode) as 'light' | 'dark';
      const appearanceData = {
        uiTheme: effectiveTheme,
      };
      setAppearanceSettings(appearanceData);
      setInitialAppearanceSettings(appearanceData);
      applyThemePreference(effectiveTheme);

      if (data.data.general) {
        const generalData = {
          timezone: data.data.general.timezone || 'UTC',
          language: data.data.general.language || 'es'
        };
        setGeneralSettings(generalData);
        setInitialGeneralSettings(generalData);
      }

      if (data.data.security) {
        const securityData = {
          twoFactorEnabled: data.data.security.twoFactorEnabled || false,
          sessionTimeout: data.data.security.sessionTimeout || 30,
          passwordPolicy: data.data.security.passwordPolicy || {
            minLength: 8,
            requireSpecialChars: true,
            requireNumbers: true,
            requireUppercase: true
          },
          ipWhitelist: data.data.security.ipWhitelist || []
        };
        setSecuritySettings(securityData);
        setInitialSecuritySettings(securityData);
      }

      if (data.data.notifications) {
        const notificationData = {
          emailNotifications: data.data.notifications.emailNotifications ?? true,
          smsNotifications: data.data.notifications.smsNotifications ?? false,
          userAlerts: data.data.notifications.userAlerts ?? true,
          systemAlerts: data.data.notifications.systemAlerts ?? true,
          reportsEnabled: data.data.notifications.reportsEnabled ?? true,
          maintenanceAlerts: data.data.notifications.maintenanceAlerts ?? true
        };
        setNotificationSettings(notificationData);
        setInitialNotificationSettings(notificationData);
      }

      if (data.data.billing) {
        const billingData = {
          currentPlan: normalizePlanId(data.data.billing.currentPlan || 'free'),
          billingEmail: data.data.billing.billingEmail || '',
          autoRenewal: data.data.billing.autoRenewal ?? true,
          paymentMethod: data.data.billing.paymentMethod || ''
        };
        setBillingSettings(billingData);
        setInitialBillingSettings(billingData);
      }
    }
  };

  const loadBillingOrganizationsAndStatus = async () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return;

    const auth = JSON.parse(authData);
    const orgsResp = await fetch('/api/admin-client/organizations/stats', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const orgsJson = await orgsResp.json();
    const orgs = Array.isArray(orgsJson?.organizations) ? orgsJson.organizations : [];
    setBillingOrgStats(orgsJson?.stats || null);
    const nextOrgs = orgs
      .map((o: any) => ({ id: o.id, name: o.name }))
      .filter((o: any) => typeof o.id === 'string' && typeof o.name === 'string');

    setBillingOrganizations(nextOrgs);

    const storedOrgId = typeof window !== 'undefined' ? sessionStorage.getItem('selectedOrgId') : null;
    const firstOrgId = nextOrgs[0]?.id || '';
    const nextSelected = (storedOrgId && nextOrgs.some((o: any) => o.id === storedOrgId)) ? storedOrgId : firstOrgId;
    if (nextSelected && nextSelected !== selectedBillingOrgId) {
      setSelectedBillingOrgId(nextSelected);
    }
  };

  const loadBillingStatus = async (organizationId: string) => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return;

    const auth = JSON.parse(authData);
    setBillingStatusLoading(true);
    setBillingStatusError(null);
    try {
      const resp = await fetch('/api/backend/billing/status-by-org', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      const json = await resp.json();
      if (json?.success) {
        const data = json.data;
        const meta = {
          orgPlanId: (data?.org_plan_id || data?.orgPlanId || null) as string | null,
          planId: (data?.plan_id || data?.planId || data?.plan_details?.id || null) as string | null,
          planName: (data?.plan_name || data?.planName || data?.plan_details?.plan_name || data?.plan_details?.planName || null) as string | null,
        };

        setBillingStatus(data);
        setBillingStatusMeta(meta);
      } else {
        setBillingStatus(null);
        setBillingStatusMeta({ orgPlanId: null, planId: null, planName: null });
        setBillingStatusError(json?.message || 'No se pudo obtener el estado de billing.');
      }
    } catch (e: any) {
      setBillingStatus(null);
      setBillingStatusMeta({ orgPlanId: null, planId: null, planName: null });
      setBillingStatusError(e?.message || 'Error de conexión al obtener estado de billing.');
    } finally {
      setBillingStatusLoading(false);
    }
  };

  const getQuotaLabel = (metricName: string) => {
    const key = (metricName || '').toLowerCase();
    const map: Record<string, string> = {
      organizations: 'Organizaciones',
      organization: 'Organizaciones',
      orgs: 'Organizaciones',
      projects: 'Proyectos',
      project: 'Proyectos',
      chatbots: 'Chatbots',
      chatbot: 'Chatbots',
      users: 'Usuarios',
      user: 'Usuarios',
      messages: 'Mensajes/mes',
      messagespermonth: 'Mensajes/mes',
      messages_per_month: 'Mensajes/mes',
    };
    return map[key] || metricName;
  };

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const authData = localStorage.getItem('evolve-auth');
         if (!authData) {
           notify('error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
           return;
         }

         const auth = JSON.parse(authData);

        await fetchSettings(auth.accessToken);

        let meProfile: { username?: string; email?: string; avatarData?: string | null } | null = null;
        try {
          const meResp = await fetch('/api/admin-client/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${auth.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (meResp.ok) {
            const meJson = await meResp.json();
            meProfile = meJson?.data?.profile ?? null;
          }
        } catch (e) {
          console.error('Error cargando perfil /me:', e);
        }

        const myAccountData = {
          username: meProfile?.username ?? auth.username ?? '',
          email: meProfile?.email ?? auth.email ?? '',
          avatarData: meProfile?.avatarData ?? null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
        setMyAccountSettings(myAccountData);
        setInitialMyAccountSettings({ ...myAccountData });
      
      } catch (error) {
        console.error('Error al cargar configuraciones:', error);
        notify('error', 'Error al cargar las configuraciones');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (activeSection !== 'billing') return;
    void loadBillingOrganizationsAndStatus();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'billing') return;
    if (!selectedBillingOrgId) return;
    void loadBillingStatus(selectedBillingOrgId);
  }, [activeSection, selectedBillingOrgId]);

  const handleSaveSettings = async (section: string) => {
    setSaving(true);
    try {
      if (section === 'myaccount') {
        await handleSaveMyAccount();
        return;
      }

      // Obtener token de acceso
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) {
        notify('error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const auth = JSON.parse(authData);
      
      // Preparar datos en el formato que espera la API
      const requestData = {
        profile: profileSettings,
        appearance: appearanceSettings,
        general: generalSettings,
        security: securitySettings,
        notifications: notificationSettings,
        billing: billingSettings
      };

      const response = await fetch('/api/admin-client/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (!result.success) {
        notify('error', result.message || 'Error guardando configuraciones');
        return;
      }

      notify('success', 'Configuraciones guardadas exitosamente');

      if (typeof window !== 'undefined') {
        const updatedAvatar = result?.data?.avatar_data ?? null;
        const updatedTheme = result?.data?.ui_theme;
        window.dispatchEvent(new CustomEvent('client-settings-updated', {
          detail: {
            avatarData: updatedAvatar,
            uiTheme: updatedTheme,
            companyName: result?.data?.company_name ?? undefined,
            companyDescription: result?.data?.company_description ?? undefined,
          }
        }));
      }

      await fetchSettings(auth.accessToken);
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
      notify('error', 'Error de conexión. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSection = (section: string) => {
    if (section === 'profile') {
      setProfileSettings(initialProfileSettings);
      return;
    }
    if (section === 'appearance') {
      setAppearanceSettings(initialAppearanceSettings);
      applyThemePreference(initialAppearanceSettings.uiTheme, true);
      return;
    }
    if (section === 'general') {
      setGeneralSettings(initialGeneralSettings);
      return;
    }
    if (section === 'security') {
      setSecuritySettings(initialSecuritySettings);
      return;
    }
    if (section === 'notifications') {
      setNotificationSettings(initialNotificationSettings);
      return;
    }
    if (section === 'billing') {
      setBillingSettings(initialBillingSettings);
    }
    if (section === 'myaccount') {
      setMyAccountSettings({
        ...initialMyAccountSettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  // Función para guardar cambios de Mi Cuenta
  const handleSaveMyAccount = async () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      notify('error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const auth = JSON.parse(authData);

    // Validar contraseñas si se está cambiando
    if (myAccountSettings.newPassword) {
      if (myAccountSettings.newPassword !== myAccountSettings.confirmPassword) {
        notify('error', 'Las contraseñas no coinciden');
        return;
      }
      if (myAccountSettings.newPassword.length < 8) {
        notify('error', 'La contraseña debe tener al menos 8 caracteres');
        return;
      }
      if (!myAccountSettings.currentPassword) {
        notify('error', 'Debes ingresar tu contraseña actual para cambiarla');
        return;
      }
    }

    try {
      const response = await fetch('/api/admin-client/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`
        },
        body: JSON.stringify({
          username: myAccountSettings.username,
          email: myAccountSettings.email,
          avatarData: myAccountSettings.avatarData,
          ...(myAccountSettings.newPassword && {
            currentPassword: myAccountSettings.currentPassword,
            password: myAccountSettings.newPassword,
          })
        })
      });

      const result = await response.json();

      if (!result.success) {
        notify('error', result.message || 'Error actualizando perfil');
        return;
      }

      // Actualizar localStorage con nuevos datos
      const updatedAuth = {
        ...auth,
        username: myAccountSettings.username,
        email: myAccountSettings.email,
      };
      localStorage.setItem('evolve-auth', JSON.stringify(updatedAuth));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('evolve-auth-updated', {
          detail: {
            username: myAccountSettings.username,
            email: myAccountSettings.email,
          }
        }));

        window.dispatchEvent(new CustomEvent('user-profile-updated', {
          detail: {
            avatarData: myAccountSettings.avatarData,
          }
        }));
      }

      // Actualizar estado inicial
      setInitialMyAccountSettings({
        username: myAccountSettings.username,
        email: myAccountSettings.email,
        avatarData: myAccountSettings.avatarData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setMyAccountSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      notify('success', 'Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      notify('error', 'Error de conexión. Intenta nuevamente.');
    }
  };

  const sections = [
    { id: 'myaccount', label: 'Mi Cuenta', icon: UserCog, hasChanges: hasMyAccountChanges },
    { id: 'profile', label: 'Perfil Empresa', icon: User, hasChanges: hasProfileChanges },
    { id: 'appearance', label: 'Apariencia', icon: Palette, hasChanges: hasAppearanceChanges },
    { id: 'general', label: 'General', icon: Settings, hasChanges: hasGeneralChanges },
    { id: 'security', label: 'Seguridad', icon: Shield, hasChanges: hasSecurityChanges },
    { id: 'notifications', label: 'Notificaciones', icon: Bell, hasChanges: hasNotificationChanges },
    { id: 'billing', label: 'Facturación', icon: CreditCard, hasChanges: hasBillingChanges },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
          Configuración de Empresa
        </h2>
        <p className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
          Gestiona la configuración y preferencias de tu empresa
        </p>
      </div>

      <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />

      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-64">
            <TabsList
              className={applyThemeClass(
                'flex h-auto w-full flex-col items-stretch justify-start gap-1 bg-transparent p-0',
                'flex h-auto w-full flex-col items-stretch justify-start gap-1 bg-transparent p-0'
              )}
            >
              {sections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className={applyThemeClass(
                    'w-full justify-start gap-3 rounded-lg px-3 py-2 text-left text-gray-400 data-[state=active]:bg-minddash-card data-[state=active]:text-white',
                    `w-full justify-start gap-3 rounded-lg px-3 py-2 text-left ${LIGHT_THEME_CLASSES.TEXT_SECONDARY} data-[state=active]:bg-white data-[state=active]:text-gray-900`
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="flex-1">{section.label}</span>
                  {section.hasChanges && <span className="h-2 w-2 rounded-full bg-green-500" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>

          <div className="flex-1 space-y-6">
            {/* Mi Cuenta - Perfil del usuario actual */}
            <TabsContent value="myaccount" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      Mi Cuenta
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Gestiona tu información personal y credenciales de acceso.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={myAccountSettings.avatarData || undefined}
                          alt={myAccountSettings.username || 'Mi perfil'}
                        />
                        <AvatarFallback className="text-sm">
                          {getInitials(myAccountSettings.username)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Input
                            ref={userAvatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUserAvatarFile(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => userAvatarInputRef.current?.click()}
                            disabled={saving}
                          >
                            <Upload className="h-4 w-4" />
                            Subir avatar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMyAccountSettings((prev) => ({ ...prev, avatarData: null }))}
                            disabled={saving || !myAccountSettings.avatarData}
                          >
                            <Trash2 className="h-4 w-4" />
                            Quitar avatar
                          </Button>
                        </div>
                        <p className={`text-xs ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>
                          Tu avatar es personal y solo aplica a tu cuenta.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Nombre de usuario
                        </Label>
                        <Input
                          type="text"
                          value={myAccountSettings.username}
                          onChange={(e) => setMyAccountSettings({ ...myAccountSettings, username: e.target.value })}
                          className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}
                          placeholder="Tu nombre de usuario"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Correo electrónico
                        </Label>
                        <Input
                          type="email"
                          value={myAccountSettings.email}
                          onChange={(e) => setMyAccountSettings({ ...myAccountSettings, email: e.target.value })}
                          className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>

                    <Separator className={applyThemeClass('bg-gray-800', 'bg-gray-200')} />

                    <div>
                      <h4 className={`text-sm font-medium mb-4 ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                        Cambiar contraseña
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                            Contraseña actual
                          </Label>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={myAccountSettings.currentPassword}
                              onChange={(e) => setMyAccountSettings({ ...myAccountSettings, currentPassword: e.target.value })}
                              className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white pr-10', LIGHT_THEME_CLASSES.INPUT)}
                              placeholder="Ingresa tu contraseña actual"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-500 hover:text-gray-700')}`}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                              Nueva contraseña
                            </Label>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? 'text' : 'password'}
                                value={myAccountSettings.newPassword}
                                onChange={(e) => setMyAccountSettings({ ...myAccountSettings, newPassword: e.target.value })}
                                className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white pr-10', LIGHT_THEME_CLASSES.INPUT)}
                                placeholder="Mínimo 8 caracteres"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-500 hover:text-gray-700')}`}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                              Confirmar nueva contraseña
                            </Label>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={myAccountSettings.confirmPassword}
                                onChange={(e) => setMyAccountSettings({ ...myAccountSettings, confirmPassword: e.target.value })}
                                className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white pr-10', LIGHT_THEME_CLASSES.INPUT)}
                                placeholder="Repite la nueva contraseña"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${applyThemeClass('text-gray-400 hover:text-white', 'text-gray-500 hover:text-gray-700')}`}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className={`text-xs ${applyThemeClass('text-gray-500', 'text-gray-500')}`}>
                          Deja los campos de contraseña vacíos si no deseas cambiarla.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('myaccount')}
                      disabled={saving || !hasMyAccountChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('myaccount')}
                      disabled={saving || !hasMyAccountChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="profile" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      Perfil
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Edita la información pública de la empresa.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profileSettings.avatarData || undefined} alt={profileSettings.companyName || 'Empresa'} />
                        <AvatarFallback className="text-sm">
                          {getInitials(profileSettings.companyName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarFile(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={saving}
                          >
                            <Upload className="h-4 w-4" />
                            Subir avatar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setProfileSettings((prev) => ({ ...prev, avatarData: null }))}
                            disabled={saving || !profileSettings.avatarData}
                          >
                            <Trash2 className="h-4 w-4" />
                            Quitar
                          </Button>
                        </div>
                        <p className={applyThemeClass('text-xs text-gray-500', 'text-xs text-gray-500')}>
                          El avatar se persistirá en la base de datos cuando backend habilite el campo correspondiente.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Nombre de la empresa
                        </Label>
                        <Input
                          type="text"
                          value={profileSettings.companyName}
                          onChange={(e) => setProfileSettings({ ...profileSettings, companyName: e.target.value })}
                          className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}
                          placeholder="Nombre de tu empresa"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Descripción
                        </Label>
                        <Textarea
                          value={profileSettings.companyDescription}
                          onChange={(e) => setProfileSettings({ ...profileSettings, companyDescription: e.target.value })}
                          className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}
                          rows={3}
                          placeholder="Describe brevemente tu empresa"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('profile')}
                      disabled={saving || !hasProfileChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('profile')}
                      disabled={saving || !hasProfileChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="appearance" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      Apariencia
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Personaliza la apariencia de la plataforma.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                        Tema
                      </Label>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {([
                          { value: 'dark', title: 'Oscuro' },
                          { value: 'light', title: 'Claro' },
                        ] as const).map((option) => {
                          const selected = appearanceSettings.uiTheme === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setAppearanceSettings({ uiTheme: option.value });
                                applyThemePreference(option.value, true);
                              }}
                              className={applyThemeClass(
                                `rounded-xl border p-4 text-left transition-colors ${
                                  selected
                                    ? 'border-green-600 bg-green-600/10'
                                    : 'border-minddash-border bg-minddash-surface hover:bg-minddash-card'
                                }`,
                                `rounded-xl border p-4 text-left transition-colors ${
                                  selected
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`
                              )}
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Palette className="h-4 w-4" />
                                  <span className={`font-medium ${applyThemeClass('text-white', 'text-gray-900')}`}>{option.title}</span>
                                </div>
                                {selected && <span className="h-2 w-2 rounded-full bg-green-500" />}
                              </div>

                              <div className="space-y-2">
                                <Skeleton className={applyThemeClass('h-4 w-3/4 bg-gray-800', 'h-4 w-3/4 bg-gray-200')} />
                                <Skeleton className={applyThemeClass('h-4 w-5/6 bg-gray-800', 'h-4 w-5/6 bg-gray-200')} />
                                <Skeleton className={applyThemeClass('h-8 w-full bg-gray-800', 'h-8 w-full bg-gray-200')} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className={applyThemeClass('text-xs text-gray-500', 'text-xs text-gray-500')}>
                        El tema se aplica y se guarda localmente (en tu navegador). La persistencia en DB se habilitará cuando backend agregue el campo.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('appearance')}
                      disabled={saving || !hasAppearanceChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('appearance')}
                      disabled={saving || !hasAppearanceChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="general" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      General
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Preferencias regionales.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Zona horaria
                        </Label>
                        <Select
                          value={generalSettings.timezone}
                          onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                        >
                          <SelectTrigger className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}>
                            <SelectValue placeholder="Seleccionar zona horaria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/Santiago">Santiago (UTC-3)</SelectItem>
                            <SelectItem value="America/New_York">Nueva York (UTC-5)</SelectItem>
                            <SelectItem value="Europe/Madrid">Madrid (UTC+1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                          Idioma
                        </Label>
                        <Select
                          value={generalSettings.language}
                          onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}
                        >
                          <SelectTrigger className={applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT)}>
                            <SelectValue placeholder="Seleccionar idioma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="pt">Português</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('general')}
                      disabled={saving || !hasGeneralChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('general')}
                      disabled={saving || !hasGeneralChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      Seguridad
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Preferencias de seguridad y políticas de acceso.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                  
                  {/* 2FA Section */}
                  <div className={cn('flex items-center justify-between p-5 rounded-xl border', applyThemeClass('bg-minddash-surface border-minddash-border', 'bg-white border-gray-200'))}>
                    <div className="flex items-center gap-4">
                      <div className={cn('p-3 rounded-lg', applyThemeClass('bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-600'))}>
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className={cn('font-medium text-base', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                          Autenticación de dos factores
                        </h4>
                        <p className={cn('text-sm mt-0.5', applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>
                          Añade una capa extra de seguridad a tu cuenta mediante SMS o App.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={securitySettings.twoFactorEnabled}
                      onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, twoFactorEnabled: checked })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                        Configuración de sesión
                      </Label>
                      <div className={cn('p-4 rounded-xl border', applyThemeClass('bg-minddash-surface border-minddash-border', 'bg-white border-gray-200'))}>
                        <div className="flex items-center gap-3 mb-3">
                          <Clock className={cn('w-4 h-4', applyThemeClass('text-gray-500', 'text-gray-400'))} />
                          <span className={cn('text-sm font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                            Tiempo de expiración
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={securitySettings.sessionTimeout}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                            className={cn('flex-1', applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT))}
                            min="5"
                            max="10080"
                            placeholder="30"
                          />
                          <span className={cn('text-sm', applyThemeClass('text-gray-500', 'text-gray-500'))}>minutos</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                        Seguridad de contraseña
                      </Label>
                      <div className={cn('p-4 rounded-xl border', applyThemeClass('bg-minddash-surface border-minddash-border', 'bg-white border-gray-200'))}>
                        <div className="flex items-center gap-3 mb-3">
                          <Key className={cn('w-4 h-4', applyThemeClass('text-gray-500', 'text-gray-400'))} />
                          <span className={cn('text-sm font-medium', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>
                            Longitud mínima
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={securitySettings.passwordPolicy.minLength}
                            onChange={(e) =>
                              setSecuritySettings({
                                ...securitySettings,
                                passwordPolicy: {
                                  ...securitySettings.passwordPolicy,
                                  minLength: parseInt(e.target.value)
                                }
                              })
                            }
                            className={cn('flex-1', applyThemeClass('bg-minddash-elevated border-minddash-border text-white', LIGHT_THEME_CLASSES.INPUT))}
                            min="4"
                            max="50"
                          />
                          <span className={cn('text-sm', applyThemeClass('text-gray-500', 'text-gray-500'))}>caracteres</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password Policy Grid */}
                  <div className="space-y-3">
                    <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Requerimientos de complejidad
                    </Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Caracteres especiales', key: 'requireSpecialChars', icon: Lock },
                        { label: 'Números', key: 'requireNumbers', icon: FileText },
                        { label: 'Mayúsculas', key: 'requireUppercase', icon: Type }
                      ].map((item) => (
                        <div key={item.key} className={cn('flex items-center justify-between p-4 rounded-xl border transition-colors', applyThemeClass('bg-minddash-surface border-minddash-border hover:border-gray-600', 'bg-white border-gray-200 hover:border-gray-300'))}>
                          <span className={cn('text-sm font-medium', applyThemeClass('text-gray-300', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>{item.label}</span>
                          <Switch
                            checked={(securitySettings.passwordPolicy as any)[item.key]}
                            onCheckedChange={(checked) =>
                              setSecuritySettings({
                                ...securitySettings,
                                passwordPolicy: {
                                  ...securitySettings.passwordPolicy,
                                  [item.key]: checked
                                }
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Control de acceso (IP Whitelist)
                    </Label>
                    <div className={cn('relative rounded-xl border overflow-hidden', applyThemeClass('border-gray-800', 'border-gray-200'))}>
                      <div className={cn('absolute top-3 left-3 pointer-events-none', applyThemeClass('text-gray-500', 'text-gray-400'))}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <Textarea
                        value={securitySettings.ipWhitelist.join('\n')}
                        onChange={(e) => {
                          const newIpWhitelist: string[] = e.target.value
                            .split('\n')
                            .filter((ip) => ip.trim() !== '')
                            .map((ip) => ip.trim());
                          setSecuritySettings({
                            ...securitySettings,
                            ipWhitelist: newIpWhitelist
                          });
                        }}
                        placeholder="192.168.1.1\n10.0.0.0/24"
                        className={cn('pl-10 min-h-[100px] resize-y', applyThemeClass('bg-minddash-surface border-0 text-white placeholder:text-gray-600', 'bg-white border-0 text-gray-900 placeholder:text-gray-400'))}
                        rows={3}
                      />
                    </div>
                    <p className={cn('text-xs', applyThemeClass('text-gray-500', 'text-gray-500'))}>
                      Ingresa una dirección IP o rango CIDR por línea. Deja vacío para permitir todas.
                    </p>
                  </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('security')}
                      disabled={saving || !hasSecurityChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('security')}
                      disabled={saving || !hasSecurityChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={applyThemeClass('bg-minddash-card border-minddash-border', `${LIGHT_THEME_CLASSES.SURFACE} ${LIGHT_THEME_CLASSES.BORDER}`)}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY)}`}>
                      Notificaciones
                    </CardTitle>
                    <CardDescription className={applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY)}>
                      Configura qué eventos generan alertas y por qué medio.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'emailNotifications', label: 'Email', desc: 'Alertas importantes por correo', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { key: 'smsNotifications', label: 'SMS', desc: 'Alertas críticas a tu móvil', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { key: 'userAlerts', label: 'Nuevos Usuarios', desc: 'Cuando alguien se registra', icon: UserPlus, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { key: 'systemAlerts', label: 'Sistema', desc: 'Estado y salud del servicio', icon: Server, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                        { key: 'reportsEnabled', label: 'Reportes', desc: 'Resumen periódico de actividad', icon: FileText, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                        { key: 'maintenanceAlerts', label: 'Mantenimiento', desc: 'Avisos de paradas programadas', icon: PenTool, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
                      ].map((setting) => (
                        <div key={setting.key} className={cn('flex items-start justify-between p-4 rounded-xl border transition-colors', applyThemeClass('bg-minddash-surface border-minddash-border hover:border-gray-600', 'bg-white border-gray-200 hover:border-gray-300'))}>
                          <div className="flex gap-3">
                            <div className={cn('p-2.5 rounded-lg h-fit', applyThemeClass(setting.bg, 'bg-gray-100'))}>
                              <setting.icon className={cn('w-5 h-5', applyThemeClass(setting.color, 'text-gray-700'))} />
                            </div>
                            <div>
                              <h4 className={cn('font-medium text-sm', applyThemeClass('text-white', LIGHT_THEME_CLASSES.TEXT_PRIMARY))}>{setting.label}</h4>
                              <p className={cn('text-xs mt-0.5', applyThemeClass('text-gray-400', LIGHT_THEME_CLASSES.TEXT_SECONDARY))}>{setting.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={(notificationSettings as any)[setting.key]}
                            onCheckedChange={(checked) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                [setting.key]: checked
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetSection('notifications')}
                      disabled={saving || !hasNotificationChanges}
                    >
                      Restablecer
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSaveSettings('notifications')}
                      disabled={saving || !hasNotificationChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="billing" className="m-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <BillingTab
                  billingSettings={billingSettings}
                  setBillingSettings={setBillingSettings}
                  billingOrganizations={billingOrganizations}
                  selectedBillingOrgId={selectedBillingOrgId}
                  setSelectedBillingOrgId={setSelectedBillingOrgId}
                  billingOrgStats={billingOrgStats}
                  billingStatusLoading={billingStatusLoading}
                  billingStatusError={billingStatusError}
                  billingStatusMeta={billingStatusMeta}
                  upgradeLoading={upgradeLoading}
                  setUpgradeLoading={setUpgradeLoading}
                  loadBillingStatus={loadBillingStatus}
                  handleSaveSettings={handleSaveSettings}
                  hasBillingChanges={hasBillingChanges}
                  handleResetSection={handleResetSection}
                  saving={saving}
                  notify={notify}
                />
              </motion.div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {ConfirmDialog}
    </div>
  );
}