# 📚 Documentación MindDash - Sistema de Chatbots Multi-Cliente
*Guía completa para el equipo de desarrollo*

---

## 🎯 **Resumen del Proyecto**

**MindDash** es una plataforma de chatbots multi-cliente construida con Next.js 14 que permite a diferentes empresas tener sus propios chatbots personalizados con inteligencia artificial. Cada cliente puede gestionar sus usuarios, configurar su chatbot y acceder a analytics específicos.

### **Características Principales:**
- ✅ **Multi-tenancy:** Cada cliente tiene su propio chatbot aislado
- ✅ **Sistema de roles:** Super Admin, Admin Cliente, Usuario Final
- ✅ **Chatbots dinámicos:** URLs únicas por cliente
- ✅ **Panel de administración:** Gestión completa de usuarios y chatbots
- ✅ **Integración IA:** Conexión con OpenAI y otros proveedores
- ✅ **Responsive:** Optimizado para móvil y desktop

---

## 🏗️ **Arquitectura Técnica**

### **Stack Tecnológico:**
```
Frontend:     Next.js 14 + React 18 + TypeScript
Styling:      TailwindCSS + Radix UI Components
Base de Datos: PostgreSQL + Prisma ORM
Autenticación: Sistema personalizado con JWT
IA:           OpenAI API + Agentes personalizados
Despliegue:   Docker + Google Cloud Run + Netlify
```

### **Estructura de Carpetas:**
```
/chatbot-nextjs/
├── /src/
│   ├── /app/              # Rutas de la aplicación (App Router)
│   ├── /components/       # Componentes reutilizables
│   ├── /lib/             # Utilidades y configuraciones
│   └── /hooks/           # Custom hooks de React
├── /prisma/              # Esquema y migraciones de BD
├── /public/              # Archivos estáticos
└── /netlify/             # Funciones serverless
```

---

## 📂 **Análisis Detallado de Rutas (/app/)**

### **🔐 Autenticación y Acceso**
```bash
/app/login/page.tsx           → Login principal del sistema
/app/register/page.tsx        → Registro de nuevos usuarios
/app/forgot-password/page.tsx → Recuperación de contraseña
/app/verify-email/page.tsx    → Verificación de email
/app/reset-password/page.tsx  → Reseteo de contraseña
```

**Funcionalidad:**
- Validación de credenciales contra base de datos
- Manejo de sesiones con JWT
- Redirección automática según rol del usuario
- Recuperación de contraseña vía email

### **🏠 Páginas Principales**
```bash
/app/page.tsx                 → Página de inicio (redirecciona según autenticación)
/app/selector/page.tsx        → Selector de chatbots disponibles para el usuario
/app/dashboard/page.tsx       → Dashboard principal post-login
/app/user-dashboard/page.tsx  → Dashboard específico para usuarios finales
/app/no-chatbots/page.tsx     → Página cuando usuario no tiene chatbots asignados
```

**Flujo de navegación:**
1. Usuario accede → Verifica autenticación
2. Si no está logueado → `/login`
3. Si está logueado → Verifica rol y redirecciona apropiadamente

### **🤖 Sistema de Chatbots Dinámicos**
```bash
/app/chatbot/[id]/page.tsx              → Chatbot dinámico por ID
/app/chatbot/[id]/ClientSideChatbotPage.tsx → Lógica del lado cliente
/app/chatbot/bayerBot/page.tsx          → Chatbot específico para Bayer
/app/products/[productId]/page.tsx      → Chatbots de productos específicos
```

**Características especiales:**
- **IDs dinámicos:** Soporte para UUIDs y nombres personalizados
- **Detección automática:** Diferencia entre chatbots de cliente y producto
- **Acceso directo:** Los chatbots de producto permiten acceso sin autenticación
- **Configuración personalizada:** Cada chatbot tiene su propia configuración YAML

**Ejemplo de código (ClientSideChatbotPage.tsx):**
```typescript
// Detecta si es un chatbot de producto (UUID) o cliente (nombre)
const isDynamic = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatbotId);

if (isDynamic) {
  // Chatbot de producto - acceso directo sin autenticación
  setIsProductChatbot(true);
} else {
  // Chatbot de cliente - requiere autenticación
  checkAuthentication();
}
```

### **⚙️ Administración - Super Admin**

#### **🗂️ Rutas:**
```bash
/app/admin/page.tsx                    → Panel principal (usa AdminPanel.tsx)
/app/admin/yaml-config/page.tsx        → Editor de configuraciones YAML
/app/admin/config/yaml/                → Configuración YAML (archivos)
/app/admin/data-sources/page.tsx       → Gestión de fuentes de datos
/app/admin/connectors/page.tsx         → Gestión de conectores
/app/admin/flows/page.tsx              → Editor de flujos
/app/admin/integrations/               → Integraciones (2 subcarpetas)
```

#### **❌ Rutas que NO existen (carpetas vacías):**
```bash
/app/admin/users/                      → VACÍA - No tiene page.tsx
/app/admin/clients/                    → VACÍA - No tiene page.tsx
```

#### **✅ Dónde está la funcionalidad:**
**La gestión de usuarios y clientes está en el componente principal:**
```bash
/components/admin/AdminPanel.tsx       → Panel unificado con todas las funciones
├── Pestaña "Usuarios"                 → Gestión de usuarios del sistema
├── Pestaña "Clientes"                 → Gestión de clientes/empresas  
├── Pestaña "Chatbots"                 → Asignación y configuración
├── Pestaña "Analytics"                → Métricas y reportes
└── Pestaña "Configuración"            → Settings generales
```

**Funcionalidades del Super Admin (todas en AdminPanel.tsx):**
- ✅ Crear y gestionar clientes
- ✅ Asignar usuarios a chatbots específicos
- ✅ Configurar agentes IA personalizados
- ✅ Gestionar fuentes de datos y conocimiento
- ✅ Monitorear uso y métricas del sistema
- ✅ Configurar integraciones externas

### **👨‍💼 Administración - Sistema Unificado (Dashboard Admin)**

#### **🗂️ Rutas Actuales:**
```bash
/app/dashboard/admin/                                                  → Dashboard principal
/app/dashboard/admin/organizations/                                    → Lista de organizaciones
/app/dashboard/admin/organizations/[orgId]/projects/                   → Proyectos por organización
/app/dashboard/admin/organizations/[orgId]/projects/[projectId]/chatbots/        → Chatbots del proyecto
/app/dashboard/admin/organizations/[orgId]/projects/[projectId]/chatbots/[chatbotId]/ → Detalle del chatbot con 11 tabs
/app/dashboard/admin/settings/                                         → Configuraciones
/app/dashboard/admin/users/                                            → Gestión de usuarios
```

#### **❌ Rutas Eliminadas (ya no existen):**
```bash
❌ /app/admin-client/page.tsx                  → ELIMINADO (redirigía a /dashboard/admin/)
❌ /app/dashboard/admin/products/              → ELIMINADO (duplicaba funcionalidad)
❌ /app/dashboard/admin/organizations/[orgId]/connections/  → ELIMINADO (ahora es un tab)
```

#### **✅ Arquitectura del Sistema Admin:**
**El sistema usa una arquitectura de componentes reutilizables:**

