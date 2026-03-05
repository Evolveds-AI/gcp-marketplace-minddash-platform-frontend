# 🎯 Onboarding Tour - Guía de Implementación

## Descripción General

El tour de onboarding es una experiencia interactiva que guía a los usuarios nuevos a través de las funcionalidades principales del panel de administración. Se ejecuta automáticamente en el primer ingreso y puede ser relanzado desde el menú de ayuda.

## Tecnologías Utilizadas

- **react-joyride**: Librería para tours guiados con spotlight y overlays
- **framer-motion**: Animaciones suaves en tooltips y transiciones
- **shadcn/ui**: Componentes base (Button, Dialog) para mantener consistencia visual
- **localStorage**: Persistencia del estado de completado

## Arquitectura

### Componentes

```
src/
├── components/admin-client/onboarding/
│   └── OnboardingTour.tsx          # Componente principal del tour
├── hooks/
│   └── useOnboardingStatus.ts      # Hook para gestionar estado
└── app/dashboard/admin/
    └── layout.tsx                   # Integración del tour
```

### Hook: `useOnboardingStatus`

**Ubicación:** `/src/hooks/useOnboardingStatus.ts`

**Funcionalidad:**
- Lee/escribe el flag `minddash_onboarding_completed` en localStorage
- Expone métodos para marcar como completado o resetear
- Preparado para sincronización con backend (TODO)

**API:**
```typescript
const { hasCompleted, markCompleted, resetOnboarding } = useOnboardingStatus();
```

### Componente: `OnboardingTour`

**Ubicación:** `/src/components/admin-client/onboarding/OnboardingTour.tsx`

**Props:**
```typescript
interface OnboardingTourProps {
  run: boolean;           // Controla si el tour está activo
  onComplete: () => void; // Callback al completar
  onSkip: () => void;     // Callback al saltar
}
```

**Características:**
- Overlay oscuro con blur (70% opacidad)
- Tooltips personalizados con animaciones
- Indicador de progreso (dots + contador)
- Botones "Anterior", "Siguiente", "Saltar", "Finalizar"
- Estilos coherentes con el tema oscuro de la plataforma
- Soporte para cerrar con tecla `Esc`

## Pasos del Tour

### 1. Bienvenida (Centro)
- Mensaje de bienvenida
- Explicación breve del tour
- Opción de saltar visible

### 2. Navegación Principal (Sidebar)
- Selector: `[data-tour="navigation"]`
- Explica cómo navegar entre organizaciones/proyectos/chatbots

### 3. Tabs de Secciones
- Selector: `[data-tour="chatbot-tabs"]`
- Muestra las diferentes secciones disponibles

### 4. Gestión de Permisos
- Selector: `[data-tour="permissions-tab"]`
- Explica control de acceso de usuarios

### 5. Data Access
- Selector: `[data-tour="data-access-tab"]`
- Introduce RLS/CLS y permisos granulares

### 6. Botón Crear
- Selector: `[data-tour="create-button"]`
- Explica cómo crear nuevos elementos

### 7. Finalización (Centro)
- Mensaje de cierre
- Recordatorio de cómo relanzar el tour

## Integración en el Layout

**Archivo:** `/src/app/dashboard/admin/layout.tsx`

El tour se integra en el layout principal del dashboard:

```typescript
// 1. Importar hook y componente
import OnboardingTour from '@/components/admin-client/onboarding/OnboardingTour';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// 2. Usar el hook
const { hasCompleted, markCompleted, resetOnboarding } = useOnboardingStatus();
const [runTour, setRunTour] = useState(false);

// 3. Lanzar tour en primer ingreso
useEffect(() => {
  if (!hasCompleted && pathname === '/dashboard/admin') {
    setTimeout(() => setRunTour(true), 1000);
  }
}, [hasCompleted, pathname]);

// 4. Renderizar componente
<OnboardingTour
  run={runTour}
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

## Cómo Agregar Nuevos Pasos

### 1. Agregar atributo `data-tour` al elemento

En el componente que quieres destacar:

```tsx
<div data-tour="mi-nuevo-elemento">
  {/* Contenido */}
