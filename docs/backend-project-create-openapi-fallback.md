# Creación de Proyectos (Wizard) — Alineación con OpenAPI + Fallback

## Contexto
En el wizard de creación de chatbots (Step 2: Proyecto), hoy el frontend crea proyectos usando:

- `POST /api/backend/projects/create` (Next.js)
- Implementación actual: **crea el proyecto directo en Prisma** (bypass del backend Python)

Esto funciona y persiste datos reales, pero **no está 100% alineado** con el contrato documentado en `openapi-fragments/paths/projects.json`, que define:

- `POST /projects/sendRegistroProject`

## Objetivo
Tener una creación de proyecto **alineada al OpenAPI** (vía backend Python) sin romper el flujo actual.

## Propuesta (recomendada)
1) **Primero intentar el endpoint OpenAPI** (backend Python):
   - `POST /projects/sendRegistroProject`

2) **Si el backend Python responde error / endpoint no está disponible**, usar un **fallback** temporal:
   - crear el proyecto en Prisma desde Next.js (el flujo actual)

Esto nos permite:
- Cumplir con OpenAPI cuando esté listo.
- No bloquear el onboarding si el backend todavía no tiene el endpoint operativo.

## Qué debe implementar Backend
### Endpoint
- **Método**: `POST`
- **Path**: `/projects/sendRegistroProject`
- **Contrato**: según `openapi-fragments/paths/projects.json`
  - requestBody: `ProjectRegisterRequest`
  - response: `ProjectCreationResponse`

### Comportamiento esperado
- Crear un proyecto asociado a una organización (`organization_id`).
- Devolver el identificador del proyecto creado (ej. `project_id`).
- Validar duplicados (idealmente nombre único por organización o por cliente, según regla del negocio).

## Comportamiento esperado del Frontend (Next.js)
- Llamar a `/projects/sendRegistroProject` (vía `backendClient`).
- Si falla por un error de conectividad/500/404 (endpoint no disponible), usar fallback:
  - `POST /api/backend/projects/create` (Prisma)

## Nota sobre seguridad
- La llamada desde Next.js al backend Python se hace autenticada con el `Bearer` token actual.
- El backend debe validar el token/rol según su política.

## Pendientes de QA (frontend)
Estos puntos están pendientes de validación manual en el wizard (todavía no se probaron):

- Verificar visualmente Step 2 y edge-cases:
  - Organización vacía
  - Cambio de organización con proyecto previamente seleccionado
  - Estados intermedios al crear org/proyecto inline

## Próximos pasos
- Backend implementa `/projects/sendRegistroProject`.
- Frontend ajusta `POST /api/backend/projects/create` para:
  - intentar Python primero
  - fallback a Prisma si falla
