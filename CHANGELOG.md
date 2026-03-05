# Changelog

Todos los cambios más significativos de este proyecto se documentarán en este archivo.

## Migración Segura de Base de Datos

#### 🔧 Scripts de Migración Implementados para DB
- **Scripts Funcionales**:
  - `create-data-backup.ts` - Backup completo de datos en CSV
  - `safe-migration-execution.ts` - Ejecución segura de migraciones
  - `verify-migration-success.ts` - Verificación de integridad post-migración
- **Comandos NPM Añadidos**:
  - `npm run db:backup-schema` - Backup del esquema Prisma
  - `npm run db:pull-safe` - Sincronización segura del esquema
  - `npm run db:verify` - Verificación de integridad
  - `npm run safe-migrate-execute` - Ejecución de migración segura

#### 🐛 Correcciones de Errores de Diagnóstico
- **Problema**: Errores de TypeScript en scripts de migración
- **Solución**:
  - Corregidos nombres de propiedades del cliente Prisma (`clients` → `client`, `appStates` → `app_states`)
  - Especificados tipos correctos (`row: any` en función `convertToCSV`)
  - Actualizados nombres de relaciones en cláusulas `include` de Prisma

### Enhanced
#### 📊 Base de Datos Optimizada
- Relaciones de claves foráneas establecidas correctamente
- Índices optimizados para consultas eficientes
- Esquema sincronizado con estado actual de la base de datos
- Cliente Prisma generado con todas las relaciones

#### 🔒 Integridad de Datos
- Validación completa de integridad referencial
- Backup automático antes de operaciones críticas
- Verificación post-migración implementada
- Comandos de verificación disponibles para uso futuro

## Correcciones Críticas de Responsive y Promesas

### Fixed - Sidebar Mobile Auto-Open (Actualización)
#### 📱 Sidebar se Abre Automáticamente en Móviles  
- **Problema**: El sidebar se abría automáticamente al escribir en chat móvil, impidiendo ver la conversación completa
- **Solución**:
  - Estado inicial del sidebar cambiado de `useState(true)` a `useState(false)`
  - Implementado detección responsive: cerrado en móvil (<1280px), abierto en desktop (≥1280px)
  - Eliminada lógica que forzaba apertura automática del sidebar
  - Listener de resize para mantener comportamiento correcto al cambiar orientación
- **Archivos Modificados**:
  - `src/app/page.tsx` - Página principal
  - `src/components/chatbots/ChatbotBase.tsx` - Páginas de chatbot específicas
- **Resultado**: Comportamiento igual a ChatGPT - sidebar cerrado por defecto en móviles

## Correcciones Críticas de Responsive y Promesas
### Fixed
#### 🐛 React Error #31 - Promesas como React Children
- **Problema**: Error React #31 causado por promesas no manejadas renderizándose como children
- **Solución**: 
  - Eliminado `await new Promise(resolve => setTimeout(resolve, 500))` en login y chat
  - Encapsulado lógica async de `handleSendMessage` en función auto-ejecutable
  - Añadido type annotation `Promise<void>` a funciones async
  - Mejorado manejo de errores en bloques try/catch

#### 📱 Responsive Mobile - OnBoarding Tutorial Repetitivo  
- **Problema**: Tutorial se mostraba cada vez que se abría nueva conversación
- **Solución**:
  - Implementado control de sesión con `sessionStorage` + `localStorage`
  - Añadido estado `tutorialShownInSession` para control adicional
  - Tutorial ahora solo se muestra una vez por sesión de navegador
  - Funcionalidad manual desde "Ayuda" preservada

#### 📱 Responsive Mobile - Sidebar Expandiéndose Constantemente
- **Problema**: Sidebar se abría automáticamente y no se cerraba tras interacciones
- **Solución**:
  - Auto-cierre inteligente después de: seleccionar conversación, crear nueva, enviar mensaje
  - Inicialización responsive: cerrado en móvil, abierto en desktop
  - Overlay mejorado con mejor contraste y blur
  - Detección automática de tamaño de pantalla (breakpoint xl: 1280px)

