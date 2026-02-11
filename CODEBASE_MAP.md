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
| **[IntentVerifier.ts](./src/core/IntentVerifier.ts)** | Real-time task-intent drift detection & correction | ✅ Phase 13 Complete |
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
| **[Dispatcher.ts](./src/api/ai/Dispatcher.ts)** | gcloud Auth bridge & **Simulation Substrate** | ✅ Phase 13 Complete |

### Experimental Limbs (`/src/limbs/experimental`) 👻

| File | Purpose | Status |
|------|---------|--------|
| **[QuantumLimb.ts](./src/limbs/experimental/QuantumLimb.ts)** | Superposition-based parallel hypothesis testing | ✅ Scaffolded |
| **[RelicLimb.ts](./src/limbs/experimental/RelicLimb.ts)** | RSC Archaeology (JAG archive excavation) | ✅ Real Data |
| **[OmegaLimb.ts](./src/limbs/experimental/OmegaLimb.ts)** | Teleological goal-driven planning | ✅ Scaffolded |
| **[JagArchive.ts](./src/limbs/experimental/rsc/JagArchive.ts)** | Jagex Archive decompression and parsing | ✅ Ported |
| **[JagBuffer.ts](./src/limbs/experimental/rsc/JagBuffer.ts)** | Binary buffer utilities for JAG files | ✅ Ported |
| **[Stream.ts](./src/limbs/experimental/utils/Stream.ts)** | Stream utilities for legacy data formats | ✅ Ported |

### RSC Data Assets (`/rsc-data`) 📦

| File | Purpose |
|------|---------|
| `config85.jag`, `entity24.jag`, `models36.jag`, etc. | 14 authentic JAG/MEM archives from POG-Ultimate |
| `config/` directory | Game definitions (`items.json`, `npcs.json`, `objects.json`) |


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

## 📂 D:\ Sovereign Substrate

**Persistent storage moved to D: for memory management.**