```bash
📁 /app/dashboard/admin/
├── page.tsx                                   → Dashboard principal
├── organizations/[orgId]/projects/[projectId]/chatbots/[chatbotId]/page.tsx  → Detalle con tabs
└── layout.tsx                                 → Layout con menú lateral dinámico

📁 /components/admin-client/  (nombre histórico, pero SÍ se usan desde /dashboard/admin/)
├── ChatbotDetail.tsx                          → Maneja las 11 secciones del chatbot
├── ConnectionsView.tsx                        → Tab de conexiones a BD
├── MetricsView.tsx                            → Tab de métricas/KPIs
├── DataAccessView.tsx                         → Tab de permisos RLS/CLS
├── DeploysView.tsx                            → Tab de configuración de deploys
├── OrganizationList.tsx                       → Lista de organizaciones
├── ProjectList.tsx                            → Lista de proyectos
├── ProjectChatbotsView.tsx                    → Lista de chatbots
├── ClientSettings.tsx                         → Configuraciones
└── ClientUsersManagement.tsx                  → Gestión de usuarios

📁 /app/api/admin-client/  (nombre histórico, pero SÍ se usan desde /dashboard/admin/)
├── dashboard/route.ts                         → Estadísticas del dashboard
├── charts/route.ts                            → Datos para gráficos
├── products/route.ts                          → CRUD de chatbots
├── projects/route.ts                          → CRUD de proyectos
├── users/route.ts                             → CRUD de usuarios
└── settings/route.ts                          → Configuraciones
```

**📝 Nota Importante sobre nombres:**
- Las carpetas `admin-client` (componentes y API) mantienen ese nombre por razones históricas
- Sin embargo, **SÍ se usan activamente** desde `/dashboard/admin/`
- NO existe ya la página `/admin-client/` (fue eliminada)
- Los componentes importan desde `@/components/admin-client/`
- Los endpoints se consumen en `/api/admin-client/`

#### **🎯 Sistema de Tabs del Chatbot** (11 secciones):

**Acceso:** `/dashboard/admin/organizations/[orgId]/projects/[projectId]/chatbots/[chatbotId]?section={seccion}`

**Tabs disponibles:**

1. **General** (`?section=general`) - Información general del chatbot
   - Reporte de conexiones, usuarios registrados y activos
   - Canales disponibles (Web, WhatsApp, Teams, Slack)
   - Estado de activación por canal

2. **Prompt** (`?section=prompt`) - Configuración del prompt base
   - Editor de prompt del sistema
   - Contexto personalizado
   - Preguntas sugeridas

3. **Permisos** (`?section=permisos`) - Roles y accesos
   - Gestión de usuarios con acceso al chatbot
   - Asignación de roles (viewer, editor, user)
   - Control de permisos granular

4. **Conexiones** (`?section=conexiones`) - ✅ **NUEVO**
   - Gestión de conexiones a bases de datos
   - Soporta: PostgreSQL, MySQL, BigQuery, MongoDB, Snowflake, Redshift
   - CRUD completo con validaciones
   - Búsqueda en tiempo real

5. **Métricas** (`?section=metricas`) - ✅ **NUEVO (actualizado con CRUD)**
   - KPIs y métricas de negocio
   - Editor de fórmulas SQL personalizadas
   - Umbrales de alertas (warning/critical)
   - 6 categorías: ventas, marketing, operaciones, finanzas, producto, servicio
   - Indicadores visuales de estado (🟢🟡🔴)
   - Filtros por categoría

6. **Data Access** (`?section=data-access`) - ✅ **NUEVO**
   - Control de acceso a datos (Row-Level Security - RLS)
   - Tabs: Por Usuario y Por Rol
   - 6 tipos de filtros: equals, in, not_in, contains, greater_than, less_than
   - Tabla con búsqueda
   - Solo accesible para admin

7. **Deploys** (`?section=deploys`) - ✅ **NUEVO**
   - Configuración de despliegues por ambiente
   - 3 ambientes: Development, Staging, Production
   - Editor JSON de configuración
   - Modal de vista previa JSON completo
   - Versionado de deploys
   - Filtros por ambiente

8. **Alertas** (`?section=alertas`) - Sistema de alertas y notificaciones
   - Configuración de alertas automáticas
   - Umbrales de notificación
   - Canales de envío

9. **Profiling** (`?section=profiling`) - Monitoreo y trazabilidad
   - Análisis de sesiones de usuario
   - Trazas de ejecución
   - Performance monitoring

10. **Capa Semántica** (`?section=semantic`) - Gestión de contexto
    - Colecciones de embeddings
    - Base de conocimiento
    - Contexto del chatbot

11. **Insights** (`?section=insights`) - Análisis avanzado
    - Hallazgos clave
    - Tendencias de uso
    - Sugerencias de optimización

**Características Técnicas de los Nuevos Tabs:**

🔥 **Módulo de Conexiones** (ConnectionsView.tsx - 450 líneas):
- CRUD completo de conexiones a bases de datos
- Tipos soportados: PostgreSQL, MySQL, BigQuery, MongoDB, Snowflake, Redshift
- Validaciones de campos: organization_id, name, type, host, port, database
- Búsqueda en tiempo real por nombre o tipo
- Grid responsivo (1/2/3 columnas según dispositivo)
- Modales con animaciones Framer Motion
- Backend: `/api/backend/connections/*` (5 endpoints)
- Permisos: Admin y Admin-Client pueden gestionar

🔥 **Módulo de Métricas** (MetricsView.tsx - 650 líneas):
- CRUD completo de métricas/KPIs de negocio
- Editor de fórmulas SQL personalizadas
- Umbrales configurables:
  - `target_value`: Valor objetivo a alcanzar
  - `threshold_warning`: Umbral de advertencia
  - `threshold_critical`: Umbral crítico
- 6 categorías: ventas, marketing, operaciones, finanzas, producto, servicio al cliente
- Indicadores visuales de estado:
  - 🟢 Success: Por encima de umbrales
  - 🟡 Warning: Por debajo de umbral de advertencia
  - 🔴 Critical: Por debajo de umbral crítico
- Filtros por categoría
- Búsqueda en tiempo real
- Backend: `/api/backend/metrics/*` (5 endpoints)
- Permisos: Admin y Admin-Client pueden gestionar

🔥 **Módulo de Data Access** (DataAccessView.tsx - 700 líneas):
- Control de acceso a datos (Row-Level Security - RLS y Column-Level Security - CLS)
- Dos sistemas de permisos:
  - **Por Usuario**: Control granular por usuario específico
  - **Por Rol**: Permisos aplicados a nivel de rol
- 6 tipos de filtros soportados:
  - `equals`: Igualdad exacta
  - `in`: Valores dentro de lista
  - `not_in`: Valores fuera de lista
  - `contains`: Contiene substring
  - `greater_than`: Mayor que
  - `less_than`: Menor que
- Tabla con búsqueda en tiempo real
- CRUD completo con validaciones
- Backend: `/api/backend/user-data-access/*` y `/api/backend/role-data-access/*` (11 endpoints)
- Permisos: **Solo Admin** puede gestionar

🔥 **Módulo de Deploys** (DeploysView.tsx - 650 líneas):
- Configuración de despliegues por ambiente
- 3 ambientes soportados:
  - 🔧 Development (dev)
  - 🧪 Staging
  - 🚀 Production
- Configuración por deploy:
  - `deploy_url`: URL del despliegue
  - `api_endpoint`: Endpoint de la API
  - `config_json`: Configuración JSON personalizada
  - `version`: Versión del deploy
  - `is_active`: Estado activo/inactivo
- Editor JSON integrado
- Modal de vista previa JSON completo
- Filtros por ambiente
- Versionado de configuraciones
- Backend: `/api/backend/deploys/*` (5 endpoints)
- Permisos: Admin y Admin-Client pueden gestionar

**Características Comunes de los Nuevos Módulos:**
- ✅ Dark theme consistente con el resto del sistema
- ✅ Grid responsivo (1 columna móvil, 2 tablet, 3 desktop)
- ✅ Animaciones suaves con Framer Motion
- ✅ Validaciones de array (previene errores `.filter is not a function`)
- ✅ Manejo robusto de errores con `console.error`
- ✅ Estados de carga con spinners
- ✅ Confirmación antes de eliminar
- ✅ Notificaciones toast con Sonner
- ✅ Búsqueda client-side en tiempo real
- ✅ Autenticación JWT en todos los endpoints
- ✅ Total: **26 endpoints backend** conectados

