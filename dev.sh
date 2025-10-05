#!/bin/bash

# GetGSA Development Runner
# This script ensures Node.js v20 is used for maximum compatibility

# Set Node v20 path
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 GetGSA Development Server${NC}"
echo "Using Node.js $(node --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Warning: Ollama doesn't appear to be running"
    echo "Start it with: ollama serve"
    echo ""
fi

# Start the development server
echo -e "${GREEN}Starting development server...${NC}"
npm run dev
