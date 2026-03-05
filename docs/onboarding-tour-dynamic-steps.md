# 🎯 Tour Dinámico con Detección de Contenido

## Problema Actual

El tour actual no detecta si hay organizaciones/proyectos/chatbots y no adapta los pasos según el contenido disponible.

## Solución Requerida

### 1. Cambios en el Mensaje del Paso "Organizaciones"

**Antes:**
```
👉 Haz clic aquí para ver las organizaciones
```

**Después:**
```
👈 Haz clic en este recuadro para ver las organizaciones
```

### 2. Lógica Dinámica de Pasos

El tour debe detectar automáticamente:

#### A. Si NO hay organizaciones:
1. Mostrar paso: "Haz clic en Organizaciones" (botón del menú)
2. Usuario hace clic → Navega a `/dashboard/admin/organizations`
3. Mostrar paso: "Crear tu primera organización" (botón `data-tour="create-organization"`)
4. Usuario hace clic en "Crear Organización"
5. **PAUSAR EL TOUR** hasta que se cree la organización
6. Cuando se crea → Mostrar paso: "Selecciona la organización que acabas de crear"
7. Usuario hace clic en la tarjeta → Continúa al siguiente nivel

#### B. Si SÍ hay organizaciones:
1. Mostrar paso: "Haz clic en Organizaciones" (botón del menú)
2. Usuario hace clic → Navega a `/dashboard/admin/organizations`
3. Mostrar paso: "Selecciona una organización" (tarjeta `data-tour="organization-card"`)
4. Usuario hace clic en tarjeta → Continúa al siguiente nivel

### 3. Misma Lógica para Proyectos y Chatbots

Aplicar la misma lógica condicional para:
- **Proyectos**: Si no hay → guiar a crear → pausar → continuar
- **Chatbots**: Si no hay → guiar a crear → pausar → continuar

### 4. Implementación Técnica

#### Paso 1: Detectar contenido disponible

En `/src/app/dashboard/admin/layout.tsx`:

```typescript
const [hasOrganizations, setHasOrganizations] = useState(false);
const [hasProjects, setHasProjects] = useState(false);
const [hasChatbots, setHasChatbots] = useState(false);

// Cargar y verificar contenido
useEffect(() => {
  const checkContent = async () => {
    const token = getAuthToken();
    
    // Verificar organizaciones
    const orgsResponse = await fetch('/api/admin-client/organizations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orgsData = await orgsResponse.json();
    setHasOrganizations(orgsData.data?.length > 0);
    
    // Similar para proyectos y chatbots...
  };
  
  if (runTour) {
    checkContent();
  }
}, [runTour]);
```

#### Paso 2: Pasar props al OnboardingTour

```typescript
<OnboardingTour
  run={runTour}
  hasOrganizations={hasOrganizations}
  hasProjects={hasProjects}
  hasChatbots={hasChatbots}
  onComplete={() => {
    markCompleted();
    setRunTour(false);
  }}
  onSkip={() => {
    markCompleted();
    setRunTour(false);
  }}
/>
```

#### Paso 3: Generar pasos dinámicamente en OnboardingTour

```typescript
const generateSteps = (): Step[] => {
  const steps: Step[] = [
    // Bienvenida
    { target: 'body', title: '¡Bienvenido!', ... },
    
    // Menú
    { target: '[data-tour="dashboard-menu"]', ... },
    
    // Organizaciones - botón del menú
    {
      target: '[data-tour="organizations-menu"]',
      content: '👈 Haz clic en este recuadro para ver las organizaciones',
      spotlightClicks: true,
    },
  ];

  // Condicional: Si NO hay organizaciones
  if (!hasOrganizations) {
    steps.push({
      target: '[data-tour="create-organization"]',
      content: 'Crea tu primera organización haciendo clic aquí',
      title: 'Crear organización',
      spotlightClicks: true,
    });
    // Aquí debería pausarse hasta que se cree
  } else {
    // Si SÍ hay organizaciones
    steps.push({
      target: '[data-tour="organization-card"]',
      content: '👈 Haz clic en una organización para continuar',
      spotlightClicks: true,
    });
  }

  // Repetir lógica para proyectos y chatbots...
  
  return steps;
};
```

#### Paso 4: Pausar y reanudar el tour

Para pausar el tour cuando el usuario está creando algo:

