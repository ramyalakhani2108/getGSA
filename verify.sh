#!/bin/bash

# GetGSA Installation Verification Script
# Run this after setup to verify everything is configured correctly

# Use Node v20 for verification
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

echo "🔍 GetGSA Installation Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Check Node.js
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js $NODE_VERSION installed"
else
    check_fail "Node.js not installed"
fi

# Check npm
echo "Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm $NPM_VERSION installed"
else
    check_fail "npm not installed"
fi

# Check Ollama
echo "Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    check_pass "Ollama installed"
    
    # Check if Ollama is running
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        check_pass "Ollama service is running"
        
        # Check for llama3.2 model
        if ollama list | grep -q "llama3.2"; then
            check_pass "llama3.2 model available"
        else
            check_fail "llama3.2 model not found (run: ollama pull llama3.2)"
        fi
    else
        check_warn "Ollama service not running (run: ollama serve)"
    fi
else
    check_fail "Ollama not installed"
fi

# Check project files
echo "Checking project files..."
if [ -f "package.json" ]; then
    check_pass "package.json exists"
else
    check_fail "package.json missing"
fi

if [ -f "tsconfig.json" ]; then
    check_pass "tsconfig.json exists"
else
    check_fail "tsconfig.json missing"
fi

if [ -f ".env" ]; then
    check_pass ".env file exists"
else
    check_warn ".env file missing (copy from .env.example)"
fi

# Check directories
echo "Checking directories..."
for dir in src public docs; do
    if [ -d "$dir" ]; then
        check_pass "$dir/ directory exists"
    else
        check_fail "$dir/ directory missing"
    fi
done

# Check node_modules
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules/ exists"
    
    # Check key dependencies
    for pkg in express typescript jest; do
        if [ -d "node_modules/$pkg" ]; then
            check_pass "$pkg installed"
        else
            check_fail "$pkg not installed"
        fi
    done
else
    check_fail "node_modules/ missing (run: npm install)"
fi

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
if [ -d "dist" ]; then
    check_pass "dist/ directory exists (TypeScript compiled)"
else
    check_warn "dist/ missing (run: npm run build)"
fi

# Check runtime directories
echo "Checking runtime directories..."
if [ -d "data" ]; then
    check_pass "data/ directory exists"
else
    check_warn "data/ directory missing (will be created on first run)"
fi

if [ -d "logs" ]; then
    check_pass "logs/ directory exists"
else
    check_warn "logs/ directory missing (will be created on first run)"
fi

# Check documentation
echo "Checking documentation..."
for doc in README.md PROJECT_GUIDE.md ARCHITECTURE.md; do
    if [ -f "$doc" ] || [ -f "docs/$doc" ]; then
        check_pass "$doc exists"
    else
        check_warn "$doc missing"
    fi
done

# Port check
echo "Checking port availability..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warn "Port 3000 is in use"
else
    check_pass "Port 3000 is available"
fi

if lsof -Pi :11434 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_pass "Port 11434 is in use (Ollama running)"
else
    check_warn "Port 11434 not in use (Ollama may not be running)"
fi

# Test npm scripts
echo "Checking npm scripts..."
if grep -q '"dev"' package.json; then
    check_pass "npm run dev script configured"
else
    check_fail "npm run dev script missing"
fi

if grep -q '"test"' package.json; then
    check_pass "npm test script configured"
else
    check_fail "npm test script missing"
fi

if grep -q '"build"' package.json; then
    check_pass "npm run build script configured"
else
    check_fail "npm run build script missing"
fi

# Summary
echo ""
echo "===================================="
echo "Verification Summary"
echo "===================================="
echo -e "${GREEN}Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL${NC}"
fi
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Installation verified successfully!${NC}"
    echo ""
    echo "🚀 Ready to start development:"
    echo "   npm run dev"
    echo ""
    echo "🧪 Run tests:"
    echo "   npm test"
    echo ""
    echo "📖 Read documentation:"
    echo "   cat README.md"
    echo "   cat PROJECT_GUIDE.md"
    echo ""
    echo "🌐 Access application:"
    echo "   http://localhost:3000"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Installation incomplete${NC}"
    echo ""
    echo "Please fix the failed items above, then run:"
    echo "   ./verify.sh"
    echo ""
    echo "For help, see:"
    echo "   README.md"
    echo "   PROJECT_GUIDE.md"
    echo ""
    exit 1
fi