🔥 **Estadísticas del Dashboard:**
- Total de usuarios de la empresa
- Usuarios activos vs inactivos
- Cantidad de productos/chatbots
- Crecimiento porcentual de usuarios
- Métricas calculadas en tiempo real desde la API

🔥 **Gestión de Usuarios Empresariales:**
- Roles: `viewer`, `editor`, `user`
- Validación de números de teléfono (WhatsApp)
- Sistema de múltiples CUITs por usuario (máximo 3)
- Gestión de acceso específico para cliente Bayer
- Estados de usuario: activo/inactivo
- Creación, edición y eliminación híbrida (deactivate/permanent)

🔥 **Gestión de Productos/Chatbots:**
- Tipos: `chatbot`, `api`, `web`
- Configuración personalizada por producto:
  - Mensaje de bienvenida personalizado
  - Límite máximo de usuarios
  - Descripción del producto (about)
  - Prompts sugeridos configurables
  - Preguntas de ejemplo personalizadas
  - Prompt personalizado del sistema
  - Contexto del sistema configurable
- Estadísticas por producto:
  - Usuarios asignados
  - Mensajes procesados por mes
  - Estado activo/inactivo

🔥 **Sistema de Archivos de Conocimiento:**
- Soporte para PDF, CSV, XLSX
- Límite de 10MB por archivo
- Máximo 20 archivos por producto
- Procesamiento automático en chunks
- Estados: upload → processing → completed
- Estadísticas de archivos y chunks procesados

🔥 **Configuraciones Empresariales Avanzadas:**
- **General**: Nombre de empresa, descripción, zona horaria, idioma
- **Seguridad**: 2FA, timeout de sesión, políticas de contraseña, IP whitelist
- **Notificaciones**: Email, SMS, alertas de usuarios/sistema, reportes, mantenimiento
- **Facturación**: Plan actual, email de facturación, auto-renovación, método de pago

🎨 **Diseño y UX:**
- Sidebar fijo estilo chatbot con navegación intuitiva
- Efectos visuales con gradientes y blur
- Animaciones suaves con Framer Motion
- Responsive design optimizado
- Buscador de funciones integrado
- Indicadores de estado en tiempo real
- Sistema de notificaciones toast

🔐 **Seguridad y Autenticación:**
- Verificación de roles (`admin` específicamente)
- Tokens JWT con validación temporal
- Redirección automática según roles
- Logout seguro con limpieza de tokens
- Protección CSRF y validación de entrada

### **🔌 APIs y Endpoints Completos**

#### **🔐 Autenticación:**
```bash
/app/api/auth/                    → Endpoints de autenticación
├── /verify                       → Verificación de tokens JWT
├── /logout                       → Logout seguro
└── /refresh                      → Renovación de tokens
```

#### **💬 Sistema de Chat:**
```bash
/app/api/chat/                    → Endpoints del sistema de chat
├── /stream                       → Chat streaming en tiempo real
├── /history                      → Historial de conversaciones
└── /upload                       → Subida de archivos en chat
```

#### **👑 Super Admin APIs:**
```bash
/app/api/admin/users/             → CRUD de usuarios (solo super admin)
/app/api/admin/chatbots/          → Gestión de chatbots
/app/api/analytics/global/        → Analytics globales del sistema
/app/api/analytics/real-time/     → Métricas en tiempo real
```

#### **👨‍💼 Admin-Client APIs Completas:**
```bash
/app/api/admin-client/
├── /dashboard/                   → Estadísticas del dashboard cliente
├── /users/                       → CRUD de usuarios empresariales
├── /users-test/                  → Gestión de usuarios de prueba
├── /products/                    → CRUD de productos del cliente
│   ├── /[productId]/            → Operaciones específicas por producto
│   │   ├── /status/             → Estado del producto
│   │   └── /knowledge-files/    → Gestión de archivos de conocimiento
│   └── /stats/                  → Estadísticas de productos
├── /settings/                    → Configuraciones empresariales
└── /charts/                      → Datos para gráficos y analytics
```

#### **🆕 Backend APIs - Nuevos Módulos Implementados:**
```bash
/app/api/backend/
├── /connections/                 → Gestión de conexiones a BD (5 endpoints)
│   ├── /route.ts                → GET: Listar todas | POST: Por ID
│   ├── /organization/route.ts   → POST: Listar por organización
│   ├── /create/route.ts         → POST: Crear nueva conexión
│   └── /[connectionId]/route.ts → PUT: Actualizar | DELETE: Eliminar
│
├── /metrics/                     → Gestión de métricas/KPIs (5 endpoints)
│   ├── /route.ts                → GET: Listar todas | POST: Por ID
│   ├── /product/route.ts        → POST: Listar por producto
│   ├── /create/route.ts         → POST: Crear nueva métrica
│   └── /[metricId]/route.ts     → PUT: Actualizar | DELETE: Eliminar
│
├── /user-data-access/            → Permisos RLS por usuario (6 endpoints)
│   ├── /route.ts                → POST: Listar todos
│   ├── /by-role/route.ts        → POST: Listar por rol
│   ├── /by-user/route.ts        → POST: Listar por usuario
│   ├── /create/route.ts         → POST: Crear nuevo permiso
│   └── /[accessId]/route.ts     → PUT: Actualizar | DELETE: Eliminar
│
├── /role-data-access/            → Permisos RLS por rol (5 endpoints)
│   ├── /route.ts                → POST: Listar todos
│   ├── /by-product/route.ts     → POST: Listar por producto
│   ├── /create/route.ts         → POST: Crear nuevo permiso
│   └── /[roleAccessId]/route.ts → PUT: Actualizar | DELETE: Eliminar
│
└── /deploys/                     → Configuración de deploys (5 endpoints)
    ├── /route.ts                → POST: Listar todos
    ├── /by-product/route.ts     → POST: Listar por producto
    ├── /create/route.ts         → POST: Crear nuevo deploy
    └── /[deployId]/route.ts     → PUT: Actualizar | DELETE: Eliminar
```

**Total: 26 endpoints nuevos** conectados al backend Python

**Seguridad de los nuevos endpoints:**
- ✅ Autenticación JWT requerida en todos
- ✅ Validaciones de campos obligatorios
- ✅ Matriz de permisos por rol:
  - **Connections**: Admin y Admin-Client
  - **Metrics**: Admin y Admin-Client
  - **User/Role Data Access**: Solo Admin
  - **Deploys**: Admin y Admin-Client

#### **📊 Endpoints de Analytics Avanzados:**
```bash
/app/api/analytics/
├── /real-time                    → Métricas en tiempo real por cliente
├── /global                       → Analytics globales (solo super admin)
├── /events                       → Eventos del sistema
└── /reports                      → Generación de reportes
```

---

## 🤖 **Características Avanzadas de los Chatbots Multi-Cliente**

### **🎯 Sistema de Chatbots Dinámicos Inteligente**

**MindDash implementa un sistema único de chatbots que funciona con múltiples modalidades:**

#### **🔄 Tipos de Chatbots Soportados:**
1. **Chatbots de Cliente** (`/chatbot/[nombre-cliente]`) - Requieren autenticación
2. **Chatbots de Producto** (`/chatbot/[uuid-producto]`) - Acceso directo sin auth
3. **Chatbots Específicos** (`/chatbot/bayerBot`) - Implementaciones personalizadas

#### **🧠 Motor de Detección Automática:**
```typescript
// Sistema inteligente que detecta el tipo de chatbot por la URL
const isDynamic = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatbotId);

if (isDynamic) {
  // Chatbot de producto - acceso directo sin autenticación
  setIsProductChatbot(true);
} else {
  // Chatbot de cliente - requiere autenticación
  checkAuthentication();
}
```

