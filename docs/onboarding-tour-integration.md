# 🎯 Integración de Atributos data-tour para Onboarding

## Resumen

Para que el tour de onboarding funcione correctamente y guíe al usuario a través de la jerarquía **Organizaciones → Proyectos → Chatbots**, necesitas agregar atributos `data-tour` a los elementos clave en cada página.

## Atributos Requeridos por Página

### 1. Dashboard Principal (`/dashboard/admin/page.tsx`)

✅ **Ya implementado en el layout:**
- `data-tour="dashboard-menu"` - Botón Dashboard en sidebar
- `data-tour="organizations-menu"` - Botón Organizaciones en sidebar

### 2. Página de Organizaciones (`/dashboard/admin/organizations/page.tsx`)

Necesitas agregar en el componente `OrganizationList.tsx`:

```tsx
// Botón "Crear Organización"
<button data-tour="create-organization" ...>
  Crear Organización
</button>

// Primera tarjeta de organización (o contenedor de tarjetas)
<div data-tour="organization-card" ...>
  {/* Contenido de la tarjeta */}
</div>
```

**Ubicación del archivo:** `/src/components/admin-client/OrganizationList.tsx`

**Ejemplo de implementación:**

```tsx
// En el botón de crear
<Button 
  data-tour="create-organization"
  onClick={handleCreateOrganization}
>
  <Plus className="w-4 h-4 mr-2" />
  Nueva Organización
</Button>

// En el grid de organizaciones, agregar al primer elemento
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {organizations.map((org, index) => (
    <div 
      key={org.id}
      data-tour={index === 0 ? "organization-card" : undefined}
      className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
      onClick={() => handleSelectOrganization(org.id)}
    >
      {/* Contenido de la tarjeta */}
    </div>
  ))}
</div>
```

### 3. Página de Proyectos (`/dashboard/admin/organizations/[orgId]/projects/page.tsx`)

Necesitas agregar en el componente `ProjectList.tsx`:

```tsx
// Botón "Crear Proyecto"
<button data-tour="create-project" ...>
  Crear Proyecto
</button>

// Primera tarjeta de proyecto
<div data-tour="project-card" ...>
  {/* Contenido de la tarjeta */}
</div>
```

**Ubicación del archivo:** `/src/components/admin-client/ProjectList.tsx`

**Ejemplo de implementación:**

```tsx
// En el botón de crear
<Button 
  data-tour="create-project"
  onClick={handleCreateProject}
>
  <Plus className="w-4 h-4 mr-2" />
  Nuevo Proyecto
</Button>

// En el grid de proyectos
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {projects.map((project, index) => (
    <div 
      key={project.id}
      data-tour={index === 0 ? "project-card" : undefined}
      className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-6 hover:border-green-500 transition-colors cursor-pointer"
      onClick={() => handleSelectProject(project.id)}
    >
      {/* Contenido de la tarjeta */}
    </div>
  ))}
</div>
```

### 4. Página de Chatbots (`/dashboard/admin/organizations/[orgId]/projects/[projectId]/chatbots/page.tsx`)

Necesitas agregar en el componente `ProjectChatbotsView.tsx`:

```tsx
// Botón "Crear Chatbot"
<button data-tour="create-chatbot" ...>
  Crear Chatbot
</button>

// Primera tarjeta de chatbot
<div data-tour="chatbot-card" ...>
  {/* Contenido de la tarjeta */}
</div>
```

**Ubicación del archivo:** `/src/components/admin-client/ProjectChatbotsView.tsx`

**Ejemplo de implementación:**

```tsx
// En el botón de crear
<Button 
  data-tour="create-chatbot"
  onClick={handleCreateChatbot}
>
  <Plus className="w-4 h-4 mr-2" />
  Nuevo Chatbot
</Button>

// En el grid de chatbots
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {chatbots.map((chatbot, index) => (
    <div 
      key={chatbot.id}
      data-tour={index === 0 ? "chatbot-card" : undefined}
      className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-6 hover:border-purple-500 transition-colors cursor-pointer"
      onClick={() => handleSelectChatbot(chatbot.id)}
    >
      {/* Contenido de la tarjeta */}
    </div>
  ))}
</div>
```

### 5. Detalle del Chatbot (`ChatbotDetail.tsx`)

Necesitas agregar en el layout de tabs:

```tsx
// Contenedor de tabs
<div data-tour="chatbot-tabs" className="flex gap-2 border-b border-gray-800">
  {/* Tabs */}
</div>

// Tab específicos
<button data-tour="general-tab" ...>General</button>
<button data-tour="prompt-tab" ...>Prompt</button>
<button data-tour="permissions-tab" ...>Permisos</button>
<button data-tour="data-access-tab" ...>Data Access</button>
```

