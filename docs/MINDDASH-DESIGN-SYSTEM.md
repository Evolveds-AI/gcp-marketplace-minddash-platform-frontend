# MindDash Design System - Guía de Implementación

## Resumen

Se ha creado un design system coherente para el panel de administración basado en dos colores principales: **celeste** y **verde**, con variantes claras/oscuras para mantener armonía visual. Inspirado en shadcn/ui y dashboards modernos oscuros.

## Arquitectura

### 1. Tokens CSS (`/src/styles/minddash-tokens.css`)
Variables CSS personalizadas con prefijo `--minddash-`:
- **Celeste (Primario)**: `--minddash-celeste-50` a `--minddash-celeste-900`
- **Verde (Secundario/Éxito)**: `--minddash-verde-50` a `--minddash-verde-900`
- **Neutros**: Grises para fondos, texto y bordes
- **Fondos Dark**: `--minddash-bg`, `--minddash-surface`, `--minddash-card`
- **Estados**: Success, Warning, Error, Info con hover states

### 2. Extensión Tailwind (`tailwind.config.js`)
Clases de utilidad con prefijo `minddash`:
- `bg-minddash-celeste-500`, `text-minddash-verde-500`
- `bg-minddash-card`, `border-minddash-border`
- `text-minddash-text-primary`, `text-minddash-text-secondary`

### 3. Import Global (`/src/app/globals.css`)
Importación automática de tokens CSS para disponibilidad global.

## Principios de Uso

### Paleta oficial (Coolors)

- **Celeste (Primario / Navegación / Acción):** `#004E64` → `#00A5CF`
- **Verde (Éxito / Confirmación / Métricas positivas):** `#0D4D42` → `#25A18E` (+ acentos claros `#9FFFCB`, `#7AE582`)

Regla base: mantener el producto **en 2 colores de marca** (celeste/verde) y usar **neutros** para todo lo demás. Reservar colores “semánticos” (rojo/ámbar) para estados.

### Roles de color (reglas globales)

1. **Celeste = Identidad + navegación**
   - Sidebar activo/selección
   - CTAs principales
   - Focus ring por defecto
   - Badges informativos

2. **Verde = éxito + progreso**
   - Confirmaciones (“Guardado”, “Deploy OK”)
   - Métricas positivas / tendencias
   - Badges de estado saludable

3. **Neutros = estructura**
   - Fondos, surfaces, borders, texto secundario
   - Separadores y contenedores

4. **Estados semánticos (no marca)**
   - **Warning:** ámbar
   - **Error/Destructive:** rojo

### Gradientes (cuándo sí / cuándo no)

- **Sí usar gradiente** en:
  - Marca/identidad (brand mark, avatars fallback)
  - CTAs principales premium
  - Acentos de hover/overlay muy sutil

- **No usar gradiente** en:
  - Texto de párrafo
  - Tablas densas
  - Estados de error/warning (usar semánticos planos)

Gradientes recomendados:

- **Brand:** `from-minddash-celeste-600 to-minddash-verde-600`
- **Brand suave (overlay):** `from-minddash-celeste-500/0 to-minddash-celeste-500/10`

### Focus y accesibilidad

- Focus ring por defecto: **celeste**
  - `focus-visible:ring-2 focus-visible:ring-minddash-celeste-500/60`
  - `focus-visible:ring-offset-2` con offset acorde al fondo.

- Contraste:
  - En dark, preferir `text-minddash-celeste-300` / `text-minddash-verde-300` para acentos.
  - Evitar `text-minddash-celeste-500` sobre fondos oscuros si queda muy brillante; usar 300/400.

- Estados interactivos:
  - Hover: subir 1 step (600→700) o usar alpha (`/70`) en border.
  - Active/selected: usar fondo sutil + borde/shine, no saturar todo el componente.

### Jerarquía Visual
1. **Primario (Celeste)**: Acciones principales, navegación activa, CTA buttons
2. **Secundario (Verde)**: Estados de éxito, métricas positivas, confirmaciones
3. **Neutros**: Fondos, texto secundario, bordes, elementos no interactivos

### Reglas por Sección

