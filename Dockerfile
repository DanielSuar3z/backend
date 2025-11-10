# Usa una imagen base de Node.js
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia todo el código fuente de tu aplicación backend
COPY . .

# Expone el puerto en el que tu backend Node.js escucha (ej. 3000)
EXPOSE 3000

# Comando para iniciar la aplicación Node.js
CMD ["npm", "start"]