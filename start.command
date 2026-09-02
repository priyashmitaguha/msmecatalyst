#!/usr/bin/env bash
# ============================================================
#  MSME Catalyst - one-click local preview (macOS / Linux)
#  macOS: double-click this file (start.command).
#  Linux/terminal: run  ./start.command  (or  bash start.command )
# ============================================================
cd "$(dirname "$0")" || exit 1

open_url() { (sleep 2; (open "$1" 2>/dev/null || xdg-open "$1" 2>/dev/null || true)) & }

if command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Starting the FULL site (public pages + admin + membership CRM)..."
  echo "  Public site: http://localhost:4000/"
  echo "  Admin panel: http://localhost:4000/admin"
  echo ""
  cd server || exit 1
  if [ ! -d node_modules ]; then
    echo "  First run - installing dependencies, please wait..."
    npm install
  fi
  open_url "http://localhost:4000/"
  npm start
elif command -v python3 >/dev/null 2>&1; then
  echo "  Node.js not found - starting a quick STATIC preview (pages only, no admin/CRM)..."
  echo "  Open: http://localhost:8080/"
  cd public || exit 1
  open_url "http://localhost:8080/"
  python3 -m http.server 8080
else
  echo ""
  echo "  Neither Node.js nor Python 3 was found."
  echo "  Full site + admin + CRM: install Node.js LTS from https://nodejs.org"
  echo "  Quick page preview only: install Python 3 from https://python.org"
  echo ""
  read -r -p "  Press Enter to close..."
fi
