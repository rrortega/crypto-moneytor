#!/bin/bash
set -e

# Nombre de la imagen (por defecto) si no pasas argumento
IMAGE_NAME=${1:-"rrortega/cryptomoneytor"}

echo "Construyendo la imagen Docker con la etiqueta latest: $IMAGE_NAME:latest"
docker build -t "$IMAGE_NAME:latest" .

echo "Imagen $IMAGE_NAME:latest construida exitosamente."