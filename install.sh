#!/bin/bash

# POG-CODER-VIBE Installation Script
# Optimized Edition with Ternary Binary Routing

set -e  # Exit on error

echo "🎯 POG-CODER-VIBE Installation (Optimized Edition)"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check Ollama
echo ""
echo "Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}⚠️  Ollama not found.${NC}"
    echo "Install from: https://ollama.ai"
    echo ""
    read -p "Continue without Ollama? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Ollama installed${NC}"
    
    # Check for required models
    echo ""
    echo "Checking Ollama models..."
    
    MODELS=("qwen2.5-coder:14b" "phi3:14b" "nomic-embed-text")
    MISSING_MODELS=()
    
    for model in "${MODELS[@]}"; do
        if ! ollama list | grep -q "$model"; then
            MISSING_MODELS+=("$model")
        else
            echo -e "${GREEN}✅ $model${NC}"
        fi
    done
    
    if [ ${#MISSING_MODELS[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Missing models:${NC}"
        for model in "${MISSING_MODELS[@]}"; do
            echo "  - $model"
        done
        echo ""
        read -p "Pull missing models now? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            for model in "${MISSING_MODELS[@]}"; do
                echo "Pulling $model..."
                ollama pull "$model"
            done
        fi
    fi
fi

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# Run type check
echo ""
echo "Running type check..."
npm run typecheck

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Type check passed (0 errors)${NC}"
else
    echo -e "${RED}❌ Type check failed${NC}"
    exit 1
fi

# Build project
echo ""
echo "Building project..."
npm run build

# Create default config
POG_DIR="${HOME}/.pog-coder-vibe"
if [ ! -d "$POG_DIR" ]; then
    echo ""
    echo "Creating POG directory at $POG_DIR..."
    mkdir -p "$POG_DIR"
fi

# Success message
echo ""
echo "=================================================="
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "🚀 Quick Start:"
echo "  npm run dev              # Start CLI REPL"
echo "  npm test                 # Run tests"
echo "  npm run lint             # Check code quality"
echo ""
echo "📚 Documentation:"
echo "  QUICKSTART.md            # 5-minute setup guide"
echo "  README.md                # Full documentation"
echo "  EXECUTIVE_SUMMARY.md     # Optimization details"
echo ""
echo "🎯 Features:"
echo "  - Ternary binary routing (3x faster)"
echo "  - 100% type-safe (0 errors)"
echo "  - Production-ready logging"
echo "  - Circuit breaker pattern"
echo "  - Real-time VS Code integration"
echo ""
echo "💡 Next Steps:"
echo "  1. Read QUICKSTART.md"
echo "  2. Run: npm run dev"
echo "  3. Try: 'create a TypeScript interface for User'"
echo ""
echo "Happy coding! 🎮⚡"
