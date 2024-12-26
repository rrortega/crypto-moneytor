# Etapa 1: Build
FROM node:20.18.1-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Instala TODO (producción + dev) para poder compilar
RUN npm install
COPY . ./
RUN npm run build

# Etapa 2: Runtime
FROM node:20.18.1-alpine

WORKDIR /app
# Copiamos solamente la carpeta dist (ya compilada) y los package*.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Instala solo dependencias de producción
RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "dist/app/index.js"]
