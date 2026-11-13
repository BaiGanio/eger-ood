#!/bin/bash

# Move to the folder where this script lives — always
cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       ЕГЕР ООД — SMS Сервиз          ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Check that server.js is in the same folder ──────────────────────
if [ ! -f "server.js" ]; then
  echo "  [ГРЕШКА] Не намирам server.js в тази папка."
  echo ""
  echo "  Уверете се, че start.sh е в същата папка като server.js"
  echo "  и всички останали файлове на проекта."
  echo ""
  read -p "  Натиснете Enter за да затворите..."
  exit 1
fi

# ── Check that node_modules exists ──────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "  Първо стартиране — инсталиране на зависимости..."
  echo ""

  if ! command -v npm &> /dev/null; then
    echo "  [ГРЕШКА] Node.js не е инсталиран."
    echo ""
    echo "  Изтеглете го от: https://nodejs.org"
    echo "  Изберете версията 'LTS', инсталирайте я и стартирайте отново."
    echo ""
    read -p "  Натиснете Enter за да затворите..."
    exit 1
  fi

  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "  [ГРЕШКА] npm install се провали."
    read -p "  Натиснете Enter за да затворите..."
    exit 1
  fi
  echo ""
fi

# ── Start server ─────────────────────────────────────────────────────
echo "  Сървърът стартира..."
echo "  За да спрете — затворете този прозорец."
echo ""

node server.js

echo ""
echo "  Сървърът е спрян."
read -p "  Натиснете Enter за да затворите..."
