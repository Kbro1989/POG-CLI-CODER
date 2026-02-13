# 🧠 NEUROLOGICAL_MAP.md
## System Taxonomy: Biological & Functional Mapping

This document provides a neurological and biological overview of the **POG-CODER-VIBE** architecture, mapping computational modules to organic analogues.

---

### 📊 System Vital Signs (File Count)

| Biological Class | Component Path | File Count | Neurological Role |
| :--- | :--- | :--- | :--- |
| **CNS (Central)** | `src/core/` | 23 | Prefrontal Cortex, Brainstem |
| **PNS (Peripheral)** | `src/limbs/` | 35 | Motor Neurons, Limbs |
| **Memory** | `src/learning/`, `src/context/` | 3 | Hippocampus, Long-term Storage |
| **Akashic Records**| `docs/`, Root `*.md` | 54+ | Cortical Logs, Long-term Knowledge |
| **Physical Substrate**| `rsc-data/`, `sovereign/` | 30+ | Somatic Memory, Persistence |
| **Immune System** | `src/validation/`, `tests/` | 45+ | T-Cells, Antigen Verification |
| **Medical System** | `scripts/` | 7 | Diagnostics, Repair, Metabolic Recovery |
| **Sensory (Vigilance)**| `src/monitor/`, `src/watcher/` | 8 | Real-time Health, Startup State Audit |
| **Cognitive Protocols**| `.agent/` | 2 | Pre-compiled Workflows, Training |
| **Scar Tissue** | Root `*.log`, `*.json` | ~50 | Neural Pruning, Diagnostic History |
| **Social/Auxiliary** | `cli/`, `vscode-extension/` | 269+ | Broca's Area, Social Interface |
| **The Unconscious** | `src/limbs/experimental/` | 5+ | Esoteric/Quantum Hypotheses (Ghost Class) |

**Total System Files**: ~530+

---

### 🧬 Biological Categorization

#### 1. Central Nervous System (CNS) - "The Thinking Brain"
*The seat of sovereignty, command, and decision-making.*
- **Brainstem (Base Architecture)**: `NeuralLimb.ts`, `BaseLimb.ts` — Foundational life-support and message passing.
- **Prefrontal Cortex (Decision)**: `Orchestrator.ts`, `Router.ts` — High-level planning and model selection.
- **Thalamus (Relay)**: `GeminiService.ts` — Processing and relaying sensory (API) data to the cortex.

#### 2. Peripheral Nervous System (PNS) - "The Limbs"
*Standardized extensions for interacting with the world.*
- **The Grasping Hand**: `WebAppForgeLimb.ts`, `NeuralForge` — Creating and manipulating code/structure.
- **The Creative Voice**: `MediaForgeLimb.ts` — Creative synthesis and generation.
- **The Narrative Ear**: `GutenbergLimb.ts` — Literary style ingestion and RAG association.
- **The Distributed Nerve**: `MCPLimb.ts` — Universal connectivity to external tools.
- **The System Hand**: `SovereignShellLimb.ts`, `FileLimb.ts` — Root-level execution and substrate manipulation.

#### 3. The Sensory System - "Perception & Vigilance"
*How the system senses state and maintains health.*
- **Vigilance Engine**: `src/monitor/` — Real-time monitoring of neurological drift and **Startup State Resolution**.
- **Proprioception**: `ASTWatcher.ts` — Awareness of internal state (the codebase structure).
- **External Nerves**: `CloudflareLimb` — Vision, Whispher, and Image synthesis input.

#### 4. The Medical System - "Diagnostics & Repair"
*Scripts for metabolic recovery and systemic health.*
- **Diagnostic Heartbeat**: `scripts/diag_env.ts` — Checking the environment's health on cold start.
- **Metabolic Repair**: `scripts/migrate_ollama.ps1`, `generateRegistry.ts` — Restoring functional state and registries.

#### 4. The Memory System - "Hippocampus"
*Retrieval and association of learned patterns.*
- **Declarative Memory**: `VectorDB.ts` — Retrieval of facts and successful patterns.
- **Semantic Context**: `ContextBuilder.ts` — Building the narrative state for the current intent.

#### 5. The Immune System - "Resistance & Health"
*Defending the system against "Mocks" and "Placeholders" (Antigens).*
- **White Blood Cells**: `ValidationSystem.ts`, `ArchitecturalValidator.ts` — Identifying and isolating bad code patterns.
- **Self-Healing Loop**: `AdversarialOrchestrator.ts` — Critical self-review and correction.

#### 6. The Akashic Records - "Cortical Logs"
*The extensive history and design patterns of the system.*
- **Deep Knowledge**: `docs/` — 40+ architectural blueprints and failover strategies.
- **Narrative Identity**: Root `*.md` — 14+ files defining the prompt-identity and system summaries (e.g., `SOVEREIGN_RHETORIC.md`).

#### 7. The Physical Substrate - "Somatic Memory"
*Persistence and raw data storage.*
- **Body Memory**: `rsc-data/` — 25 files of item configurations and static data.
- **Neural Scars**: Root `*.log`, `*.json` — Residual footprints of past linting and diagnostic sessions.

---

### 📂 Specialized Classes (Outside CNS/PNS)

#### 🔬 Medical Class (Diagnostics & Bio Intelligence)
- **Files**: `src/limbs/bio/BioIntelligenceLimb.ts`, `scripts/*.ts`
- **Role**: Specialized analysis of biological data and systemic metabolic health.

#### 👻 Ghost Class (Final Cloud Fallback / The Unconscious)
- **Files**: `src/limbs/experimental/RelicLimb.ts`, `QuantumLimb.ts`, `OmegaLimb.ts`
- **Role**: Archaeological decoding, multi-hypothesis parallel processing, and **Final Failback** to Cloud DCs for system resilience.

#### 🤖 Assistant Class (Social Interface)
- **Files**: `cli/`, `vscode-extension/`
- **Role**: The human-agent interface layers (Broca's and Wernicke's area analogues).

#### 🧬 Connective Tissue (Metabolic Utilities)
- **Files**: `src/utils/`, `src/git/`
- **Role**: Collagen and Fascia — holding the system together, enabling transport and basic metabolism.