### **⚡ Características Avanzadas de ChatbotBase.tsx**

**El componente base de todos los chatbots incluye:**

#### **🎨 Funcionalidades Core:**
- **Autenticación Inteligente**: Verificación automática con tokens JWT de 24 horas
- **Cliente Selector**: Sistema automático de selección y validación de clientes
- **Sidebar Responsive**: Auto-ajuste según el tamaño de pantalla (1280px breakpoint)
- **Tutorial Onboarding**: Sistema de guía para nuevos usuarios con localStorage
- **Gestión de Estado**: Manejo complejo de conversaciones y mensajes
- **Cleanup Automático**: Prevención de memory leaks con AbortController

#### **🔧 Props Configurables:**
```typescript
interface ChatbotBaseProps {
  clientId: string;                    // ID único del cliente
  clientWelcomeMessage: string;        // Mensaje de bienvenida personalizado
  clientAbout: string;                 // Descripción del chatbot
  suggestedPrompts: string[];          // Prompts sugeridos
  exampleQuestions: string[];          // Preguntas de ejemplo
  isProductChatbot?: boolean;          // Si es chatbot de producto
  productName?: string;                // Nombre del producto
  useDatabase?: boolean;               // Si usa base de datos
  conversationsHook?: any;             // Hook personalizado de conversaciones
}
```

#### **🎭 Gestión Avanzada de Estados:**
- **Estados de Carga**: Spinners y skeletons durante operaciones async
- **Estados de Chat**: inicial, typing, waiting, editing
- **Estados de Sidebar**: visible/oculto según dispositivo
- **Estados de Conversación**: activa, archivada, nueva
- **Estados de Autenticación**: verificado, expirado, inválido

### **💡 Sistema de Personalización por Cliente**

#### **🏢 Configuraciones Específicas por Empresa:**
Cada cliente puede personalizar completamente su chatbot:

**🎨 Personalización Visual:**
- Mensaje de bienvenida único
- Colores y temas personalizados
- Logo y branding corporativo
- Prompts sugeridos específicos de la industria

**🧠 Personalización de IA:**
- Contexto del sistema personalizado
- Prompts específicos del negocio
- Base de conocimiento especializada
- Respuestas entrenadas por industria

**🔧 Configuraciones Operativas:**
- Límites de usuarios concurrentes
- Configuración de timeouts
- Integración con sistemas internos
- Webhooks personalizados

### **📊 Sistema de Analytics en Tiempo Real**

#### **📈 RealTimeCharts - Métricas Avanzadas:**
**Cada chatbot incluye analytics completos:**

```typescript
interface RealTimeData {
  realTimeStats: {
    totalEvents: number;
    uniqueUsers: number;
    eventsByType: Record<string, number>;
    eventsByHour: Record<string, number>;
  };
  dailyMetrics: Array<{
    active_users: number;
    total_conversations: number;
    total_messages: number;
    total_events: number;
  }>;
  trends: {
    users: number;
    conversations: number;
    messages: number;
  };
}
```

**📊 Tipos de Gráficos Disponibles:**
- **AreaChart**: Usuarios activos por período
- **BarChart**: Mensajes por día/hora
- **DonutChart**: Distribución de tipos de eventos
- **LineChart**: Tendencias de crecimiento

**⚡ Características de Analytics:**
- Actualización automática cada 30 segundos
- Filtros por días (7, 15, 30, 90)
- Métricas globales para super admins
- Métricas específicas por cliente
- Exportación de datos para reportes

### **🎯 Casos de Uso Específicos por Cliente**

#### **🏭 Cliente Bayer (Caso de Estudio):**
**Implementación especializada con características únicas:**
- **Sistema CUIT**: Gestión de múltiples códigos CUIT por usuario
- **Roles Específicos**: `AllAccess`, permisos granulares
- **Validación WhatsApp**: Números de teléfono para contacto directo
- **Restricciones**: No puede crear nuevos productos (solo gestionar existentes)
- **Integración**: Sistema legacy con compatibilidad hacia atrás

#### **🏢 Clientes Empresariales Estándar:**
- **Multi-producto**: Gestión de múltiples chatbots por empresa
- **Usuarios Ilimitados**: Sin restricciones en la cantidad de empleados
- **Configuración Completa**: Acceso total a todas las funcionalidades
- **Facturación Flexible**: Planes escalables según uso

### **🔐 Seguridad Avanzada por Chatbot**

#### **🛡️ Niveles de Seguridad:**
1. **Chatbots Públicos**: Acceso sin autenticación (productos)
2. **Chatbots Privados**: Requieren login y verificación de cliente
3. **Chatbots Empresariales**: Autenticación + autorización por rol
4. **Chatbots Premium**: 2FA + IP whitelisting + audit logs

#### **🔒 Funcionalidades de Seguridad:**
- **Token Rotation**: Renovación automática de tokens JWT
- **Session Management**: Control de sesiones concurrentes
- **Audit Logging**: Registro completo de actividades
- **Data Encryption**: Cifrado end-to-end de conversaciones
- **GDPR Compliance**: Manejo seguro de datos personales

---

## 🧩 **Componentes Principales (/components/)**

### **💬 Sistema de Chat**
```bash
/components/chatbots/
├── ChatbotBase.tsx           # Componente base que extienden todos los chatbots
├── [Específicos por cliente] # Configuraciones personalizadas
```

**ChatbotBase.tsx - Propiedades:**
```typescript
interface ChatbotBaseProps {
  clientId: string;                    // ID único del cliente
  clientWelcomeMessage: string;        // Mensaje de bienvenida personalizado
  clientAbout: string;                 // Descripción del chatbot
  suggestedPrompts: string[];          // Prompts sugeridos
  exampleQuestions: string[];          // Preguntas de ejemplo
  isProductChatbot?: boolean;          // Si es chatbot de producto
  productName?: string;                // Nombre del producto
  useDatabase?: boolean;               // Si usa base de datos
  conversationsHook?: any;             // Hook personalizado de conversaciones
}
```

