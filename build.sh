#!/bin/bash

# Nombre de la imagen
IMAGE_NAME="cryptomoneytor"

# Construir la imagen Docker
echo "Construyendo la imagen Docker: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

if [ $? -eq 0 ]; then
    echo "Imagen $IMAGE_NAME construida exitosamente."
else
    echo "Error al construir la imagen $IMAGE_NAME."
    exit 1
fi
