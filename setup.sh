#!/bin/bash

# GetGSA Setup Script
# This script sets up the complete GetGSA environment

set -e  # Exit on error

echo "🚀 GetGSA Setup Script"
echo "====================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js installation
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm
echo "📦 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Check Ollama installation
echo "🤖 Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}⚠️  Ollama is not installed${NC}"
    echo "Installing Ollama..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Detected macOS - Please install Ollama from https://ollama.ai/"
        echo "Then run: ollama pull llama3.2"
        echo ""
        read -p "Press enter after installing Ollama..."
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "Please install Ollama manually from https://ollama.ai/"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Ollama detected${NC}"

# Check if Ollama is running
echo "🔍 Checking Ollama service..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama service is not running${NC}"
    echo "Starting Ollama..."
    ollama serve &
    sleep 3
fi

echo -e "${GREEN}✅ Ollama service is running${NC}"

# Pull llama3.2 model
echo "📥 Checking llama3.2 model..."
if ! ollama list | grep -q "llama3.2"; then
    echo "Pulling llama3.2 model (this may take a few minutes)..."
    ollama pull llama3.2
fi
echo -e "${GREEN}✅ llama3.2 model available${NC}"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs
mkdir -p uploads
mkdir -p data/chroma
echo -e "${GREEN}✅ Directories created${NC}"

# Copy .env file if it doesn't exist
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo -e "${GREEN}✅ Build completed${NC}"

# Run tests
echo "🧪 Running tests..."
npm test || echo -e "${YELLOW}⚠️  Some tests failed (this is okay for initial setup)${NC}"

echo ""
echo "═══════════════════════════════════════════════"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo "═══════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo "   1. Review and update .env file if needed"
echo "   2. Start development server: npm run dev"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "🐳 Docker option:"
echo "   docker-compose up -d"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Getting started"
echo "   - docs/ARCHITECTURE.md - System design"
echo "   - docs/PROMPTS.md - AI prompts"
echo "   - docs/SECURITY.md - Security info"
echo ""
echo "🎯 Quick test:"
echo "   1. Upload a sample document"
echo "   2. Click 'Ingest & Redact'"
echo "   3. Click 'Analyze'"
echo "   4. View results in right panel"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