### **🎨 Componentes de Interfaz de Chat Avanzados**
```bash
/components/
├── ChatInput.tsx              # 💬 Área de entrada inteligente
│   ├── 🎭 Estados Múltiples    # typing, waiting, disabled
│   ├── 📎 Soporte de Archivos  # Drag & drop + validación
│   ├── 🔄 Auto-resize         # Textarea que crece con el contenido
│   ├── ⌨️ Shortcuts          # Enter para enviar, Shift+Enter nueva línea
│   ├── 💾 Auto-save          # Guardado automático de borradores
│   └── 🛡️ Validación         # Límites de caracteres y formato
├── ChatHeader.tsx             # 🎯 Cabecera inteligente del chat
│   ├── 🏢 Info del Cliente    # Logo, nombre, estado
│   ├── 🔔 Indicadores         # Usuario typing, online/offline
│   ├── ⚙️ Controles           # Settings, minimize, maximize
│   └── 📊 Métricas Rápidas    # Mensajes, usuarios activos
├── ChatSidebar.tsx            # 📋 Sidebar avanzado con historial
│   ├── 📱 Responsive Smart    # Auto-collapse en móvil (<1280px)
│   ├── 🔍 Búsqueda            # Filtro de conversaciones
│   ├── 📅 Agrupación Temporal # Por día, semana, mes
│   ├── 🗂️ Categorización     # Por tipo, estado, participantes
│   ├── 📌 Conversaciones Fijas # Pin importantes
│   └── 🗑️ Gestión            # Archivar, eliminar, exportar
├── MessageList.tsx            # 📜 Lista de mensajes optimizada
│   ├── 🔄 Virtualización      # Render eficiente de miles de mensajes
│   ├── 📷 Lazy Loading        # Imágenes y archivos cargados on-demand
│   ├── 🎨 Tipos de Mensaje    # Texto, imagen, archivo, sistema
│   ├── ✏️ Edición Inline      # Editar mensajes enviados
│   ├── 💬 Respuestas          # Reply y thread conversations
│   └── 📥 Auto-scroll         # Scroll inteligente a nuevos mensajes
├── Message.tsx                # 💬 Componente individual avanzado
│   ├── 👤 Avatares            # Usuario vs asistente
│   ├── ⏰ Timestamps          # Fecha/hora formateada
│   ├── ✅ Estados de Entrega  # Enviado, entregado, leído
│   ├── 🎨 Markdown Support    # Formato rico en mensajes
│   ├── 🔗 Links Interactivos  # Preview de URLs
│   └── 📋 Acciones           # Copiar, editar, eliminar, reportar
├── EmptyChat.tsx              # 🌟 Estado vacío atractivo
│   ├── 🎨 Ilustraciones       # SVG animations
│   ├── 💡 Prompts Sugeridos   # Quick start questions
│   ├── 📚 Tips y Tutoriales   # Cómo usar el chatbot
│   └── 🚀 CTAs               # Botones para empezar
├── OnboardingTutorial.tsx     # 🎓 Tutorial interactivo
│   ├── 🎯 Pasos Guiados       # Step-by-step walkthrough
│   ├── 🎨 Highlights         # Spotlight en elementos UI
│   ├── 💾 Progreso Guardado   # localStorage + sessionStorage
│   ├── ⏭️ Skip Option         # Permitir saltar tutorial
│   └── 🎉 Celebración        # Animación al completar
├── UserChatbotSelector.tsx    # 🎯 Selector inteligente de chatbots
│   ├── 🔍 Búsqueda           # Filtro por nombre, tipo, estado
│   ├── 🏷️ Categorización     # Por empresa, función, popularidad
│   ├── ⭐ Favoritos          # Chatbots marcados como preferidos
│   ├── 📊 Estadísticas       # Uso, mensajes, usuarios
│   ├── 🎨 Preview Cards       # Vista previa visual
│   └── 🚀 Acceso Rápido      # Links directos y shortcuts
└── DirectChatbotAccess.tsx    # 🔗 Acceso directo sin auth
    ├── 🆔 UUID Detection      # Identificación automática de productos
    ├── 🚫 Bypass Auth         # Acceso sin login para productos
    ├── 🎯 Configuración Dinámica # Carga de config específica
    └── 📊 Analytics Anónimos  # Métricas sin identificar usuario
```

**🚀 Características Especiales Avanzadas:**
- **Responsive Inteligente:** Comportamiento adaptativo según dispositivo y contexto
- **Estados de Carga Sofisticados:** Skeletons, spinners, progress bars contextuales
- **Animaciones Fluidas:** Framer Motion con transiciones naturales
- **Accesibilidad Premium:** WCAG 2.1 AA + navegación por teclado completa
- **Performance Optimizada:** Lazy loading, virtualización, memoización
- **Offline Support:** Funcionalidad básica sin conexión
- **Real-time Updates:** WebSocket integration para updates instantáneos
- **Multi-language:** i18n completo con detección automática de idioma

### **👨‍💼 Componentes de Administración Avanzados**

#### **🔧 Super Admin Components:**
```bash
/components/admin/
├── AdminPanel.tsx             # Panel principal unificado (179KB - súper completo)
│   ├── 📊 Analytics Globales   # RealTimeCharts con métricas de todo el sistema
│   ├── 👥 Gestión de Usuarios  # CRUD completo de todos los usuarios
│   ├── 🏢 Gestión de Clientes  # Creación y configuración de empresas
│   ├── 🤖 Gestión de Chatbots  # Asignación y configuración de chatbots
│   ├── 📈 Reportes Avanzados   # Analytics y métricas del sistema
│   └── ⚙️ Configuración Global # Settings del sistema completo
├── AdminLimitedPanel.tsx      # Panel limitado para admin normal
├── ChatbotManagement.tsx      # Gestión específica de chatbots
├── ChatbotAssignments.tsx     # Asignación de usuarios a chatbots
├── YamlConfigManager.tsx      # Editor de configuraciones YAML
└── DataSourceManager.tsx      # Gestión de fuentes de datos
```

#### **🏢 Admin-Client Components (Sistema Empresarial):**
```bash
/components/admin-client/
├── AdminClientDashboard.tsx   # Wrapper principal (llama a AdminLimitedPanel)
├── /app/admin-client/page.tsx  # 🔥 Dashboard COMPLETO (467 líneas)
│   ├── 📊 Dashboard Stats      # Estadísticas empresariales en tiempo real
│   ├── 👥 Gestión de Usuarios  # CRUD de empleados con roles avanzados
│   ├── 📦 Gestión de Productos # Creación de chatbots personalizados
│   ├── ⚙️ Configuración        # Settings empresariales completos
│   ├── 🔔 Sistema de Notificaciones # Toast notifications integradas
│   └── 🎨 UI/UX Moderna        # Framer Motion + gradientes + responsive
├── ClientUsersManagement.tsx  # 🚀 Gestión avanzada de usuarios (1,494 líneas)
│   ├── 📱 Validación WhatsApp  # Números de teléfono argentinos
│   ├── 🏢 Sistema Multi-CUIT   # Hasta 3 CUITs por usuario
│   ├── 🎭 Roles Granulares     # viewer, editor, user
│   ├── 🔍 Búsqueda y Filtros   # Por rol, estado, nombre
│   ├── ✏️ Edición Inline       # Modificación rápida de datos
│   ├── 🗑️ Eliminación Híbrida  # Deactivate vs permanent delete
│   └── 👁️ Modal de Visualización # Vista de solo lectura
├── ClientProductsManagement.tsx # 🎯 Gestión de productos (772 líneas)
│   ├── 🤖 Tipos de Chatbot     # chatbot, api, web
│   ├── ⚙️ Configuración Avanzada # Welcome message, prompts, contexto
│   ├── 📊 Estadísticas         # Usuarios asignados, mensajes/mes
│   ├── 🔍 Filtros y Búsqueda   # Por tipo, estado, nombre
│   ├── 📁 Gestión de Archivos  # Knowledge files integrado
│   └── 🏭 Lógica Específica Bayer # Restricciones especiales
├── KnowledgeFileManager.tsx   # 📚 Gestión de archivos (387 líneas)
│   ├── 📄 Soporte Multi-formato # PDF, CSV, XLSX
│   ├── 📏 Validaciones         # Tamaño (10MB), cantidad (20 files)
│   ├── 🔄 Estados de Procesamiento # upload → processing → completed
│   ├── 📊 Estadísticas         # Total files, chunks, size
│   ├── ❌ Manejo de Errores    # Feedback detallado de fallos
│   └── 🔄 Actualización Automática # Refresh de estados
├── ClientSettings.tsx         # ⚙️ Configuraciones empresariales (645 líneas)
│   ├── 🏢 General Settings     # Nombre, descripción, timezone, idioma
│   ├── 🔐 Seguridad Avanzada   # 2FA, session timeout, password policy
│   ├── 🔔 Notificaciones       # Email, SMS, alertas sistema/usuarios
│   ├── 💳 Facturación         # Plan, email billing, auto-renewal
│   ├── 📊 IP Whitelisting      # Control de acceso por IP
│   └── 💾 Persistencia         # Auto-save de configuraciones
└── TestUsersManagement.tsx    # 🧪 Gestión de usuarios de prueba
```

