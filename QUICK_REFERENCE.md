# 🎯 POG-CODER-VIBE - Quick Reference

## System Status: Production Ready ✅

### Core Features (100% Complete)
- **Full-Project Omniscience**: 1M+ token context awareness
- **Interactive Project Preview**: Live <iframe> synchronization
- **Ternary Binary Router**: O(log₃ n) performance with tiered fallbacks
- **Gemini SDK v1.36+**: Native function calling (Stable 2.0)
- **VectorDB**: SQLite with schema migrations and RAG injection
- **Elite Pathing**: Purpose-driven semantic routing (Clinical, Art, Marketing)
- **Zero technical debt**: 0 npm vulnerabilities, 0 TypeScript errors

---

## Quick Commands

```bash
# Development
npm run dev            # Start CLI with auto-reload
npm run typecheck      # Verify types (should show 0 errors)
npm run lint           # Check code quality
npm test               # Run test suite

# Production
npm run build          # Build production bundle
node dist/cli.js       # Run production build

# VS Code Extension
cd vscode-extension && npm run compile
```

---

## Environment Setup

```bash
# Required
npm install

# Optional (but recommended for cloud features)
echo "GOOGLE_API_KEY=your-key" > .env

# Optional (for local models)
ollama pull qwen2.5-coder:7b
ollama pull yi-coder:9b

# Specialized APIs (Requires SDK)
gcloud auth login
gcloud auth application-default login
```

---

## Configuration

**Environment Variables:**
- `GOOGLE_API_KEY` - Gemini API key (optional)
- `VIBE_WS_PORT` - WebSocket port (default: 8765)
- `VIBE_LOG_LEVEL` - Logging level (default: info)
- `POG_DIR` - Data directory (default: ~/.pog_coder_vibe)

**Config File** (`~/.pog_coder_vibe/config.json`):
```json
{
  "wsPort": 8765,
  "circuitBreakerThreshold": 3,
  "logLevel": "info"
}
```

---

## Project Structure

```
src/
├── core/           # Brain (Orchestrator, Router, Gemini)
├── limbs/          # Specialized agents (WebAppForge, etc.)
│   └── experimental/  # Ghost Limbs (Quantum, Relic, Omega)
├── learning/       # VectorDB, CodebaseIndexer
├── sandbox/        # Secure command execution
├── watcher/        # AST file monitoring
├── context/        # RAG context builder
└── utils/          # Config, KeyVault

cli/                # Terminal interface
tests/              # Test suite
vscode-extension/   # VS Code dashboard
rsc-data/           # 14 authentic JAG/MEM archives + config
```


---

## Key Documentation

- [README.md](./README.md) - Full system overview
- [QUICKSTART.md](./QUICKSTART.md) - Detailed setup guide
- [TERNARY_TREE_GUIDE.md](./TERNARY_TREE_GUIDE.md) - Routing algorithm
- [PROJECT_RULES.md](./PROJECT_RULES.md) - NO MOCKS policy
- [deployment_topology.md](./.gemini/antigravity/brain/*/deployment_topology.md) - Architecture diagram
- [security_review.md](./.gemini/antigravity/brain/*/security_review.md) - Security audit

---

## Phase 3 Status

| Feature | Status |
|---------|--------|
| Gemini 2.0 Stable | ✅ Complete |
| Full-Project Omniscience | ✅ Complete |
| Interactive Previews | ✅ Complete |
| VS Code Extension | ✅ Complete |
| TSC Tight | ✅ 0 errors |
| **Live AI Engine** | ✅ **Phase 13 Complete** |
| User Guide | ✅ Created |
