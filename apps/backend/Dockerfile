# Etapa 1: build
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./
COPY .npmrc ./   # 👈 asegura que npm use tu config
RUN npm ci

# Copiar el resto del código y compilar TypeScript
COPY . .
RUN npm run build

# Etapa 2: runtime
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Instalar solo dependencias de producción
COPY package.json package-lock.json ./
COPY .npmrc ./   # 👈 también aquí
RUN npm ci --only=production

# Copiar el build de la etapa anterior
COPY --from=build /app/dist ./dist

# Crear directorio de logs
RUN mkdir -p /app/logs

EXPOSE 4000
CMD ["node", "dist/index.js"]
