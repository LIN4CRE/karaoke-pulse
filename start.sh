#!/usr/bin/env bash
set -e

echo "==================================================================="
echo "    🎤 KARAOKEPULSE — YouTube Karaoke Studio"
echo "==================================================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js (v18+)."
    exit 1
fi

# Check if dependencies installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Open browser if possible
if command -v xdg-open &> /dev/null; then
    (sleep 1 && xdg-open "http://localhost:3000") &
elif command -v open &> /dev/null; then
    (sleep 1 && open "http://localhost:3000") &
fi

echo "🚀 Starting KaraokePulse Server on port 3000..."
npm start
