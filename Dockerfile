# Usa una imagen base de Node.js
FROM node:16-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /

# Copia los archivos necesarios para instalar dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto del proyecto
COPY . ./

# Expone el puerto configurado
EXPOSE 3000

# Comando para iniciar la aplicación (no es necesario incluir /app/)
CMD ["node", "app/index.js"]