#### Sidebar/Navegación
- **Activo**: `bg-minddash-celeste-600` + `text-white`
- **Hover**: `bg-minddash-celeste-700` o `bg-minddash-celeste-500/20`
- **Inactivo**: `text-minddash-text-secondary`

Recomendación:
- Iconos inactivos: `text-gray-400` (dark) / `text-gray-600` (light)
- Iconos activos: `text-minddash-celeste-300` (dark) / `text-minddash-celeste-700` (light)

#### Botones
- **Primario**: `bg-minddash-celeste-500 hover:bg-minddash-celeste-600`
- **Secundario**: `border-minddash-celeste-500 text-minddash-celeste-500`
- **Éxito**: `bg-minddash-verde-500 hover:bg-minddash-verde-600`

Variantes recomendadas:
- **Primary gradient (brand):** `bg-gradient-to-r from-minddash-celeste-600 to-minddash-verde-600 hover:from-minddash-celeste-700 hover:to-minddash-verde-700 text-white`
- **Outline celeste:** `border-minddash-celeste-500/40 text-minddash-celeste-300 hover:border-minddash-celeste-500/70`
- **Ghost:** mantener neutro y usar celeste sólo en hover/focus.

#### Tarjetas (Organizaciones/Proyectos/Chatbots)
- **Fondo**: `bg-minddash-card`
- **Borde**: `border-minddash-border`
- **Título**: `text-minddash-text-primary`
- **Descripción**: `text-minddash-text-secondary`

Estados de tarjeta:
- **Hover (brand):** `hover:border-minddash-celeste-500/70`
- **Focus:** `focus-within:ring-2 focus-within:ring-minddash-celeste-500/60`
- **Overlay sutil:** `bg-gradient-to-r from-minddash-celeste-500/0 to-minddash-celeste-500/10`

#### Avatares (UserNav)
- **Fallback**: `bg-gradient-to-br from-minddash-celeste-400 to-minddash-celeste-600`
- **Focus Ring**: `ring-2 ring-minddash-celeste-500`

Brand mark temporal (sin logo):
- Monograma recomendado: **"MD"**
- Contenedor: `rounded-full bg-gradient-to-br from-minddash-celeste-700 to-minddash-verde-600 ring-1 ring-minddash-celeste-600/30`

#### Estados y Badges
- **Éxito**: `bg-minddash-verde-100 text-minddash-verde-800`
- **Error**: `bg-red-100 text-red-800`
- **Info**: `bg-minddash-celeste-100 text-minddash-celeste-800`

Badges en dark (outline recomendado):
- **Info (outline):** `border-minddash-celeste-500/40 text-minddash-celeste-300`
- **Success (outline):** `border-minddash-verde-500/40 text-minddash-verde-300`

## Componentes Críticos a Actualizar

### 1. UserNav.tsx
- Avatar fallback: gradiente celeste en vez de azul genérico
- Focus rings: `ring-minddash-celeste-500`

### 2. Sidebar (Admin Layout)
- Items activos: celeste en vez de verde
- Hover states: celeste con transiciones suaves

### 3. Tarjetas de Contenido
- Fondo unificado: `bg-minddash-card`
- Bordes consistentes: `border-minddash-border`

### 4. Shine Border
- `shineColor` por defecto: array de celeste/verde suaves

## Implementación Próxima

1. **Actualizar UserNav**: Avatar fallback y focus rings
2. **Sidebar**: Reemplazar verde por celeste en navegación
3. **Tarjetas**: Unificar fondos y bordes
4. **ShineBorder**: Configurar colores por defecto
5. **Botones**: Aplicar variantes coherentes

## Beneficios

- **Coherencia**: Paleta unificada en todo el panel
- **Escalabilidad**: Tokens CSS fáciles de mantener
- **Accesibilidad**: Contraste adecuado en tema oscuro
- **Flexibilidad**: Variantes claras/oscuras para cualquier contexto
- **Integración**: Compatible con shadcn/ui existente

## Referencias

- Inspirado en dashboards oscuros modernos (LumenTrade, etc.)
- Basado en principios de shadcn/ui y design systems atómicos
- Paleta reducida para evitar fragmentación visual
