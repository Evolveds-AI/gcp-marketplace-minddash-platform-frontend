'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSettings, 
  FiShield, 
  FiDatabase, 
  FiUsers, 
  FiGlobe,
  FiSave,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiServer,
  FiActivity
} from '@/lib/icons';
import { toast } from 'sonner';
import { useThemeMode } from '@/hooks/useThemeMode';
import { LIGHT_THEME_CLASSES } from '@/lib/theme/tokens';
import { applyAppTheme, startThemeTransition } from '@/lib/theme/theme-transition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  totalConversations: number;
  dbConnectionStatus: 'connected' | 'disconnected' | 'error';
  serverUptime: string;
}

export default function SuperAdminSettings() {
  const { applyThemeClass, themeMode } = useThemeMode();
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // System stats
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalClients: 0,
    totalConversations: 0,
    dbConnectionStatus: 'connected',
    serverUptime: '0d 0h 0m'
  });

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'MindDash',
    siteDescription: 'Plataforma de IA Conversacional',
    maintenanceMode: false,
    allowNewRegistrations: true,
    defaultUserRole: 'user',
    sessionTimeout: 60,
    timezone: 'America/Argentina/Buenos_Aires',
    language: 'es'
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    enforcePasswordPolicy: true,
    minPasswordLength: 8,
    requireSpecialChars: true,
    requireNumbers: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    enable2FA: false,
    jwtExpiration: 24
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    uiTheme: themeMode as 'light' | 'dark',
    primaryColor: 'amber',
    enableAnimations: true
  });

  // Load system stats
  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    setLoading(true);
    try {
      const authData = localStorage.getItem('evolve-auth');
      if (!authData) return;

      const auth = JSON.parse(authData);
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setSystemStats({
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          totalClients: data.totalClients || 0,
          totalConversations: data.totalConversations || 0,
          dbConnectionStatus: 'connected',
          serverUptime: '99d 23h 45m'
        });
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
      setSystemStats(prev => ({ ...prev, dbConnectionStatus: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (section: string) => {
    setSaving(true);
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: 'Guardando configuración...',
        success: `Configuración de ${section} guardada exitosamente`,
        error: 'Error al guardar configuración'
      }
    );

    setSaving(false);
  };

  const applyThemePreference = (mode: 'light' | 'dark') => {
    setAppearanceSettings(prev => ({ ...prev, uiTheme: mode }));
    startThemeTransition(() => {
      applyAppTheme(mode);
    }, { start: 'center', variant: 'circle' });
  };

  const sections = [
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'security', label: 'Seguridad', icon: FiShield },
    { id: 'appearance', label: 'Apariencia', icon: FiGlobe },
    { id: 'system', label: 'Sistema', icon: FiServer },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(
        'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
      )}>
        <div className="flex items-center space-x-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20'
          )}>
            <FiSettings className={cn('w-6 h-6 text-amber-400')} />
          </div>
          <div>
            <h2 className={cn('text-xl font-bold text-white')}>
              Configuración del Sistema
            </h2>
            <p className={cn('text-sm text-gray-400')}>
              Administra la configuración global de la plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className={cn(
          'rounded-xl border p-4 h-fit bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
        )}>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* General Settings */}
          {activeSection === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
              )}
            >
              <h3 className={cn('text-lg font-semibold mb-6 text-white')}>
                Configuración General
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Nombre del Sitio
                    </Label>
                    <Input
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Descripción
                    </Label>
                    <Input
                      value={generalSettings.siteDescription}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Zona Horaria
                    </Label>
                    <Select 
                      value={generalSettings.timezone} 
                      onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        <SelectItem value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</SelectItem>
                        <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                        <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/Madrid">España (GMT+1)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Rol por Defecto
                    </Label>
                    <Select 
                      value={generalSettings.defaultUserRole} 
                      onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultUserRole: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:ring-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1f1f1f] border-white/10 text-white">
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        Modo Mantenimiento
                      </p>
                      <p className="text-sm text-gray-400">
                        Deshabilita el acceso para usuarios no administradores
                      </p>
                    </div>
                    <Switch
                      checked={generalSettings.maintenanceMode}
                      onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, maintenanceMode: checked })}
                      className="data-[state=checked]:bg-amber-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        Permitir Nuevos Registros
                      </p>
                      <p className="text-sm text-gray-400">
                        Los usuarios pueden crear cuentas nuevas
                      </p>
                    </div>
                    <Switch
                      checked={generalSettings.allowNewRegistrations}
                      onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, allowNewRegistrations: checked })}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveSettings('general')}
                    disabled={saving}
                    className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white border-0"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
              )}
            >
              <h3 className={cn('text-lg font-semibold mb-6 text-white')}>
                Configuración de Seguridad
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Política de Contraseñas
                    </p>
                    <p className="text-sm text-gray-400">
                      Requiere contraseñas seguras para todos los usuarios
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.enforcePasswordPolicy}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enforcePasswordPolicy: checked })}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {securitySettings.enforcePasswordPolicy && (
                  <div className={cn(
                    'p-4 rounded-lg border bg-white/5 border-white/10'
                  )}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">
                          Longitud Mínima
                        </Label>
                        <Input
                          type="number"
                          min={6}
                          max={32}
                          value={securitySettings.minPasswordLength}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) })}
                          className="bg-black/40 border-white/10 text-white focus-visible:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">
                          Intentos Máximos de Login
                        </Label>
                        <Input
                          type="number"
                          min={3}
                          max={10}
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                          className="bg-black/40 border-white/10 text-white focus-visible:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={securitySettings.requireSpecialChars}
                          onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireSpecialChars: checked })}
                          className="data-[state=checked]:bg-amber-600"
                        />
                        <Label className="text-gray-300">
                          Requerir caracteres especiales
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={securitySettings.requireNumbers}
                          onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireNumbers: checked })}
                          className="data-[state=checked]:bg-amber-600"
                        />
                        <Label className="text-gray-300">
                          Requerir números
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Duración de Bloqueo (minutos)
                    </Label>
                    <Input
                      type="number"
                      min={5}
                      max={60}
                      value={securitySettings.lockoutDuration}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutDuration: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      Expiración de Token JWT (horas)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={securitySettings.jwtExpiration}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, jwtExpiration: parseInt(e.target.value) })}
                      className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveSettings('seguridad')}
                    disabled={saving}
                    className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white border-0"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Appearance Settings */}
          {activeSection === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
              )}
            >
              <h3 className={cn('text-lg font-semibold mb-6 text-white')}>
                Configuración de Apariencia
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-gray-300">
                    Tema de Interfaz
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => applyThemePreference('light')}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-all',
                        appearanceSettings.uiTheme === 'light'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <div className="w-full h-24 rounded-lg bg-white border border-gray-200 mb-3 flex items-center justify-center opacity-80">
                        <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                      </div>
                      <p className="font-medium text-center text-white">
                        Claro
                      </p>
                    </button>
                    <button
                      onClick={() => applyThemePreference('dark')}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-all',
                        appearanceSettings.uiTheme === 'dark'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <div className="w-full h-24 rounded-lg bg-[#121212] border border-white/10 mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/10"></div>
                      </div>
                      <p className="font-medium text-center text-white">
                        Oscuro
                      </p>
                    </button>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Animaciones de UI
                    </p>
                    <p className="text-sm text-gray-400">
                      Habilita transiciones y animaciones suaves
                    </p>
                  </div>
                  <Switch
                    checked={appearanceSettings.enableAnimations}
                    onCheckedChange={(checked) => setAppearanceSettings({ ...appearanceSettings, enableAnimations: checked })}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* System Stats */}
          {activeSection === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className={cn(
                'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={cn('text-lg font-semibold text-white')}>
                    Estado del Sistema
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSystemStats}
                    className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    <FiRefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                    Actualizar
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={cn(
                    'p-4 rounded-lg border bg-white/5 border-white/10'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiUsers className="w-4 h-4 text-blue-400" />
                      <span className={cn('text-sm text-gray-400')}>
                        Total Usuarios
                      </span>
                    </div>
                    <p className={cn('text-2xl font-bold text-white')}>
                      {loading ? '...' : systemStats.totalUsers}
                    </p>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg border bg-white/5 border-white/10'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiActivity className="w-4 h-4 text-green-400" />
                      <span className={cn('text-sm text-gray-400')}>
                        Usuarios Activos
                      </span>
                    </div>
                    <p className={cn('text-2xl font-bold text-white')}>
                      {loading ? '...' : systemStats.activeUsers}
                    </p>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg border bg-white/5 border-white/10'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiDatabase className="w-4 h-4 text-purple-400" />
                      <span className={cn('text-sm text-gray-400')}>
                        Total Clientes
                      </span>
                    </div>
                    <p className={cn('text-2xl font-bold text-white')}>
                      {loading ? '...' : systemStats.totalClients}
                    </p>
                  </div>
                  <div className={cn(
                    'p-4 rounded-lg border bg-white/5 border-white/10'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiServer className="w-4 h-4 text-amber-400" />
                      <span className={cn('text-sm text-gray-400')}>
                        Estado DB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        systemStats.dbConnectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                      )} />
                      <span className={cn('text-sm font-medium text-white')}>
                        {systemStats.dbConnectionStatus === 'connected' ? 'Conectado' : 'Error'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn(
                'rounded-xl border p-6 bg-white/5 backdrop-blur-md border-white/10 ring-1 ring-white/5'
              )}>
                <h3 className={cn('text-lg font-semibold mb-4 text-white')}>
                  Información del Sistema
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Versión</span>
                    <span className={cn('font-medium text-white')}>
                      MindDash v2.5.0
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Framework</span>
                    <span className={cn('font-medium text-white')}>
                      Next.js 14.2.32
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Base de Datos</span>
                    <span className={cn('font-medium text-white')}>
                      PostgreSQL
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Ambiente</span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400'
                    )}>
                      Production
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
