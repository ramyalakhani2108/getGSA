#!/bin/bash

# GetGSA Project Stop Script
# This script stops all services related to the GetGSA project

echo "🛑 Stopping GetGSA project services..."

# Stop TailwindCSS watch process
echo "Stopping TailwindCSS processes..."
pkill -f tailwindcss 2>/dev/null && echo "✅ TailwindCSS stopped" || echo "ℹ️  No TailwindCSS processes found"

# Stop Node.js/TypeScript server processes
echo "Stopping Node.js/TypeScript server processes..."
pkill -f ts-node 2>/dev/null && echo "✅ ts-node processes stopped" || echo "ℹ️  No ts-node processes found"
pkill -f nodemon 2>/dev/null && echo "✅ nodemon processes stopped" || echo "ℹ️  No nodemon processes found"

# Stop Ollama service (AI model for document analysis)
echo "Stopping Ollama AI service..."
pkill -f ollama 2>/dev/null && echo "✅ Ollama stopped" || echo "ℹ️  No Ollama processes found"

# Stop any remaining Node.js processes on port 3000
echo "Checking for processes on port 3000..."
PORT_PROCESS=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_PROCESS" ]; then
    echo "Found process $PORT_PROCESS on port 3000, terminating..."
    kill -9 $PORT_PROCESS 2>/dev/null && echo "✅ Port 3000 process stopped" || echo "ℹ️  Could not stop port 3000 process"
else
    echo "ℹ️  No processes found on port 3000"
fi

# Stop any processes using the database file (SQLite is file-based, but locks might exist)
echo "Checking for database file locks..."
DB_FILE="./data/database.db"
if [ -f "$DB_FILE" ]; then
    DB_PROCESSES=$(lsof "$DB_FILE" 2>/dev/null | grep -v PID | awk '{print $2}' | uniq)
    if [ ! -z "$DB_PROCESSES" ]; then
        echo "Found processes accessing database file:"
        for pid in $DB_PROCESSES; do
            ps -p $pid -o pid,ppid,cmd 2>/dev/null | tail -n +2
        done
        echo "Terminating database file access processes..."
        kill -9 $DB_PROCESSES 2>/dev/null && echo "✅ Database processes stopped" || echo "ℹ️  Could not stop all database processes"
    else
        echo "ℹ️  No processes accessing database file"
    fi
fi

echo "🎉 All GetGSA services have been stopped!"
echo ""
echo "Services stopped:"
echo "  - Node.js/TypeScript server (ts-node)"
echo "  - TailwindCSS watch process"
echo "  - Ollama AI service (for document analysis)"
echo "  - Any processes on port 3000"
echo "  - Database file access processes (SQLite)"
echo ""
echo "To start the project again, run:"
echo "  npm run dev"
echo "  # And in another terminal:"
echo "  npx tailwindcss -i ./public/tailwind.css -o ./public/output.css --watch"
echo "  # And ensure Ollama is running:"
echo "  ollama serve"