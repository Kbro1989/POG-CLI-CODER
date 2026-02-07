# 🗺️ Codebase Map: POG-CODER-VIBE

**Complete architectural guide to the production-ready AI coding assistant.**

---

## 🏗️ System Architecture

POG-CODER-VIBE is a **Hybrid Local-Cloud Agent** with cognitive control plane capabilities.

**Three-Layer Design:**
1. **Local Execution** (Ollama) - Default, privacy-first
2. **Cloud Intelligence** (Gemini) - Fallback for high-context/storage-critical scenarios
3. **Cognitive Layer** (Gemini SDK) - Function calling for planning, memory, and assistance

---

## 📂 Source Code Organization

### Core Brain (`/src/core`)

| File | Purpose | Status |
|------|---------|--------|
| **[Orchestrator.ts](./src/core/Orchestrator.ts)** | Main execution engine with Omniscience planning loop | ✅ Production Ready (Phase 10) |
| **[Router.ts](./src/core/Router.ts)** | Ternary decision tree with tiered legacy fallbacks | ✅ Production Ready (Phase 10) |
| **[GeminiService.ts](./src/core/GeminiService.ts)** | Native SDK client with stable Gemini 2.0 integration | ✅ Phase 4 Complete |
| **[PreviewServer.ts](./src/core/PreviewServer.ts)** | Live dev-server manager for generated projects | ✅ Interactive |
| **[SystemPrompts.ts](./src/core/SystemPrompts.ts)** | Immutable agent rules (NO MOCKS/NO PLACEHOLDERS) | ✅ Enforced |
| **[models.ts](./src/core/models.ts)** | Centralized type definitions (TSC Tight) | ✅ 0 Errors |
| **[StaticModelRegistry.ts](./src/api/ai/StaticModelRegistry.ts)** | Baked-in 283-model definitions (No Mockery) | ✅ Production Ready (Phase 10) |
| **[IntentMap.ts](./api/ai/IntentMap.ts)** | Semantic routing for specialized intents | ✅ Production Ready (Phase 10) |
| **[CapabilityRegistry.ts](./src/api/ai/CapabilityRegistry.ts)** | Model capability types & metadata | ✅ Verified |

---

### Learning & Memory (`/src/learning`, `/src/context`)

| File | Purpose | Status |
|------|---------|--------|
| **[VectorDB.ts](./src/learning/VectorDB.ts)** | SQLite-backed vector store with schema migrations | ✅ Stable |
| **[CodebaseIndexer.ts](./src/learning/CodebaseIndexer.ts)** | Proactive background indexing triggered by file changes | ✅ Event-Driven |
| **[ContextBuilder.ts](./src/context/ContextBuilder.ts)** | Recursive content injection for 1M token context | ✅ Omniscience Ready |

---

### Execution & Safety (`/src/sandbox`, `/src/watcher`, `/src/diff`)

| File | Purpose | Status |
|------|---------|--------|
| **[Sandbox.ts](./src/sandbox/Sandbox.ts)** | Snapshot-based command execution with rollback | ✅ Git-Backed |
| **[ASTWatcher.ts](./src/watcher/ASTWatcher.ts)** | File change monitoring with MD5 content hashing | ✅ Real-Time |
| **[DiffPresenter.ts](./src/diff/DiffPresenter.ts)** | Code change formatting for review | ✅ User-Friendly |

---

### Specialized Agents (`/src/limbs`)

| File | Purpose | Status |
|------|---------|--------|
| **[BaseLimb.ts](./src/limbs/core/BaseLimb.ts)** | Abstract foundation with ToolingSpine integration | ✅ Foundation |
| **[NeuralLimb.ts](./src/limbs/core/NeuralLimb.ts)** | Interface contract for agent extensions | ✅ Abstract Pattern |
| **[DashboardLimb.ts](./src/limbs/core/DashboardLimb.ts)** | Session-specific QOL Control Plane (HTML UI) | ✅ Interactive |
| **[FileSystemLimb.ts](./src/limbs/core/FileSystemLimb.ts)** | Atomic file operations (read/write/patch/rollback) | ✅ Sandboxed |
| **[NeuralForgeLimb.ts](./src/limbs/core/NeuralForgeLimb.ts)** | Specialized high-tier creation (SQL, Docs, Refactor) | ✅ Adversarial |
| **[VoiceLimb.ts](./src/limbs/core/VoiceLimb.ts)** | Audio & Speech Intelligence (Whisper, TTS, Wake Word) | ✅ Voice Chat |
| **[YoloLimb.ts](./src/limbs/core/YoloLimb.ts)** | High-Risk Reasoning & Unrestricted Creation | ✅ Gemini CLI |
| **[HexagramLimb.ts](./src/limbs/core/HexagramLimb.ts)** | Intent-aware context hexagram management | ✅ Context-Tight |
| **[WebAppForgeLimb.ts](./src/limbs/webapp/WebAppForgeLimb.ts)** | Full-stack project scaffolding (Vite, Next.js, Fastify) | ✅ Template-Driven |
| **[MediaForgeLimb.ts](./src/limbs/media/MediaForgeLimb.ts)** | Creative generation (Imagen 4, Veo 3, Lyria 2) | ✅ Esoteric Substrates |
| **[BioIntelligenceLimb.ts](./src/limbs/bio/BioIntelligenceLimb.ts)** | Bio-medical analysis (MedGemma, HEAR, Pathology) | ✅ Clinical Precision |
| **[GutenbergLimb.ts](./src/limbs/gutenberg/GutenbergLimb.ts)** | Literary knowledge & styled corpus ingestion | ✅ Historical Reach |
| **[CloudflareLimb.ts](./src/limbs/cloud/CloudflareLimb.ts)** | Unified Cloudflare AI (Image, Chat, Embeddings) | ✅ Production Ready |
| **[AILimb.ts](./src/api/ai/AILimb.ts)** | Registry-pathed specialized AI dispatcher | ✅ 283 Models |
| **[Dispatcher.ts](./src/api/ai/Dispatcher.ts)** | gcloud Auth bridge for Vertex AI & Google Cloud REST | ✅ Live REST fetch |