#### **🏗️ Arquitectura de Componentes:**
- **AdminPanel.tsx** (179KB): Componente súper completo con TODA la funcionalidad de super admin
- **/app/admin-client/page.tsx** (467 líneas): Dashboard moderno y completo para admin-cliente
- **AdminClientDashboard.tsx**: Wrapper simple que delega a AdminLimitedPanel
- **ClientUsersManagement.tsx** (1,494 líneas): Sistema complejo de gestión de usuarios empresariales
- Los demás componentes son módulos especializados con funcionalidades específicas

### **📊 Sistema de Gráficos y Analytics Avanzado**

#### **🔥 Componentes Principales de Gráficos:**
```bash
/components/
├── RealTimeCharts.tsx         # 🚀 Motor de analytics en tiempo real (517 líneas)
│   ├── 📊 Múltiples Librerías  # Tremor React + integración Recharts
│   ├── ⚡ Auto-refresh        # Actualización cada 30 segundos
│   ├── 🎛️ Filtros Temporales  # 7, 15, 30, 90 días
│   ├── 🎯 Doble Modalidad     # Global (super admin) vs cliente específico
│   ├── 📈 Tipos de Gráficos   # Area, Bar, Donut, Line charts
│   ├── 📊 Datos Procesados    # Eventos por hora, tipos, tendencias
│   ├── 🔄 Estados de Carga    # Skeletons animados
│   └── ❌ Manejo de Errores   # Fallbacks y retry automático
├── charts/
│   ├── DashboardCharts.tsx    # 📈 Gráficos del dashboard (Recharts)
│   │   ├── 📊 Crecimiento Usuarios # Por mes con validación
│   │   ├── 🎯 Actividad Productos # Métricas específicas
│   │   ├── 📅 Engagement Mensual  # Métricas de interacción
│   │   └── ✅ Validación Automática # Datos limpios
│   ├── ShadcnChartTabs.tsx    # 📑 Gráficos con pestañas avanzadas
│   └── FallbackChart.tsx      # 🛡️ Gráfico de respaldo para errores
└── ui/
    └── chart.tsx              # 🏗️ Componente base UI de gráficos (Shadcn/ui)
```

#### **🛠️ Utilidades de Gráficos:**
```bash
/lib/utils/
└── chart-data-parser.ts       # Parser inteligente de datos para gráficos
```

#### **📈 Funcionalidades de Gráficos:**

**RealTimeCharts.tsx (🔥 Motor de Analytics Avanzado):**
- ✅ **Métricas en Tiempo Real**: Usuarios activos, conversaciones, mensajes, eventos
- ✅ **Múltiples Tipos de Gráficos**: AreaChart, BarChart, DonutChart, LineChart (Tremor React)
- ✅ **Doble Modalidad**: Analytics globales (super admin) vs específicos por cliente
- ✅ **Actualización Automática**: Refresh cada 30 segundos configurable
- ✅ **Filtros Temporales**: 7, 15, 30, 90 días
- ✅ **Datos Procesados**:
  - Eventos por hora con timestamps
  - Distribución por tipo de evento
  - Tendencias de crecimiento con porcentajes
  - Eventos recientes con información de usuario/producto
- ✅ **Estados de Carga**: Skeletons y spinners durante fetch
- ✅ **Manejo de Errores**: Fallbacks y retry automático

**DashboardCharts.tsx:**
- ✅ Crecimiento de usuarios por mes
- ✅ Actividad de productos específicos
- ✅ Métricas mensuales de engagement
- ✅ Validación automática de datos

**chart-data-parser.ts (🤖 IA-Powered):**
- ✅ Convierte URLs de QuickChart a gráficos nativos
- ✅ Parsea datos de texto/respuestas de IA automáticamente
- ✅ Detecta y convierte múltiples formatos de datos
- ✅ Permite que la IA genere gráficos desde texto

#### **📦 Librerías de Gráficos:**
```bash
# Tremor React (moderna y fácil)
@tremor/react: AreaChart, BarChart, DonutChart, LineChart

# Recharts (potente y personalizable)  
recharts: Bar, BarChart, Area, AreaChart, PieChart, LineChart

# Chart.js (disponible pero menos usado)
chart.js + react-chartjs-2
```

#### **💡 Uso Avanzado de Gráficos:**
```typescript
// En AdminPanel.tsx - Analytics Globales
import RealTimeCharts from '@/components/RealTimeCharts';

<RealTimeCharts 
  clientId={''} // Vacío para super admin = analytics globales
  isAdmin={true}
  productId={productId}
/>

// En Admin-Client Dashboard - Analytics Específicos
<RealTimeCharts 
  clientId={clientUser.clientId} // ID específico del cliente
  isAdmin={false}
  productId={selectedProduct?.id}
/>

// Para gráficos generados por IA
import { autoParseChartData } from '@/lib/utils/chart-data-parser';

const chartData = autoParseChartData(aiResponse);

// Configuración avanzada con múltiples métricas
const realTimeConfig = {
  refreshInterval: 30000, // 30 segundos
  selectedDays: '7', // Últimos 7 días
  activeTab: 'daily', // daily | hourly | events
  autoRefresh: true,
  showTrends: true,
  enableExport: true
};
```

### **🎛️ Componentes UI Reutilizables (Design System Completo)**
```bash
/components/ui/
├── button.tsx                 # 🔘 Botones con variantes (primary, secondary, outline, ghost)
├── input.tsx                  # 📝 Campos de entrada con validación
├── dialog.tsx                 # 🪟 Modales y diálogos responsivos
├── toast.tsx                  # 🔔 Sistema de notificaciones toast
├── select.tsx                 # 📋 Selectores dropdown con búsqueda
├── checkbox.tsx               # ☑️ Checkboxes personalizados
├── switch.tsx                 # 🔘 Switches/toggles animados
├── tabs.tsx                   # 📑 Componente de pestañas
├── chart.tsx                  # 📊 Componente base de gráficos (Shadcn/ui)
├── card.tsx                   # 🃏 Tarjetas con header, content, footer
├── badge.tsx                  # 🏷️ Badges para estados y etiquetas
├── avatar.tsx                 # 👤 Avatares de usuario
├── skeleton.tsx               # 💀 Skeletons para estados de carga
├── spinner.tsx                # ⭕ Spinners de carga
├── alert.tsx                  # ⚠️ Alertas y mensajes de estado
├── progress.tsx               # 📊 Barras de progreso
├── table.tsx                  # 📋 Tablas responsivas
├── form.tsx                   # 📝 Componentes de formulario
├── dropdown-menu.tsx          # 📋 Menús dropdown
├── popover.tsx                # 💬 Popovers y tooltips
├── sheet.tsx                  # 📜 Paneles laterales
├── scroll-area.tsx            # 📜 Áreas de scroll personalizadas
└── [10+ componentes más...]   # Biblioteca completa de UI Shadcn/ui
```

#### **🎨 Características del Design System:**
- **Basado en Shadcn/ui**: Componentes modernos y accesibles
- **TailwindCSS**: Styling utility-first con tema personalizado
- **Radix UI**: Primitivos accesibles como base
- **Variantes Consistentes**: Sistema de colores y tamaños unificado
- **Dark Mode**: Soporte completo para tema oscuro
- **Responsive**: Todos los componentes optimizados para móvil
- **Accesibilidad**: Cumple estándares WCAG 2.1
- **TypeScript**: Tipado completo para mejor DX

---

## 🗄️ **Base de Datos (Prisma)**

### **Modelos Principales:**
```prisma
model usuarios {
  id           String   @id @default(uuid())
  email        String   @unique
  password     String
  nombre       String?
  role         String   @default("user")  // "admin", "admin-client", "user"
  isActive     Boolean  @default(true)
  clientId     String?  // Para usuarios de cliente específico
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model chatbot_owners {
  id           String   @id @default(uuid())
  usuario_id   String   // Relación con usuarios
  chatbot_id   String   // ID único del chatbot
  chatbot_name String   // Nombre del chatbot
  company_name String   // Nombre de la empresa
  permissions  Json     @default("{}")
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}

model Message {
  id              String   @id @default(uuid())
  text            String?
  userId          String?
  conversation_id String?
  role            String?  // "user" | "assistant" | "system"
  message_type    String   @default("text")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model app_states {
  app_name    String   @id
  state       Json     // Estado flexible en JSON
  update_time DateTime @updatedAt
}
```