</div>
```

### 2. Agregar paso en el array `steps`

En `/src/components/admin-client/onboarding/OnboardingTour.tsx`:

```typescript
const steps: Step[] = [
  // ... pasos existentes
  {
    target: '[data-tour="mi-nuevo-elemento"]',
    content: 'Descripción de la funcionalidad',
    title: 'Título del paso',
    placement: 'bottom', // top | bottom | left | right
  },
];
```

### Opciones de placement

- `top`: Tooltip arriba del elemento
- `bottom`: Tooltip abajo del elemento
- `left`: Tooltip a la izquierda
- `right`: Tooltip a la derecha
- `center`: Tooltip centrado (sin elemento target)

## Personalización de Estilos

Los estilos están definidos en el objeto `customStyles` dentro de `OnboardingTour.tsx`:

```typescript
const customStyles = {
  options: {
    arrowColor: '#1f1f1f',        // Color de la flecha
    backgroundColor: '#1f1f1f',    // Fondo del tooltip
    overlayColor: 'rgba(0, 0, 0, 0.7)', // Overlay oscuro
    primaryColor: '#3b82f6',       // Color principal (blue-500)
    textColor: '#e5e7eb',          // Color del texto
    zIndex: 10000,                 // Z-index del tour
  },
  // ...
};
```

## Relanzar el Tour

### Desde el Menú de Ayuda

El usuario puede relanzar el tour desde el botón de ayuda en el `UserNav`:

```typescript
const handleHelpClick = () => {
  const shouldRestart = confirm('¿Deseas ver el tour de bienvenida nuevamente?');
  if (shouldRestart) {
    resetOnboarding();
    setRunTour(true);
  }
};
```

### Programáticamente

```typescript
// Resetear y relanzar
resetOnboarding();
setRunTour(true);
```

## Sincronización con Backend (TODO)

Para persistir el estado en el backend, modificar `useOnboardingStatus.ts`:

```typescript
const markCompleted = async () => {
  localStorage.setItem(ONBOARDING_KEY, 'true');
  setHasCompleted(true);
  
  // Sincronizar con backend
  try {
    await fetch('/api/user/onboarding', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: true })
    });
  } catch (error) {
    console.error('Error sincronizando onboarding:', error);
  }
};
```

## Testing

### Resetear el Tour para Testing

```javascript
// En la consola del navegador
localStorage.removeItem('minddash_onboarding_completed');
// Recargar la página
```

### Verificar Estado

```javascript
// En la consola del navegador
localStorage.getItem('minddash_onboarding_completed');
// Debería devolver 'true' si está completado, null si no
```

## Mejores Prácticas

1. **Mantener pasos concisos**: Máximo 2-3 líneas de descripción
2. **Usar títulos claros**: Que indiquen la funcionalidad
3. **Orden lógico**: Seguir el flujo natural de uso
4. **Permitir saltar**: No forzar al usuario a completar
5. **Animaciones sutiles**: No distraer del contenido
6. **Accesibilidad**: Soporte de teclado y focus trap
7. **Responsive**: Verificar en mobile y desktop

## Troubleshooting

### El tour no se inicia

- Verificar que `hasCompleted` sea `false`
- Confirmar que estás en `/dashboard/admin`
- Revisar console para errores
- Verificar que los elementos con `data-tour` existan en el DOM

### Elementos no se encuentran

- Asegurar que el selector `data-tour` sea correcto
- Verificar que el elemento esté renderizado cuando el tour inicia
- Aumentar el delay inicial si es necesario

### Estilos no se aplican

- Verificar que no haya conflictos de z-index
- Confirmar que Tailwind CSS esté compilando las clases
- Revisar que framer-motion esté instalado

## Recursos Adicionales

- [React Joyride Docs](https://docs.react-joyride.com/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Última actualización:** 3 de noviembre de 2025  
**Versión:** 1.0.0
