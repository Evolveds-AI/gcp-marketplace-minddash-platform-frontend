# -------------------------------
# 🛠 Etapa 1: Build (compilar + generar Prisma)
# -------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Instalamos librerías necesarias (Prisma necesita OpenSSL)
RUN apt-get update && apt-get install -y openssl libssl3

# Copiamos dependencias primero (para cache eficiente)
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos esquema de Prisma y generamos Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copiamos el resto del código del proyecto
COPY . .

# Build de la app Next.js
RUN npm run build

# -------------------------------
# 🚀 Etapa 2: Runner (Producción)
# -------------------------------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Prisma también necesita OpenSSL en RUNNER
RUN apt-get update && apt-get install -y openssl libssl3

# Copiamos solo lo necesario desde la etapa builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Exponemos el puerto estándar de Next.js
EXPOSE 3000

# Comando de arranque
CMD ["npm", "start"]