**Ubicación:** En el layout del dashboard admin donde se renderizan las tabs del chatbot (probablemente en `/src/app/dashboard/admin/layout.tsx` en la sección de menú contextual del chatbot)

**Ejemplo de implementación:**

```tsx
// En el array de menuItems para chatbot detail
const chatbotMenuItems = [
  {
    id: 'general',
    label: 'General',
    icon: FiBarChart,
    path: `${chatbotBasePath}?section=general`,
    dataTour: 'general-tab'
  },
  {
    id: 'prompt',
    label: 'Prompt',
    icon: FiPenTool,
    path: `${chatbotBasePath}?section=prompt`,
    dataTour: 'prompt-tab'
  },
  {
    id: 'permisos',
    label: 'Permisos',
    icon: FiUser,
    path: `${chatbotBasePath}?section=permisos`,
    dataTour: 'permissions-tab'
  },
  {
    id: 'data-access',
    label: 'Data Access',
    icon: FiShield,
    path: `${chatbotBasePath}?section=data-access`,
    dataTour: 'data-access-tab'
  },
  // ... resto de tabs
];

// Y en el render:
<button
  data-tour={item.dataTour}
  onClick={() => handleTabClick(item.id)}
>
  {item.label}
</button>
```

## Lógica del Tour Interactivo

El tour está configurado con `spotlightClicks: true` en los pasos clave, lo que significa:

1. **Paso "Organizaciones"**: El usuario DEBE hacer clic en el botón "Organizaciones" para continuar
2. **Paso "Seleccionar Organización"**: El usuario DEBE hacer clic en una tarjeta de organización
3. **Paso "Seleccionar Proyecto"**: El usuario DEBE hacer clic en una tarjeta de proyecto
4. **Paso "Seleccionar Chatbot"**: El usuario DEBE hacer clic en una tarjeta de chatbot

Esto crea una experiencia guiada e interactiva donde el usuario aprende haciendo.

## Manejo de Casos Sin Datos

El tour incluye pasos para mostrar los botones de "Crear" en cada nivel:

- Si no hay organizaciones → Muestra `data-tour="create-organization"`
- Si no hay proyectos → Muestra `data-tour="create-project"`
- Si no hay chatbots → Muestra `data-tour="create-chatbot"`

**Importante:** Asegúrate de que estos botones siempre tengan el atributo `data-tour`, incluso cuando las listas estén vacías.

## Verificación

Para verificar que los atributos están correctamente implementados:

1. Abre las DevTools del navegador
2. En la consola, ejecuta:

```javascript
// Verificar elementos del tour
console.log('Dashboard:', document.querySelector('[data-tour="dashboard-menu"]'));
console.log('Organizations:', document.querySelector('[data-tour="organizations-menu"]'));
console.log('Create Org:', document.querySelector('[data-tour="create-organization"]'));
console.log('Org Card:', document.querySelector('[data-tour="organization-card"]'));
// ... etc
```

3. Todos los elementos deberían devolver un elemento HTML, no `null`

## Orden de Implementación Recomendado

1. ✅ **Layout** (Ya implementado)
2. **OrganizationList.tsx** - Agregar `create-organization` y `organization-card`
3. **ProjectList.tsx** - Agregar `create-project` y `project-card`
4. **ProjectChatbotsView.tsx** - Agregar `create-chatbot` y `chatbot-card`
5. **Layout (tabs del chatbot)** - Agregar `chatbot-tabs`, `general-tab`, `prompt-tab`, etc.

## Testing del Tour Completo

Una vez implementados todos los atributos:

1. Resetear el onboarding:
```javascript
localStorage.removeItem('minddash_onboarding_completed');
```

2. Recargar la página en `/dashboard/admin`

3. El tour debería:
   - Mostrar bienvenida
   - Guiar al menú
   - Animar a hacer clic en "Organizaciones"
   - Mostrar cómo crear/seleccionar organización
   - Guiar a proyectos
   - Mostrar cómo crear/seleccionar proyecto
   - Guiar a chatbots
   - Mostrar cómo crear/seleccionar chatbot
   - Explicar las tabs del chatbot
   - Finalizar con resumen

## Troubleshooting

### El tour se salta pasos
- Verifica que el elemento con `data-tour` exista en el DOM cuando el tour llega a ese paso
- Usa `console.log` para verificar que el elemento está renderizado

### El tour no permite hacer clic
- Asegúrate de que `spotlightClicks: true` esté en el paso correspondiente en `OnboardingTour.tsx`
- Verifica que el z-index del tour no esté bloqueando los clics

### Los elementos no se destacan correctamente
- Verifica que el selector `[data-tour="..."]` sea único en la página
- Si hay múltiples elementos con el mismo `data-tour`, solo el primero será destacado

---

**Última actualización:** 3 de noviembre de 2025  
**Versión:** 2.0.0 - Tour Interactivo con Jerarquía
