#!/bin/bash

echo "========================================================"
echo "  CCTV ALGORITHMIC GAZE - LOCAL SERVER BOOTSTRAP (UNIX)"
echo "========================================================"
echo

# Try opening the web browser automatically
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:8000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  if command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:8000
  fi
fi

# Try launching the local server
if command -v python3 &>/dev/null; then
  echo "[System] Starting server via Python 3..."
  python3 -m http.server 8000
elif command -v python &>/dev/null; then
  echo "[System] Starting server via Python..."
  python -m http.server 8000
elif command -v npx &>/dev/null; then
  echo "[System] Starting server via Node/npx..."
  npx serve -l 8000 .
else
  echo
  echo "========================================================"
  echo "ERROR: Neither Python nor Node/npx was found on your system."
  echo "Please install Python or Node.js to run the local server."
  echo "Alternatively, you can open index.html directly in a browser."
  echo "========================================================"
  echo
fi