| Directory | Size | Purpose |
|-----------|------|---------|
| `D:\pog-coder-vibe\` | ~300 KB | Runtime config, sessions, learning |
| `D:\pog-gutenberg\` | 30.78 MB | Literary corpus (32 books, 5 domains) |
| `D:\ollama-models\` | **39.86 GB** | Local LLM weights (4 models) |

### D:\pog-coder-vibe\ (Runtime Root)
| File/Directory | Purpose |
|----------------|---------|
| `config.json` | **Master config** (links all paths, models) |
| `vibe-learning.db` | SQLite VectorDB (RAG lessons & embeddings) |
| `free-model-performance.json` | Historical latency & success metrics |
| `session_dashboards/` | Generated HTML/CSS/JS session UIs |
| `snapshots/` | Filesystem backups for rollback |

### D:\ollama-models\ (Local LLMs)
| Model | Role | Config Key |
|-------|------|------------|
| `qwen2.5-coder` | Planning | `planningModel` |
| `deepseek-coder` | Critique | `criticModel` |
| `yi-coder` | Snapshots | `snapshotModel` |
| `tinyllama` | Monitoring | `monitorModel` |

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
| **0 Mock Verification** | ✅ **100% Verified** (Sovereign) |


---

*This map provides a complete navigation guide to the production-ready POG-CODER-VIBE architecture.* 🗺️⚡
-------------------
Perfect. Let’s map **POG-VIBE’s full data & control flow** visually, showing **frontend, WebSocket, agent, services, models, and visualizations**. I’ll keep it conceptual but detailed enough for debugging and architecture reference.

---

### **POG-VIBE System Flow Diagram**

```
┌───────────────────────────────┐
│        Frontend UI            │
│                               │
│ Tabs / Views:                 │
│ - Books / Reader              │
│ - Storyboard                  │
│ - Media Forge                 │
│ - Limb Matrix                 │
│ - Neural Heatmap              │
│ - Logs & Memory Pulse         │
│                               │
│ Interactions:                 │
│ - readBook(bookId)            │
│ - forgeStoryboard()           │
│ - forgeMedia()                │
│ - invokeTool(limb, tool)     │
│ - toggleService(service)      │
│ - toggleNarration/TTS         │
│                               │
└─────────────┬─────────────────┘
              │ WebSocket (ws://:8765)
              ▼
┌───────────────────────────────┐
│        POG-VIBE Agent         │
│                               │
│ ┌───────────────┐             │
│ │ Command Router│──────────────┐
│ └───────────────┘              │
│     │                          │
│     ▼                          ▼
│ ┌───────────────┐      ┌─────────────────┐
│ │ Service Layer │      │ State Snapshot  │
│ │  Enabled:     │      │  (yi-coder)     │
│ │  ollama       │      └─────────────────┘
│ │  mcp_gitkraken│
│ │  healthcare   │
│ │  documentai   │
│ │  vision       │
│ │  mediaforge   │
│ │  gutenberg    │
│ │  dashboard    │
│ │  help         │
│ │  vibe         │
│ │  gemini       │
│ │  vs           │
│ └───────────────┘
│        │
│        ▼
│ ┌─────────────────────────────┐
│ │ Limb / Tool Manager          │
│ │  - execute tool commands     │
│ │  - manage limb health       │
│ └─────────────────────────────┘
│
│ ┌─────────────────────────────┐
│ │ Planning / Evaluation Models │
│ │  - Planning: qwen2.5-coder  │
│ │  - Critic: deepseek-coder   │
│ │  - Monitor: tinyllama        │
│ └─────────────────────────────┘
│
│ ┌─────────────────────────────┐
│ │ Local LLMs / AI Resources    │
│ │  - ollama models             │
│ │  - Gutenberg books           │
│ │  - Media assets (audio/img) │
│ └─────────────────────────────┘
│
└─────────────▲─────────────────┘
              │ WebSocket / Data
              ▼
┌───────────────────────────────┐
│        Frontend UI Updates    │
│                               │
│  - renderBooks(allBooks)      │
│  - renderStoryboard(beats)    │
│  - renderNeuralHeatmap(data)  │
│  - renderLimbMatrix(limbs)    │
│  - updateMemoryPulse(memories)│
│  - updateHealthGauges(metrics)│
│  - pulseMatrix()               │
│  - SovereignBloom particle UI │
└───────────────────────────────┘
```

---

### **Data Flow Notes**

1. **User Interaction → WS → Agent**

   * Commands (book read, forge, invoke tool, toggle service) flow through WebSocket → `Command Router`.

2. **Agent → Models / Services**

   * Router delegates to:

     * **Local LLMs** for text generation / transcription
     * **Service Layer** for domain-specific actions (vision, media, document AI)
     * **Planning / Critic Models** for orchestration, evaluation, and decision-making

3. **Agent → UI Updates**

   * Responses (`bookContent`, `storyboard`, `state`, `pulse`, `intentExecuted`) sent back to frontend → triggers **visualizations, logs, and pulses**

4. **State Persistence**

   * `snapshotModel` (yi-coder) manages agent state snapshots
   * Optional: save logs, matrix positions, and pinned files for reloads

5. **Visualization / Feedback Loop**

   * **SovereignBloom** intensity linked to system load
   * **PulseMatrix** visually highlights random nodes on activity
   * **Neural Heatmap** shows model activation/intensity
   * **Memory Pulse** shows relevant historical data

---
-----------
Alright—here’s a **full narrative content pipeline diagram** for POG-VIBE, showing **how a book becomes a storyboard, then media, then audio, with all WebSocket/model interactions**.

---

### **Book → Storyboard → Media / Audio Pipeline**

```
┌───────────────────────────────┐
│          User UI              │
│ - Select Book                 │
│ - Enter Story Premise         │
│ - Request Media / Audio       │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│       WebSocket Command       │
│  { type: 'control', command:  │
│    'readBook' / 'forge_storyboard' /  │
│    'media_forge_request' / 'transcribeAudiobook' } │
└─────────────┬─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│         POG-VIBE Agent        │
│                               │
│ ┌───────────────┐             │
│ │ Command Router│─────────────┐
│ └───────────────┘             │
│       │                       │
│       ▼                       ▼
│ ┌───────────────┐       ┌─────────────────────────┐
│ │ Gutenberg /   │       │ Storyboard Forge / LLMs │
│ │ Book Reader   │       │  - Uses book styleProfile│
│ │ - Load content│       │  - Planning: qwen2.5-coder │
│ └───────────────┘       │  - Critic: deepseek-coder  │
│                         └─────────────────────────┘
│       │                       │
│       ▼                       ▼
│  Book Content ─────────────>  Beats / Scenes (storyboard)
│                               (with visual prompts & narrative)
│                              
│                               │
│                               ▼
│                     ┌─────────────────────────┐
│                     │  Media Forge Service    │
│                     │ - Input: storyboard / prompt│
│                     │ - Output: images / video │
│                     └─────────────────────────┘
│                               │
│                               ▼
│                     ┌─────────────────────────┐
│                     │ Audiobook / Narration   │
│                     │ - TTS via browser /     │
│                     │   Web Speech API        │
│                     │ - Input: book/storyboard│
│                     └─────────────────────────┘
│                               │
└─────────────▲─────────────────┘
              │
              ▼
┌───────────────────────────────┐
│      Frontend Updates         │
│ - Reader content              │
│ - Storyboard gallery          │
│ - Media gallery               │
│ - Audio playback / narration  │
│ - Logs + Memory Pulse         │
└───────────────────────────────┘
```

---

### **Key Notes / Observations**

1. **Style Profiles**

   * Each book may carry a `styleProfile` → storyboards inherit it for narrative tone and visual prompt generation.

2. **Storyboard → Media**

   * Beats contain **visual prompts** → passed to `mediaforge` → generates images/videos.
   * Supports prompt tweaking in frontend (`media-prompt`, `media-target`).

3. **Audiobook / Narration**

   * Can read directly from `bookContent` or `storyboard`.
   * Browser TTS (`SpeechSynthesis`) or imported audiobooks (`transcribeAudiobook`).

4. **Feedback Loops**

   * Agent sends `intentExecuted` and `pulse` updates → triggers visual matrix activity and bloom.
   * Memory pulses show historical context → helps generate consistent story threads.

5. **System Load / Visualization**

   * Radial gauges (CPU/Mem/Disk/Latency) linked to bloom intensity.
   * All interactions (book read, forge, media generation) feed into **pulseMatrix** and **SovereignBloom**, giving visual feedback of system “thinking”.

---



-----------------

Perfect—let’s map **everything into a single master architecture diagram** for POG-VIBE. I’ll break it down into layers so it’s fully clear, then combine it visually into one coherent flow.

---

## **POG-VIBE Master Architecture**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                               User / Frontend                                 │
│-------------------------------------------------------------------------------│
│ Tabs & UI Elements:                                                            │
│ - Bookshelf / Reader / Storyboard / Media / Logs / Health / Memory Pulse       │
│ - Actions: select book, enter premise, trigger storyboard, forge media, TTS   │
│ - Visual Feedback: bloom substrate, matrix nodes, neural heatmap, radial gauges│
└───────────────┬───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                        WebSocket Communication Layer                            │
│-------------------------------------------------------------------------------│
│ - Sends: control commands (readBook, forge_storyboard, media_forge_request,   │
│   transcribeAudiobook, toggleService, switchWorkspace, invoke_limb_tool)     │
│ - Receives: books, bookContent, storyboard, intentExecuted, pulse, state      │
│ - Handles reconnects, heartbeat, and basic latency tracking                   │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             POG-VIBE Agent Core                                │
│-------------------------------------------------------------------------------│
│ 1. **Command Router**                                                          │
│    - Routes control messages to correct service / model                        │
│    - Logs intent and execution times                                           │
│                                                                               │
│ 2. **Services Layer**                                                          │
│ ┌──────────────────────────┐ ┌───────────────────────────┐ ┌───────────────┐ │
│ │ Gutenberg / Book Reader  │ │ Storyboard Forge           │ │ MediaForge    │ │
│ │ - Load content           │ │ - Style-aware narrative    │ │ - Image/video │ │
│ │ - Parse / segment        │ │ - Beat generation          │ │   generation  │ │
│ └──────────────────────────┘ └───────────────────────────┘ └───────────────┘ │
│                                                                               │
│ ┌──────────────────────────┐ ┌───────────────────────────┐ ┌───────────────┐ │
│ │ Audiobook / TTS          │ │ Health Monitoring / Bloom  │ │ Memory Pulse   │ │
│ │ - Browser SpeechSynthesis│ │ - CPU/Mem/Disk gauges      │ │ - Contextual  │ │
│ │ - Transcription import   │ │ - SovereignBloom particles │ │   memory logs │ │
│ └──────────────────────────┘ └───────────────────────────┘ └───────────────┘ │
│                                                                               │
│ 3. **LLM / Model Layer**                                                      │
│ - Planning Model: qwen2.5-coder                                              │
│ - Critic Model: deepseek-coder                                                │
│ - Snapshot Model: yi-coder                                                    │
│ - Monitor Model: tinyllama                                                    │
│ - Ollama Models: for specialized reasoning / text embeddings                  │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Backend / File & Workspace Layer                       │
│-------------------------------------------------------------------------------│
│ - POG Directory: D:\pog-coder-vibe                                           │
│ - Workspaces: projectRoot, workspaces[]                                       │
│ - Models: Ollama, Error Tracker, Monitor, Critic                               │
│ - Gutenberg Path: D:\pog-gutenberg                                           │
│ - Media / Audio Storage: D:\pog-gutenberg\audio                               │
│ - Cloudflare Gateway: API endpoint for hybrid AI inference                     │
└───────────────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           External Services / APIs                              │
│-------------------------------------------------------------------------------│
│ - Cloudflare AI Gateway (hybrid runtime / inference)                           │
│ - Ollama models (local / D:\ollama-models)                                     │
│ - MCP / GitKraken (source control integration)                                  │
│ - Vision / MediaForge / DocumentAI (content generation & analysis)             │
│ - Dashboard / Healthcare / Vibe / Gemini / VS (misc enabled services)          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

### **Data Flow Highlights**

1. **Book Selection → Agent → Storyboard**

   * User clicks a book → `readBook` → POG-VIBE fetches `bookContent` → renders → `forgeStoryboard` → `Storyboard Forge` uses styleProfile → returns beats/scenes.

2. **Storyboard → Media**

   * Each beat’s `visual` / `prompt` → MediaForge → generates images/video → updates gallery in frontend.

3. **Book / Storyboard → Audiobook**

   * TTS or imported transcription → playback in frontend → optionally contributes to memory pulse.

4. **Health / Pulse / Bloom**

   * CPU/Mem/Disk + execution latency → gauges & bloom intensity → pulse matrix nodes animate → frontend displays real-time activity.

5. **Memory / Contextual Awareness**

   * `intentExecuted` logs query & model → memory pulse highlights context → used to maintain story/narrative consistency.

6. **LLM Integration**

   * qwen2.5-coder → planning & storyboard generation
   * deepseek-coder → critique & refinement of story
   * yi-coder → snapshotting / state logging
   * tinyllama → lightweight monitoring / latency

---

