#!/bin/bash

# Cambiar directorio a la ubicacion de este archivo script
cd "$(dirname "$0")"

echo "========================================================"
echo "  RECONOCIMIENTO FACIAL - SERVIDOR LOCAL (macOS DOBLE CLIC)"
echo "========================================================"
echo

# Abrir el navegador por defecto
open http://localhost:8000

# Lanzar servidor local
if command -v python3 &>/dev/null; then
  echo "[Sistema] Iniciando servidor a través de Python 3..."
  python3 -m http.server 8000
elif command -v python &>/dev/null; then
  echo "[System] Iniciando servidor a través de Python..."
  python -m http.server 8000
elif command -v npx &>/dev/null; then
  echo "[System] Iniciando servidor a través de Node/npx..."
  npx serve -l 8000 .
else
  echo
  echo "========================================================"
  echo "ERROR: No se encontró Python ni Node/npx en su sistema."
  echo "Instale Python o Node.js para ejecutar el servidor local."
  echo "Alternativamente, puede abrir index.html directamente en el navegador."
  echo "========================================================"
  echo
  read -p "Presione enter para salir..."
fi
