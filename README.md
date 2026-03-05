# Chatbot LISA - NextJS Chatbot

Un chatbot de análisis laboral construido con Next.js e integrado con API externa.

## Tecnologías principales

- Next.js 14
- TypeScript
- TailwindCSS
- React

## Estructura del Proyecto

- `/src/app`: Componentes y rutas de la aplicación
- `/src/components`: Componentes reutilizables
- `/src/lib`: Utilidades y definiciones de tipos
- `/public`: Archivos estáticos

## Configuración rápida

1. Clona este repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
   Edita `.env.local` con tus credenciales reales (ver sección de Variables de Entorno)
4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 🔐 Variables de Entorno

### Configuración de Desarrollo

Copia `.env.example` a `.env.local` y actualiza con tus valores:

```bash
# Credenciales de DB para MindsDB (SERVER-SIDE ONLY)
# ⚠️ NUNCA usar NEXT_PUBLIC_ para credenciales sensibles
DB_HOST="tu-db-host"
DB_PORT="5432"
DB_NAME="tu-database"
DB_USER="tu-usuario"
DB_PASSWORD="tu-password"

# URLs públicas (safe to expose)
NEXT_PUBLIC_BACKEND_API_URL="https://tu-backend.com"
NEXT_PUBLIC_MINDSDB_SERVER_URL="http://tu-mindsdb:47334"

# JWT Secrets
JWT_SECRET="tu-jwt-secret"
JWT_REFRESH_SECRET="tu-refresh-secret"
```

### ⚠️ Seguridad de Credenciales

**IMPORTANTE**: 
- ✅ Variables **sin** `NEXT_PUBLIC_`: Solo accesibles en el servidor (seguras para credenciales)
- ❌ Variables **con** `NEXT_PUBLIC_`: Expuestas al navegador (NUNCA para credenciales)
- ✅ `.env.local` está en `.gitignore` (no se commitea)
- ✅ Usa `.env.example` como referencia para el equipo

### Configuración de Producción

En tu plataforma de deploy (Vercel, Netlify, Cloud Run):

1. Ve a la configuración de variables de entorno
2. Añade todas las variables de `.env.example`
3. Asegúrate de NO exponer credenciales con `NEXT_PUBLIC_`

## 🚀 Ejecución con Docker

Puedes ejecutar este proyecto fácilmente usando Docker y Docker Compose. Esto asegura que todas las dependencias y versiones estén correctamente configuradas.

### Requisitos

- Docker (recomendado: versión compatible con Dockerfile syntax 1)
- Docker Compose

### Variables de entorno necesarias

- `OPENAI_API_KEY` (debe estar definido en un archivo `.env` en la raíz del proyecto para que la aplicación funcione correctamente)

### Servicios y puertos

- **python-root**: expone el puerto `8000` (API Python principal, ejecuta `api_endpoint.py` con Python 3.11)
- **js-netlify-functions**: servicio para funciones Netlify (Node.js 22.13.1), no expone puerto por defecto
- **ts-src**: expone el puerto `3000` (aplicación Next.js, Node.js 18.20.3)

### Instrucciones

```bash
# Construir y ejecutar todos los servicios
docker-compose up --build

# Solo ejecutar (si ya está construido)
docker-compose up

# Ejecutar en segundo plano
docker-compose up -d

# Parar servicios
docker-compose down
```

1. Construye y levanta los servicios con Docker Compose:
   ```bash
   docker compose up --build
   ```