### **Comandos de Base de Datos:**
```bash
# Desarrollo
npm run db:generate          # Generar cliente Prisma
npm run db:push             # Aplicar cambios al esquema
npm run db:migrate          # Crear migración
npm run db:seed             # Poblar con datos de prueba

# Producción y Backups
npm run db:backup           # Crear backup completo
npm run db:backup-schema    # Backup solo del esquema
npm run safe-migrate        # Migración segura sin perder datos
npm run db:verify           # Verificar integridad de datos
npm run db:recovery         # Recuperar desde backup
```

---

## 🔄 **Flujos de Usuario Completos**

### **1. Flujo de Nuevo Cliente**
```
1. Super Admin crea cliente en /admin/clients
2. Configura chatbot específico con YAML
3. Asigna admin-cliente al nuevo cliente
4. Admin-cliente configura usuarios y productos
5. Usuarios finales acceden a su chatbot específico
```

### **2. Flujo de Chat Normal**
```
1. Usuario accede a /chatbot/[clientId]
2. Sistema verifica autenticación y permisos
3. Carga configuración específica del cliente
4. Renderiza ChatbotBase con props personalizadas
5. Usuario interactúa → Mensajes se procesan vía API
6. Respuestas se almacenan en BD y muestran en tiempo real
```

### **3. Flujo de Chatbot de Producto (Sin Auth)**
```
1. Usuario accede a /chatbot/[uuid-producto]
2. Sistema detecta UUID → isProductChatbot = true
3. Permite acceso directo sin autenticación
4. Carga configuración específica del producto
5. Chat funciona normalmente pero sin persistencia de usuario
```

---

## 🚀 **Configuración y Despliegue**

### **Variables de Entorno Críticas:**
```bash
# Base de datos
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Autenticación
NEXTAUTH_SECRET="tu-secreto-super-seguro"
NEXTAUTH_URL="https://tu-dominio.com"

# IA y APIs
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Email (opcional)
SENDGRID_API_KEY="SG...."
```

### **Desarrollo Local:**
```bash
# Instalación inicial
git clone [repo]
cd chatbot-nextjs
npm install

# Configurar base de datos
cp .env.example .env.local
# Editar variables de entorno
npm run db:generate
npm run db:push
npm run db:seed

# Iniciar desarrollo
npm run dev  # Puerto 3000
```

### **Docker (Recomendado):**
```bash
# Desarrollo con Docker
docker-compose up --build

# Servicios disponibles:
# - Next.js Frontend: http://localhost:3000
# - Python API: http://localhost:8000
# - Netlify Functions: Node.js 22.13.1
```

### **Producción (Google Cloud Run):**
```bash
# Build y deploy
gcloud builds submit --tag us-central1-docker.pkg.dev/poc-suroeste/containers/chatbot-clients:latest .

gcloud run deploy chatbot-clients \
  --image us-central1-docker.pkg.dev/poc-suroeste/containers/chatbot-clients:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80 \
  --execution-environment=gen2 \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 1
```

---

## 🐛 **Problemas Resueltos y Optimizaciones**

### **Correcciones Críticas Implementadas:**

#### **React Error #31 - Promesas como Children**
- **Problema:** Promesas no manejadas se renderizaban como children de React
- **Solución:** Encapsulado de lógica async en funciones auto-ejecutables
- **Archivos afectados:** `ChatInput.tsx`, `login/page.tsx`

#### **Sidebar Mobile Auto-Open**
- **Problema:** Sidebar se abría automáticamente en móviles impidiendo ver chat
- **Solución:** Estado inicial responsive + auto-cierre inteligente
- **Comportamiento:** Cerrado por defecto en <1280px, abierto en ≥1280px

#### **ChatInput - Mensajes que se Borran**
- **Problema:** Conflicto entre estado local y props del padre
- **Solución:** Estado `isSubmitting` + sincronización mejorada
- **Resultado:** Prevención de envíos duplicados y pérdida de mensajes

#### **Tutorial Repetitivo**
- **Problema:** OnboardingTutorial se mostraba en cada nueva conversación
- **Solución:** Control dual con `sessionStorage` + `localStorage`
- **Resultado:** Tutorial solo se muestra una vez por sesión

#### **Error "filter is not a function" en Componentes**
- **Problema:** Los componentes lanzaban error cuando el backend retornaba datos inesperados
- **Causa:** No se validaba que `data` fuera un array antes de usar `.filter()`
- **Solución:** Validaciones `Array.isArray()` en todos los componentes y `setState([])` en catch
- **Archivos afectados:** `ConnectionsView.tsx`, `MetricsView.tsx`, `DataAccessView.tsx`, `DeploysView.tsx`
- **Resultado:** Sistema robusto que siempre funciona con array vacío en caso de error

#### **Limpieza del Sistema admin-client**
- **Problema:** Duplicación de rutas y confusión entre `/admin-client/` y `/dashboard/admin/`
- **Solución implementada:**
  - ❌ Eliminada página `/app/admin-client/page.tsx` (redirigía a /dashboard/admin/)
  - ❌ Eliminadas 4 páginas duplicadas de módulos
  - ✅ Sistema unificado en `/dashboard/admin/` con 11 tabs por chatbot
  - ✅ Mantenidas carpetas `admin-client` (componentes y API) por compatibilidad
- **Resultado:** Un solo sistema sin duplicaciones ni confusión

#### **Asignación Automática de Acceso a Chatbots**
- **Problema:** Chatbots se creaban pero no aparecían listados porque faltaba asignar acceso al usuario
- **Solución:** Auto-asignación usando `grantProductAccess()` después de crear el chatbot
- **Archivos afectados:** 
  - `/api/admin-client/products/route.ts`
  - `/api/backend/products/route.ts`
- **Resultado:** Usuario ve inmediatamente el chatbot creado en su lista

### **Optimizaciones de Performance:**
- ✅ Timeout de API aumentado de 25s a 60s
- ✅ Cleanup de AbortControllers y timeouts
- ✅ Prevención de memory leaks en event listeners
- ✅ Optimización de consultas Prisma con índices
- ✅ Lazy loading de componentes pesados
- ✅ Validaciones de array en todos los componentes nuevos
- ✅ Manejo robusto de errores con console.error

---

## 📚 **Documentación Adicional**

### **Archivos de Referencia:**
- `README.md` - Instalación y configuración básica
- `CHANGELOG.md` - Historial detallado de cambios
- `DOCUMENTACION_SISTEMA_ROLES.md` - Sistema de permisos y roles
- `ANALISIS_PANEL_SUPER_ADMIN.md` - Funcionalidades del panel admin
- `SISTEMA_ASIGNACION_CHATBOTS_ADMIN.md` - Asignación de chatbots
- `debug.md` - Guía de resolución de problemas

### **Comandos de Ayuda:**
```bash
# Ver todos los comandos de recuperación disponibles
npm run recovery:help

# Testing
npm run test              # Ejecutar tests
npm run test:watch        # Tests en modo watch
npm run test:coverage     # Coverage report

# Linting y calidad de código
npm run lint              # ESLint
npm run build             # Build de producción
```

---

## 🎯 **Guía de Continuidad para el Equipo**

### **Semana 1-2: Configuración y Familiarización**
1. **Setup del entorno:**
   - Clonar repo y configurar variables de entorno
   - Levantar con Docker: `docker-compose up --build`
   - Verificar acceso a BD y APIs funcionando