#### 🔐 Login - Múltiples Clics Requeridos
- **Problema**: Delay artificial y falta de prevención de múltiples envíos
- **Solución**:
  - Eliminado delay artificial que causaba problemas de estado
  - Añadido `if (loading) return;` para prevenir múltiples clics
  - Navegación inmediata sin delays innecesarios
  - Mejorado manejo de errores con try/catch apropiado

#### 💬 ChatInput - Mensaje se Borra y No se Envía
- **Problema**: Conflicto entre estado local del input y props del padre
- **Solución**:
  - Añadido estado `isSubmitting` para prevenir múltiples envíos
  - Simplificada sincronización entre `message` local e `inputValue` del padre
  - Mejorada función handleSubmit con async/await apropiado
  - Añadido spinner de carga durante envío
  - Prevención de envíos duplicados durante procesamiento

#### 🔄 Manejo de Estado Asíncrono
- **Problema**: Promesas mal manejadas causando errores de React
- **Solución**:
  - Función async auto-ejecutable en `handleSendMessage` 
  - Proper error handling en todos los bloques try/catch
  - Control de estado de loading mejorado
  - Cleanup de timeouts y abort controllers
  - Timeout aumentado de 25s a 60s para mejor estabilidad

### Enhanced
#### 🎨 Mejoras de UX
- Botón de envío con estados: Normal → Loading (spinner) → Success
- Prevención de spam de clics en login y chat
- Mejor feedback visual durante operaciones async
- Sidebar responsive con auto-detección de pantalla
- Tutorial con altura máxima `90vh` y scroll interno
- Overlay mejorado con `backdrop-blur-sm`

#### 🧹 Optimizaciones Técnicas
- Eliminado código SSR problemático en inicialización de sidebar
- useEffect optimizado para evitar re-ejecuciones innecesarias
- Cleanup de procesos de Next.js duplicados
- Manejo robusto de AbortController y timeouts
- Prevención de memory leaks en event listeners

### Notes
- Error React #31 en DevTools (`inspector.b9415ea5.js`) podría ser causado por React DevTools del navegador
- Todas las correcciones son backward-compatible
- Responsive optimizado para breakpoint xl (1280px)
- Control de sesión dual: `localStorage` (permanente) + `sessionStorage` (sesión)

## [Unreleased] 2025-05-28
### Added
- Google auth library para validar la llamada al agente.
- Modularize el renderizado de cada chatbot en chatbot/[id]
- AvailableClients en un archivo aparte.
- Endpoints en un archivo aparte.
- Renderizado de graficos.
- Json para la configuración de cada chatbot.
- ** ** En mensajes ahora se marcan con negrita.

## [Unreleased] 2025-05-16
### Added
- Sistema de autenticación actualizado, el usuario con isAdmin en true es el unico que puede seleccionar demos.
- Sistema de autenticación actualizado, el usuario con isAdmin en false, se redirreciona automaticamente a la url con su chatbot.
- Modularización del componente proximamente.
- Modularización para un chatbotBase al cual le pasamos las props de nuestro cliente especifico.
- Modularización de un hook de validación.
- Interfaz actualizada para poder recibir detalles de un cliente en especifico.
- Estados del localstorage para hacerlos generales (no de lisit/lisa).
- Actualización de imagenes y nombres de lisit/lisa a evolve.
- Vinculación para que cada cliente este conectado con su agente personalizado.

## [Unreleased]
### Added
- Sistema de autenticación con página de login y validación de credenciales.
- Selector de clientes para acceso a diferentes chatbots.
- Chatbots con URLs únicas (IDs personalizados) para mayor seguridad.
- Interfaz con tema oscuro para mejorar la experiencia de usuario.
- Páginas para los distintos tipos de chatbots: lisa, chatbotID3456, chatbotID6789.
- Documentación inicial estructurada (`README.md`, `journey.md`, `roadmap.md`, `work-log.md`, `CHANGELOG.md`).
- Configuración de Nginx para imágenes estáticas.
- Modal de preferencias y búsqueda avanzada en el sidebar.

### Fixed
- Manejo de errores 502 y 405 en producción.

## [1.0.0] - 2025-05-14
### Added
- Versión inicial estable del chatbot con sidebar, onboarding y despliegue automatizado.