```typescript
// En el callback de Joyride
const handleJoyrideCallback = (data: CallBackProps) => {
  const { status, type, index, action } = data;

  // Si el usuario hace clic en "Crear Organización"
  if (index === STEP_CREATE_ORG && action === 'close') {
    // Pausar el tour
    setRunTour(false);
    
    // Escuchar evento de creación exitosa
    window.addEventListener('organization-created', () => {
      // Reanudar el tour en el siguiente paso
      setStepIndex(STEP_SELECT_ORG);
      setRunTour(true);
    }, { once: true });
  }
};
```

#### Paso 5: Emitir eventos desde los componentes de creación

En `OrganizationList.tsx`, después de crear exitosamente:

```typescript
const handleCreateOrganization = async () => {
  // ... lógica de creación ...
  
  if (response.ok) {
    toast.success('Organización creada');
    
    // Emitir evento para el tour
    window.dispatchEvent(new CustomEvent('organization-created', {
      detail: { organizationId: newOrg.id }
    }));
    
    loadOrganizations();
  }
};
```

### 5. Flujo Completo Esperado

#### Escenario A: Usuario sin contenido

```
1. Bienvenida
2. Menú principal
3. "Haz clic en Organizaciones" → Usuario hace clic
4. Navega a /organizations
5. "Crea tu primera organización" → Usuario hace clic en botón
6. Se abre modal de creación
7. Usuario crea organización
8. Tour se reanuda automáticamente
9. "Selecciona la organización que creaste" → Usuario hace clic
10. Navega a /organizations/{id}/projects
11. "Crea tu primer proyecto" → Usuario hace clic
12. ... (repetir para proyectos y chatbots)
```

#### Escenario B: Usuario con contenido

```
1. Bienvenida
2. Menú principal
3. "Haz clic en Organizaciones" → Usuario hace clic
4. Navega a /organizations
5. "Selecciona una organización" → Usuario hace clic en tarjeta
6. Navega a /organizations/{id}/projects
7. "Selecciona un proyecto" → Usuario hace clic en tarjeta
8. Navega a /projects/{id}/chatbots
9. "Selecciona un chatbot" → Usuario hace clic en tarjeta
10. Muestra tabs del chatbot
11. Finaliza
```

### 6. Consideraciones Importantes

1. **Navegación automática**: El tour debe seguir al usuario mientras navega
2. **Persistencia del estado**: Guardar en qué paso está el usuario
3. **Manejo de errores**: Si algo falla al crear, mostrar mensaje y permitir reintentar
4. **Cancelación**: El usuario siempre puede saltar el tour
5. **Responsive**: Funcionar en mobile y desktop

### 7. Archivos a Modificar

1. `/src/components/admin-client/onboarding/OnboardingTour.tsx`
   - Agregar lógica de pasos dinámicos
   - Implementar pausar/reanudar
   - Escuchar eventos de creación

2. `/src/app/dashboard/admin/layout.tsx`
   - Detectar contenido disponible
   - Pasar props al tour

3. `/src/components/admin-client/OrganizationList.tsx`
   - Emitir evento `organization-created`
   - Agregar `data-tour="create-organization"` al botón

4. `/src/components/admin-client/ProjectList.tsx`
   - Emitir evento `project-created`
   - Agregar `data-tour="create-project"` al botón

5. `/src/components/admin-client/ProjectChatbotsView.tsx`
   - Emitir evento `chatbot-created`
   - Agregar `data-tour="create-chatbot"` al botón

### 8. Testing

```javascript
// Resetear tour
localStorage.removeItem('minddash_onboarding_completed');

// Simular usuario sin contenido
// 1. Eliminar todas las organizaciones de prueba
// 2. Recargar /dashboard/admin
// 3. Verificar que el tour guía a crear

// Simular usuario con contenido
// 1. Crear al menos 1 org, 1 proyecto, 1 chatbot
// 2. Recargar /dashboard/admin
// 3. Verificar que el tour guía a seleccionar
```

---

**Nota:** Esta es una implementación compleja que requiere coordinación entre múltiples componentes. Se recomienda implementar por fases:
1. Fase 1: Detección de contenido
2. Fase 2: Pasos dinámicos
3. Fase 3: Pausar/reanudar
4. Fase 4: Eventos de creación
5. Fase 5: Testing completo
