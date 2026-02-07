# Professional User Guide - POG Environment

Welcome to the **Sovereign Intelligence** production environment. POG is a project-aware, high-performance autonomous development suite designed for precision terminal interaction.

---

## Core Principles
1. **Mock-Free Execution**: Every action is performed against real project substrates.
2. **Project Omniscience**: High-resolution awareness of the entire codebase and its dependencies.
3. **Ternary Model Sharding**: Intelligent routing between local (Ollama) and cloud (Gemini) tiers based on diagnostic complexity.
4. **Synthesis Sovereignty**: Automatically merge multiple candidate solutions into a single high-fidelity "Masterpiece" using the **Synthesis Weaver**.
5. **Continuous Reflection**: Real-time anti-pattern hunting and architectural alignment checks via the **9-Node Cluster Matrix**.
6. **Sovereign Budget Control**: All external services (Cloud APIs, MCP) are human-gated.

---

## 🚀 Interaction Basics

### 1. The Vibe CLI
Launch the interactive REPL from the project root:
```bash
npm run dev
```

**Commands:**
- `help` - Show available commands.
- `history` - View your recent intent history and model choices.
- `state` - Inspect the current system state, health, and circuit breakers.
- `config` - View loaded environment and file settings.
- `models`  - Open the descriptive selection menu for model calibration.
- `toggle <id>` - Enable/Disable an AI service or MCP server (Budget Control).
- `exit`    - Shutdown gracefully (all sessions are saved to `~/.pog-coder-vibe`).

---

## 🧠 Elite Pathing & Semantic Intent

POG-VIBE features a **Selection Guide Brain** that understands the professional justification for using specific models.

### 1. Semantic Awareness
Instead of specifying a model by name, you can describe your goal:
- **"Professional translation"** -> DeepL (Accuracy/Nuance)
- **"Cinematic Video"** -> Sora 2 (Physics/Quality)
- **"Medical Analysis"** -> Radiology Foundations (Specialized Domain)

### 2. Composite Intent (Multi-Path)
Chain complex actions using natural language:
> "Generate a marketing image for my app **and then** translate the description to French."

The system will decompose the request, route step 1 to **DALL-E 3** and step 2 to **DeepL**, and provide a unified result.

> [!IMPORTANT]
> **gcloud CLI Required**: Specialized APIs require the `gcloud` CLI to be authenticated (`gcloud auth login`) for real-time token exchange.

## Project-by-Project Scaffolding

Generate professional project structures instantly using the `create` command:

**Workflow:**
1. **Sensing**: Evaluating architectural alignment and retrieving "Golden Templates" for context.
2. **Thinking**: Predicting failure modes via "Adversarial Pre-Mortem" and checking cluster resource health.
3. **Acting**: Generating code with strict "Type-Safety Sentinel" hints and virtual success scenarios.
4. **Reflecting**: Critiquing output for anti-patterns and weaving candidates into a final result.

---

## 🛡️ Proactive Monitoring & Auto-Healing

The POG environment features a **Background Monitor System** enabled by default. It acts as a persistent assistant that watches your project's health.

### How it Works:
1. **Continuous Auditing**: \`TSCMonitor\` runs in the background, checking for type errors as you (or the agent) work.
2. **Local Sharding**: Small models like **tinyllama** (1B) classify error severity to keep resource usage low.
3. **Contextual Analysis**: **Qwen2.5-Coder (7B)** analyzes structural changes using project snapshots.
4. **Auto-Healing**: When critical errors are detected, the system automatically triggers a fix turn via the top-tier model.

> [!TIP]
> To disable this background process, run with \`ENABLE_MONITOR=false\`.

---

## 🌐 Cloud & Local Intelligence

### The Model & Service Tiers
| Tier | Models / Services | When to use |
| :--- | :--- | :--- |
| **Tier 1 (Cloud)** | Gemini 2.0 Flash | Architecture, Complex Refactoring, Planning. |
| **Tier 2 (Local)** | Qwen2.5-Coder (14B/7B) | Offline coding, Syntax fixes, Logic changes. |
| **Specialized AI** | Health, Geospatial, Document AI | Specialized domain-specific tasks from `API_LIST.md`. |
| **Fallback** | Gemini 1.5 Pro/Flash | High-availability safety Net when Tier 1 is busy. |

**Configuration:**
Add your API key to `.env` to enable Cloud Intelligence and Specialized AI Services:
```bash
GOOGLE_API_KEY=AIza...
```

---

## 🔌 VS Code Integration
The **Vibe Viewer** extension turns VS Code into a live dashboard.

1. Install the extension from the `vscode-extension` directory.
2. Open the **Vibe Dashboard** in your sidebar.
3. Observe real-time logs, model decisions, and the **Interactive Project Preview**.

---

## 📁 Project Portability & Manifests (pog.md)
To ensure every folder in your project is understood by developers and clones alike, use the manifest system.

1. **Generate Manifest**: Run `pog manifest <path>` (e.g., `pog manifest src/core`).
2. **Contextual Awareness**: The system creates a `pog.md` file in the folder, detailing the purpose of each file and the directory's architectural role.
3. **Cloning Support**: When you clone a project, these manifests provide immediate high-fidelity context to the AI, reducing "cold-start" friction.

---

## 🛡️ Best Practices
1. **Trust the Cluster**: The system performs 3 parallel cognitive simulations for every intent. Review the synthesized plan in the logs.
2. **Use Natural Language**: Don't force technical commands; simply describe your goal.
3. **Stability Wins**: If a model is struggling, the system will automatically "Pre-Mortem" its likely failure and pivot to a more robust route.

---

*Engineering Sovereignty through Precision.*
