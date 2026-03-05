'use client';

import { useState } from 'react';
import { UserNav } from '@/components/UserNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserNavDemo() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (action: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${action}`]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            🎨 UserNav Component Demo
          </h1>
          <p className="text-gray-400">
            Demostración interactiva del nuevo componente UserNav con shadcn/ui
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Modo Expandido */}
          <Card className="bg-[#1c1c1c] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Modo Expandido</CardTitle>
              <CardDescription className="text-gray-400">
                Vista completa del componente (para sidebar abierto)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#111111] p-4 rounded-lg border border-gray-800">
                <UserNav
                  userName="Mario Muratori"
                  userEmail="mario@minddash.ai"
                  onLogout={() => addLog('🚪 Logout clicked')}
                  onProfileClick={() => addLog('👤 Profile clicked')}
                  onSettingsClick={() => addLog('⚙️ Settings clicked')}
                  onHelpClick={() => addLog('❓ Help clicked')}
                />
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>✅ Muestra nombre completo del usuario</p>
                <p>✅ Muestra email del usuario</p>
                <p>✅ Avatar con iniciales</p>
                <p>✅ Chevron indicador</p>
                <p>✅ Dropdown se abre hacia arriba</p>
              </div>
            </CardContent>
          </Card>

          {/* Modo Colapsado */}
          <Card className="bg-[#1c1c1c] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Modo Colapsado</CardTitle>
              <CardDescription className="text-gray-400">
                Vista compacta (para sidebar colapsado)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#111111] p-4 rounded-lg border border-gray-800 flex justify-center">
                <UserNav
                  userName="Mario Muratori"
                  userEmail="mario@minddash.ai"
                  collapsed={true}
                  onLogout={() => addLog('🚪 Logout clicked (collapsed)')}
                  onProfileClick={() => addLog('👤 Profile clicked (collapsed)')}
                  onSettingsClick={() => addLog('⚙️ Settings clicked (collapsed)')}
                  onHelpClick={() => addLog('❓ Help clicked (collapsed)')}
                />
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>✅ Solo muestra el avatar</p>
                <p>✅ Tamaño reducido</p>
                <p>✅ Dropdown completo al hacer clic</p>
                <p>✅ Se abre hacia la derecha</p>
              </div>
            </CardContent>
          </Card>

          {/* Con Avatar Personalizado */}
          <Card className="bg-[#1c1c1c] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Con Avatar Personalizado</CardTitle>
              <CardDescription className="text-gray-400">
                Usando imagen de avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#111111] p-4 rounded-lg border border-gray-800">
                <UserNav
                  userName="Ana García"
                  userEmail="ana.garcia@cliente.com"
                  userAvatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Ana"
                  onLogout={() => addLog('🚪 Ana logged out')}
                  onProfileClick={() => addLog('👤 Ana profile clicked')}
                  onSettingsClick={() => addLog('⚙️ Ana settings clicked')}
                  onHelpClick={() => addLog('❓ Ana help clicked')}
                />
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>✅ Imagen de avatar desde URL</p>
                <p>✅ Fallback a iniciales si falla</p>
                <p>✅ Lazy loading de imagen</p>
              </div>
            </CardContent>
          </Card>

          {/* Usuario con nombre corto */}
          <Card className="bg-[#1c1c1c] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Usuario Simple</CardTitle>
              <CardDescription className="text-gray-400">
                Con nombre de un solo término
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#111111] p-4 rounded-lg border border-gray-800">
                <UserNav
                  userName="Admin"
                  userEmail="admin@minddash.ai"
                  onLogout={() => addLog('🚪 Admin logged out')}
                  onProfileClick={() => addLog('👤 Admin profile clicked')}
                  onSettingsClick={() => addLog('⚙️ Admin settings clicked')}
                  onHelpClick={() => addLog('❓ Admin help clicked')}
                />
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>✅ Maneja nombres cortos</p>
                <p>✅ Iniciales de 2 caracteres</p>
                <p>✅ Sin romper el diseño</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simulación en Sidebar Completo */}
        <Card className="bg-[#1c1c1c] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Vista en Sidebar Completo</CardTitle>
            <CardDescription className="text-gray-400">
              Cómo se ve integrado en el ChatSidebar real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-[#111111] rounded-lg border border-gray-800 w-full max-w-[280px] mx-auto">
              {/* Header simulado */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
                    MD
                  </div>
                  <div className="mx-3">
                    <p className="mb-0 font-semibold text-white text-sm">MindDash Chatbot</p>
                    <p className="text-xs text-gray-400">Asistente Virtual</p>
                  </div>
                </div>
              </div>

              {/* Search bar simulada */}
              <div className="px-4 py-2">
                <div className="bg-[#1c1c1c] border border-gray-700 rounded-full py-2 px-4 text-sm text-gray-400">
                  🔍 Buscar conversación...
                </div>
              </div>

              {/* Tabs simuladas */}
              <div className="px-4 py-2">
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 bg-blue-600/20 text-blue-400 rounded-md py-2 text-center">
                    💬 Chats
                  </div>
                  <div className="flex-1 text-gray-400 rounded-md py-2 text-center">
                    🔧 Herram.
                  </div>
                  <div className="flex-1 text-gray-400 rounded-md py-2 text-center">
                    ❓ Ayuda
                  </div>
                </div>
              </div>

              {/* Lista simulada */}
              <div className="px-4 py-4 space-y-2">
                <div className="bg-[#1c1c1c] rounded-md p-2 text-sm text-gray-300">
                  📝 Conversación 1
                </div>
                <div className="bg-[#1c1c1c] rounded-md p-2 text-sm text-gray-300">
                  📝 Conversación 2
                </div>
                <div className="bg-[#1c1c1c] rounded-md p-2 text-sm text-gray-300">
                  📝 Conversación 3
                </div>
              </div>

              {/* Botón nueva conversación */}
              <div className="px-4 pb-3">
                <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md font-medium text-sm">
                  ➕ Nueva conversación
                </button>
              </div>

              {/* UserNav - El componente real */}
              <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                <UserNav
                  userName="Mario Muratori"
                  userEmail="mario@minddash.ai"
                  onLogout={() => addLog('🚪 Logout from sidebar')}
                  onProfileClick={() => addLog('👤 Profile from sidebar')}
                  onSettingsClick={() => addLog('⚙️ Settings from sidebar')}
                  onHelpClick={() => addLog('❓ Help from sidebar')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log de Acciones */}
        <Card className="bg-[#1c1c1c] border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">📋 Log de Acciones</CardTitle>
              <CardDescription className="text-gray-400">
                Eventos capturados al interactuar con los componentes
              </CardDescription>
            </div>
            <button
              onClick={() => setLogs([])}
              className="px-3 py-1 bg-red-600/20 text-red-400 rounded-md text-sm hover:bg-red-600/30 transition-colors"
            >
              Limpiar
            </button>
          </CardHeader>
          <CardContent>
            <div className="bg-[#111111] rounded-lg border border-gray-800 p-4 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No hay acciones registradas. Interactúa con los componentes arriba.
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-300 font-mono bg-[#1c1c1c] px-3 py-2 rounded border-l-2 border-blue-500"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info técnica */}
        <Card className="bg-[#1c1c1c] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">ℹ️ Información Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">Componentes utilizados:</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">
                  shadcn/ui Avatar
                </span>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">
                  shadcn/ui Dropdown Menu
                </span>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">
                  shadcn/ui Separator
                </span>
                <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
                  Radix UI
                </span>
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs">
                  Lucide Icons
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Características implementadas:</h3>
              <ul className="space-y-1 text-sm text-gray-400">
                <li>✅ Modo expandido y colapsado</li>
                <li>✅ Avatar con imagen o iniciales</li>
                <li>✅ Dropdown menu con animaciones</li>
                <li>✅ Opciones de perfil, configuración, tema, ayuda y logout</li>
                <li>✅ Tema oscuro nativo</li>
                <li>✅ Callbacks personalizables</li>
                <li>✅ TypeScript tipado</li>
                <li>✅ Responsive design</li>
                <li>✅ Accesibilidad (keyboard navigation)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Archivos creados/modificados:</h3>
              <ul className="space-y-1 text-sm text-gray-400 font-mono">
                <li>🆕 src/components/UserNav.tsx</li>
                <li>🆕 src/components/ui/avatar.tsx</li>
                <li>🆕 src/components/ui/separator.tsx</li>
                <li>✏️ src/components/ChatSidebar.tsx</li>
                <li>✏️ src/lib/types.ts</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
