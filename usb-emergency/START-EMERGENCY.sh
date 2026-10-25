#!/bin/bash
cd "$(dirname "$0")"
export HOST=127.0.0.1
export PORT=8898

echo ""
echo "CARE Ultra-Emergency Billing (USB)"
echo "Use ONLY if CARE and DS225+ are both down."
echo ""

if [ -f "./runtime/node" ]; then
  open "http://127.0.0.1:8898/" 2>/dev/null || xdg-open "http://127.0.0.1:8898/" 2>/dev/null &
  ./runtime/node ./app/server.mjs
elif command -v node &> /dev/null; then
  open "http://127.0.0.1:8898/" 2>/dev/null || xdg-open "http://127.0.0.1:8898/" 2>/dev/null &
  node ./app/server.mjs
else
  echo "Node.js was not found on this PC, and runtime/node is missing."
  echo "Copy this folder from a PC that ran npm run build, or install Node 22."
  exit 1
fi

echo ""
echo "Stopped. Export CSV is also saved in the export folder on this stick."
