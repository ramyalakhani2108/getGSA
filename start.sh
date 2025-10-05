#!/bin/bash

# GetGSA Project Start Script
# This script starts all services required for the GetGSA project

echo "🚀 Starting GetGSA project services..."

# Check if Ollama is installed and running
echo "Checking Ollama service..."
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install Ollama first:"
    echo "   curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

# Start Ollama service if not running
if ! pgrep -f "ollama serve" > /dev/null; then
    echo "Starting Ollama service..."
    nohup ollama serve > /dev/null 2>&1 &
    sleep 2
    echo "✅ Ollama started"
else
    echo "ℹ️  Ollama is already running"
fi

# Check if required Ollama model is available
echo "Checking for required Ollama model (llama3.2)..."
if ! ollama list | grep -q "llama3.2"; then
    echo "Pulling llama3.2 model..."
    ollama pull llama3.2
    echo "✅ llama3.2 model downloaded"
else
    echo "ℹ️  llama3.2 model is already available"
fi

# Start TailwindCSS watch process
echo "Starting TailwindCSS watch process..."
nohup npx tailwindcss -i ./public/tailwind.css -o ./public/output.css --watch > /dev/null 2>&1 &
echo "✅ TailwindCSS watch started"

# Start the development server
echo "Starting GetGSA development server..."
echo "Server will be available at http://localhost:3000"
echo ""
echo "To stop all services, run:"
echo "  ./stop.sh"
echo "  # or"
echo "  npm run stop"
echo ""

npm run dev