2. Accede a la aplicación en [http://localhost:3000](http://localhost:3000) (Next.js) y a la API Python en [http://localhost:8000](http://localhost:8000).

### Notas específicas

- El servicio `python-root` utiliza Python 3.11 y ejecuta el archivo `api_endpoint.py`.
- El servicio `js-netlify-functions` está basado en Node.js 22.13.1 y está pensado para funciones serverless de Netlify; normalmente no expone puertos.
- El servicio `ts-src` utiliza Node.js 18.20.3 y expone el frontend Next.js en el puerto 3000.
- Todos los servicios están conectados a la red interna `app-network` definida en el archivo `docker-compose.yml`.
- Si necesitas agregar más variables de entorno, puedes hacerlo en el archivo `.env` correspondiente.

## 🗄️ Gestión de Base de Datos

### Comandos de Migración Segura
```bash
# Backup del esquema Prisma
npm run db:backup-schema

# Sincronización segura del esquema
npm run db:pull-safe

# Verificación de integridad de datos
npm run db:verify

# Ejecución de migración segura
npm run safe-migrate-execute

# Backup completo de datos
npm run create-backup
```

## Documentación adicional

- [journey.md](./journey.md): Sprints y tareas.
- [work-log.md](./work-log.md): Detalles técnicos de los cambios.
- [roadmap.md](./roadmap.md): Propósito, estado y problemas conocidos.
- [CHANGELOG.md](./CHANGELOG.md): Cambios relevantes por versión.

## Deploy a Cloud Run

```bash
gcloud run deploy chatbot-evolve-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```


## Nuevo despliegue a Cloud Run

<!-- Dev -->
gcloud builds submit --tag us-central1-docker.pkg.dev/poc-suroeste/containers/frontend-service-dev-minddash:latest .

gcloud run deploy frontend-service-dev-minddash \
  --image us-central1-docker.pkg.dev/poc-suroeste/containers/frontend-service-dev-minddash:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80 \
  --execution-environment=gen2 \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 0 \
  --set-env-vars DATABASE_URL="postgresql://postgres:ch4tb0tPLAtf0rm@34.57.198.80:5432/minddash_platform",\
MINDDASH_DB_URL="postgresql://postgres:ch4tb0tPLAtf0rm@34.57.198.80:5432/minddash_platform",\
JWT_SECRET="fallback_secret_for_development",\
JWT_REFRESH_SECRET="fallback_refresh_secret",\
NEXT_PUBLIC_BACKEND_API_URL="https://backend-service-dev-minddash-294493969622.us-central1.run.app",\
NEXTAUTH_URL="https://frontend-service-dev-minddash-294493969622.us-central1.run.app",\
NEXTAUTH_SECRET="fallback_secret_for_development",\
AGENT_SERVICE_URL="https://agent-service-bayer-v1-294493969622.us-central1.run.app/chat",\
BAYER_API_URL="https://agent-service-bayer-v1-294493969622.us-central1.run.app/chat"



<!-- Production -->
gcloud builds submit --tag us-central1-docker.pkg.dev/poc-suroeste/containers/frontend-service-prd-minddash:latest .

gcloud run deploy frontend-service-prd-minddash \
  --image us-central1-docker.pkg.dev/poc-suroeste/containers/frontend-service-prd-minddash:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80 \
  --execution-environment=gen2 \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 0 \
  --set-env-vars DATABASE_URL="postgresql://postgres:ch4tb0tPLAtf0rm@34.57.198.80:5432/minddash_platform",\
MINDDASH_DB_URL="postgresql://postgres:ch4tb0tPLAtf0rm@34.57.198.80:5432/minddash_platform",\
JWT_SECRET="fallback_secret_for_development",\
JWT_REFRESH_SECRET="fallback_refresh_secret",\
NEXT_PUBLIC_BACKEND_API_URL="https://backend-service-dev-minddash-294493969622.us-central1.run.app",\
NEXTAUTH_URL="https://frontend-service-prd-minddash-294493969622.us-central1.run.app",\
NEXTAUTH_SECRET="fallback_secret_for_development",\
AGENT_SERVICE_URL="https://agent-service-bayer-v1-294493969622.us-central1.run.app/chat",\
BAYER_API_URL="https://agent-service-bayer-v1-294493969622.us-central1.run.app/chat"