2. **Exploración del código:**
   - Revisar flujo de autenticación en `/app/login`
   - Entender `ChatbotBase.tsx` y sus props
   - Explorar sistema de roles en `/components/admin`

### **Semana 3+: Desarrollo Activo**
1. **Nuevas funcionalidades prioritarias:**
   - Analytics avanzados por cliente
   - Sistema de notificaciones en tiempo real
   - Integración con más proveedores de IA
   - API de webhooks para integraciones externas

2. **Optimizaciones técnicas:**
   - Caching de respuestas frecuentes con Redis
   - Optimización de queries complejas
   - Implementar WebSockets para chat en tiempo real
   - Mejoras en el sistema de archivos de conocimiento

### **Mantenimiento Continuo:**
1. **Monitoreo:**
   - Logs en directorio `/logs`
   - Métricas de Google Cloud Run
   - Alertas de performance y errores

2. **Backups y seguridad:**
   - Backup semanal: `npm run db:backup`
   - Verificación mensual: `npm run db:verify`
   - Auditoría de seguridad de dependencias

---

## 🆘 **Contactos y Recursos de Emergencia**

### **Comandos de Emergencia:**
```bash
# Si la aplicación no funciona
docker-compose down && docker-compose up --build

# Si hay problemas con la BD
npm run db:recovery        # Aplicar schema de recuperación
npm run db:restore-data    # Restaurar datos de muestra

# Si hay problemas con migraciones
npm run safe-rollback      # Rollback seguro
npm run db:verify          # Verificar integridad

# Debugging general
npm run test               # Verificar que tests pasen
docker-compose logs [servicio]  # Ver logs específicos
```

### **Estructura de Logs:**
```bash
/logs/
├── application.log        # Logs generales de la aplicación
├── error.log             # Solo errores críticos
├── chat.log              # Logs específicos del sistema de chat
└── admin.log             # Logs de operaciones administrativas
```

---

## 📈 **Métricas y KPIs del Sistema**

### **Métricas Técnicas:**
- Tiempo de respuesta promedio del chat: <2s
- Uptime objetivo: 99.9%
- Concurrent users soportados: 1000+
- Tamaño promedio de respuesta: <50KB

### **Métricas de Negocio:**
- Número de clientes activos
- Mensajes procesados por día
- Satisfacción de usuarios (ratings)
- Tiempo promedio de resolución

---

## 🔮 **Roadmap Futuro**

### **Q1 2024:**
- [ ] Implementar WebSockets para chat en tiempo real
- [ ] Sistema de plugins para integraciones personalizadas
- [ ] Dashboard de analytics avanzado
- [ ] API pública para desarrolladores

### **Q2 2024:**
- [ ] Soporte para múltiples idiomas
- [ ] Integración con más proveedores de IA
- [ ] Sistema de templates de chatbot
- [ ] Modo offline/PWA

### **Q3 2024:**
- [ ] Marketplace de plugins
- [ ] Sistema de A/B testing
- [ ] Integración con CRM populares
- [ ] Mobile app nativa

---

---

## ✅ **Checklist de Handover - Actualizado 22/09/2025**

### **Para el Equipo Técnico:**
- [ ] Acceso al repositorio configurado
- [ ] Variables de entorno documentadas y configuradas
- [ ] Base de datos de desarrollo funcionando
- [ ] Docker environment levantado correctamente
- [ ] Tests pasando sin errores
- [ ] Documentación leída y comprendida

### **Para Product Managers:**
- [ ] Roadmap priorizado y documentado
- [ ] Métricas y KPIs definidos
- [ ] Feedback de usuarios recopilado
- [ ] Casos de uso documentados
- [ ] Stakeholders identificados y contactados

### **Para DevOps:**
- [ ] Pipelines de CI/CD configurados
- [ ] Monitoreo y alertas activos
- [ ] Backups automatizados funcionando
- [ ] Procedimientos de rollback documentados
- [ ] Escalabilidad horizontal configurada

---

*Documentación creada el 17 de septiembre de 2025*  
*Versión del proyecto: 0.1.0*  
*Última actualización MAYOR: 22 de septiembre de 2025*

---

## 📋 **Registro de Actualizaciones de Documentación**

### **🆕 Actualización del 22/09/2025 - Enriquecimiento Completo**

**✨ Nuevas Secciones Añadidas:**
- **🤖 Características Avanzadas de los Chatbots Multi-Cliente**: Sistema completo de chatbots dinámicos
- **⚡ ChatbotBase.tsx Detallado**: Props configurables, gestión de estados avanzada
- **💡 Sistema de Personalización por Cliente**: Configuraciones específicas por empresa
- **📊 Analytics en Tiempo Real**: RealTimeCharts con métricas avanzadas
- **🎯 Casos de Uso Específicos**: Cliente Bayer y empresariales estándar
- **🔐 Seguridad Avanzada por Chatbot**: Niveles de seguridad y funcionalidades

**🔥 Características del Dashboard Admin-Client Enriquecidas:**
- **📊 Estadísticas Avanzadas**: Métricas en tiempo real desde API `/admin-client/dashboard`
- **👥 Gestión de Usuarios Empresariales**: Sistema de múltiples CUITs, validación WhatsApp
- **📦 Gestión de Productos/Chatbots**: Configuración personalizada completa
- **📚 Sistema de Archivos de Conocimiento**: PDF, CSV, XLSX con procesamiento automático
- **⚙️ Configuraciones Empresariales**: General, seguridad, notificaciones, facturación
- **🎨 UI/UX Moderna**: Framer Motion, gradientes, responsive design
- **🔐 Seguridad Avanzada**: JWT, roles granulares, audit logging

**🧩 Componentes Detallados:**
- **💬 Sistema de Chat Avanzado**: ChatInput, ChatHeader, ChatSidebar con funcionalidades premium
- **👨‍💼 Componentes de Administración**: AdminPanel (179KB), ClientUsersManagement (1,494 líneas)
- **📊 Sistema de Gráficos**: RealTimeCharts (517 líneas) con analytics en tiempo real
- **🎛️ Design System Completo**: 25+ componentes UI reutilizables con TypeScript

**🔌 APIs Enriquecidas:**
- **👨‍💼 Admin-Client APIs Completas**: dashboard, users, products, settings, charts
- **📊 Analytics Avanzados**: real-time, global, events, reports
- **📚 Knowledge Files**: Gestión de archivos con procesamiento automático

**🚀 Funcionalidades Técnicas Destacadas:**
- **Motor de Detección Automática**: UUID vs nombre para tipos de chatbot
- **Sistema Multi-CUIT**: Hasta 3 códigos CUIT por usuario empresarial
- **Analytics Duales**: Globales (super admin) vs específicos (cliente)
- **Procesamiento de Archivos**: Estados upload → processing → completed
- **Responsive Inteligente**: Breakpoint 1280px con auto-collapse
- **Seguridad Granular**: 4 niveles de seguridad por tipo de chatbot

**📈 Métricas y KPIs Añadidos:**
- Usuarios activos vs inactivos por empresa
- Crecimiento porcentual calculado automáticamente
- Métricas por producto con usuarios asignados
- Analytics en tiempo real con refresh cada 30 segundos
- Eventos por hora y distribución por tipo

**🎯 Total de Nuevas Características Documentadas: 50+**

### **📊 Estadísticas de la Documentación:**
- **Líneas totales**: ~1,100+ líneas
- **Secciones principales**: 15 secciones
- **Componentes documentados**: 35+ componentes
- **APIs documentadas**: 25+ endpoints
- **Casos de uso**: 10+ escenarios específicos
- **Ejemplos de código**: 20+ snippets
- **Características técnicas**: 100+ funcionalidades