---

### Infrastructure & Utilities

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **`/src/utils`** | Configuration & key management | `config.ts`, `KeyVault.ts` |
| **`/src/git`** | Version control automation | `GitManager.ts` |
| **`/src/testing`** | Test execution & auditing | `TestRunner.ts` |

---

### User Interfaces

| Directory | Purpose | Status |
|-----------|---------|--------|
| **`/cli`** | Terminal REPL with history & snapshots | ✅ Interactive |
| **`/vscode-extension`** | VS Code dashboard via WebSocket | ✅ Phase 3 Complete |

**Extension Files:**
- `extension.ts` - Activation & WebSocket connection
- `VibeViewerProvider.ts` - WebView state dashboard
- `package.json` - Extension manifest with view definitions
- `tsconfig.json` - Extension-specific TypeScript config

---

## 🧪 Scripts & Diagnostics (`/scripts`)

| Script | Purpose |
|--------|---------|
| `check_capabilities.ts` | Audits model capabilities |
| `migrate_ollama.ps1` | Automates local model setup (Windows) |
| `test_gemini_thinking.ts` | Diagnostics for reasoning models |
| `test_model_health.ts` | Verifies all registered endpoints |
| `generateRegistry.ts` | Re-builds StaticModelRegistry from MD source |
| `test-pathing.ts` | Verified semantic intent routing (Clinical/Art/etc) |

---

## 📘 Documentation Suite

### Root-Level Docs
- **[README.md](./README.md)** - System overview & quick start
- **[PROJECT_RULES.md](./PROJECT_RULES.md)** - NO MOCKS/NO PLACEHOLDERS policy
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Complete feature summary
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Command cheat sheet
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[TERNARY_TREE_GUIDE.md](./TERNARY_TREE_GUIDE.md)** - Routing algorithm explained

### Technical Docs (`/docs`)
- **API_KEY_FAILOVER.md** - Multi-key resilience system

### Phase 3 Artifacts (`.gemini/antigravity/brain/*`)
- **deployment_topology.md** - Complete architecture with Mermaid diagrams
- **security_review.md** - Comprehensive security audit
- **functional_control_plane.md** - Gemini SDK integration details
- **task.md** - Development roadmap & completion status

---

## 📂 System State (`~/.pog_coder_vibe`)

**Auto-generated runtime directory:**

| File/Directory | Purpose |
|----------------|---------|
| `/snapshots` | Filesystem backups for rollback |
| `vibe-learning.db` | SQLite VectorDB (RAG lessons & embeddings) |
| `free-model-performance.json` | Historical latency & success metrics |
| `keys.db` | Encrypted API key storage (KeyVault) |
| `config.json` | Runtime configuration overrides |

---

## 🔄 Data Flow

```
User Intent
    ↓
CLI / VS Code Extension
    ↓
Orchestrator (Research → Plan → Execute → Review)
    ├─→ Router (Ternary Decision)
    │       ├─→ Ollama (Local-First)
    │       └─→ Gemini (Cloud Fallback)
    ├─→ Limbs (Specialized Skills)
    │       ├─→ WebAppForge (Scaffolding)
    │       ├─→ MediaForge (Imagery/Video/Audio)
    │       ├─→ BioIntelligence (Clinical/Bio)
    │       ├─→ Gutenberg (Literature/Styles)
    │       ├─→ Cloudflare (Image/Chat/Embed)
    │       └─→ Hexagram (Dynamic Context)
    ├─→ ContextBuilder (Query VectorDB)
    ├─→ Sandbox (Execute with Snapshot)
    └─→ ASTWatcher (Monitor Changes)
            ↓
    CodebaseIndexer (Update VectorDB)
```

---

## 🎯 Phase 3 Status

| Component | Status |
|-----------|--------|
| Gemini SDK v1.36+ | ✅ Integrated |
| Function Calling | ✅ Active |
| Deployment Topology | ✅ Documented |
| Security Review | ✅ Complete |
| VS Code Extension | ✅ Configured |
| TSC Tight | ✅ 0 Errors |
| Audit Clean | ✅ 0 Vulnerabilities |
| **Specialized AI Engine** | ✅ **Phase 13 Complete** (283 Models) |
| **Intent Pathing** | ✅ **Active** (Semantic Routing) |

---

*This map provides a complete navigation guide to the production-ready POG-CODER-VIBE architecture.* 🗺️⚡
