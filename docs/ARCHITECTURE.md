# POG-CODER-VIBE Architecture

**Internal Component Documentation**

This document details the core components that power the Sovereign AI system.

---

## Core Brain (`src/core/`)

### Orchestrator.ts (1518 lines)
**The Central Coordination Engine**

Implements the **Research → Plan → Execute → Review** loop that drives all operations.

```
┌─────────────────┐
│   User Intent   │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Orchestrator  │────▶│  ContextBuilder  │
│                 │     │  (RAG injection) │
│  Research Phase │     └──────────────────┘
│  Plan Phase     │
│  Execute Phase  │────▶ Limbs / Router
│  Review Phase   │
└─────────────────┘
```

**Key Methods:**
- `processIntent()` - Main entry point for all user requests
- `buildOmniscienceContext()` - Full project context injection
- `dispatchToLimb()` - Routes to specialized agents
- `verifyExecution()` - Post-execution validation

---

### Router.ts (288 lines)
**Ternary Decision Tree with Circuit Breakers**

O(log₃ n) routing that replaces linear model selection.

```typescript
// Ternary Decision Values
-1 = De-escalate / Local / Simple
 0 = Neutral / Fallback Chain
+1 = Escalate / Cloud / Complex
```

**Features:**
- **Circuit Breakers**: Track model health, auto-failover on 3 failures
- **Weighted Analysis**: Task complexity + history + health
- **Tiered Fallback**: Ollama → Gemini → Emergency

---

### ToolingSpine.ts (84 lines)
**Standardized Tool Registration & Validation**

Central registry for all Limb tools with Zod schema validation.

```typescript
interface LimbTool {
  name: string;
  description: string;
  schema?: z.ZodSchema;    // Input validation
  execute: (args: unknown) => Promise<Result<unknown>>;
}
```

**Integration Pattern:**
1. Limbs register tools via `ToolingSpine.register()`
2. Orchestrator queries available tools for planning
3. Execution validated against Zod schemas
4. Results typed via `Result<T>` pattern

---

### TaskClassifier.ts (94 lines)
**AI-Powered Task Classification**

Classifies user prompts into task types with ternary confidence.

```typescript
enum TaskType {
  Architecture = 'architecture',
  Syntax = 'syntax',
  Refactor = 'refactor',
  Debug = 'debug',
  Generate = 'generate',
  Research = 'research',
  Security = 'security'
}
```

**Classification Flow:**
1. Pattern matching on keywords
2. AI-based fallback using Gemini
3. Returns `{ type: TaskType, confidence: Ternary }`

---

### AdversarialOrchestrator.ts (275 lines)
**3-Agent Hallucination Eradication**

Implements adversarial loops where multiple agents validate each other.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Agent A   │───▶│   Agent B   │───▶│   Agent C   │
│  Generator  │    │   Critic    │    │   Arbiter   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   Generate           Critique           Decide
```

**Stages:**
1. **Generator**: Creates initial solution
2. **Critic**: Reviews for hallucinations, anti-patterns
3. **Arbiter**: Final decision, synthesizes best approach

---

### GeminiService.ts (197 lines)
**Google Gemini SDK Client**

Native `@google/genai` integration with:
- Key rotation via KeyVault
- Health tracking & circuit breakers
- Function calling support

```typescript
const response = await geminiService.generateContent({
  model: 'gemini-2.0-flash',
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  tools: [{ functionDeclarations: [...] }]
});
```

---

### ModelExecutor.ts (426 lines)
**Unified Model Execution Layer**

Abstraction over Ollama, Gemini, and Cloudflare.

```typescript
interface ModelExecutor {
  execute(prompt: string, model: string): Promise<Result<ModelResponse>>;
  stream(prompt: string, model: string): AsyncGenerator<string>;
}
```

---

### StateManager.ts (96 lines)
**Global Singleton for Metrics**

Tracks session-wide metrics and state.

```typescript
interface AppMetrics {
  tokens: number;
  cost: number;
  latency: number;
  turnCount: number;
}
```

---

## Limb Architecture (`src/limbs/`)

### BaseLimb.ts (158 lines)
**Abstract Foundation Class**

All limbs extend `BaseLimb` which provides:
- ToolingSpine integration
- Automated logging (pino)
- Health registration

```typescript
abstract class BaseLimb implements NeuralLimb {
  protected spine: ToolingSpine;
  protected logger: Logger;
  
  abstract canHandle(intent: Intent): TernaryDecision;
  abstract execute(intent: Intent): Promise<Result<Execution>>;
}
```

---

### Key Limbs

| Limb | Lines | Purpose |
|------|-------|---------|
| `CloudflareLimb.ts` | 527 | Workers AI (image, chat, embeddings, speech, vision) |
| `GutenbergLimb.ts` | 633 | Literary corpus ingestion, domain taxonomy |
| `RelicLimb.ts` | 495 | RSC archaeology, JAG archive parsing |
| `SovereignShellLimb.ts` | 119 | CLI fallback (gemini, gcloud, wrangler, ssh) |
| `WebAppForgeLimb.ts` | 400+ | Full-stack scaffolding |
| `MediaForgeLimb.ts` | 350+ | Imagen/Veo/Lyria generation |

---

## D:\ Sovereign Substrate

The persistent data layer on D: drive:

```
D:\
├── pog-coder-vibe\          # Runtime root
│   ├── config.json          # Master config
│   ├── vibe-learning.db     # SQLite lessons/embeddings
│   └── session_dashboards\  # Generated UIs
├── pog-gutenberg\           # Literary corpus (32 books)
│   └── domains\             # fantasy/history/literature/psychology
└── ollama-models\           # Local LLMs (39.86 GB)
    ├── blobs\               # Weight files
    └── manifests\           # Model registries
```

---

## Data Flow

```
User Intent
     │
     ▼
CLI / VS Code Extension
     │
     ▼
┌───────────────────────────────────────────────────┐
│                   Orchestrator                     │
│  Research → Plan → Execute → Review               │
├───────────────────────────────────────────────────┤
│  ├→ TaskClassifier (type + complexity)            │
│  ├→ ContextBuilder (VectorDB RAG)                 │
│  ├→ Router (Ternary Decision)                     │
│  │     ├→ Ollama (Local-First)                    │
│  │     └→ Gemini (Cloud Fallback)                 │
│  ├→ Limbs (Specialized Skills)                    │
│  ├→ AdversarialOrchestrator (Validation)          │
│  └→ Sandbox (Safe Execution)                      │
└───────────────────────────────────────────────────┘
     │
     ▼
VectorDB Update ← CodebaseIndexer ← ASTWatcher
```

---

*Internal documentation for POG-CODER-VIBE maintainers.*
