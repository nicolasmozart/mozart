# apps/backend/Dockerfile
FROM node:20-alpine

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Instala dependencias (mejor caché)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia el código
COPY . .

# Configuración de ejecución
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Arranque
CMD ["npm", "start"]
