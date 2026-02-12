# 🧠 POG-CODER-VIBE | AI TOOL SPINE MANIFEST

This manifest provides a comprehensive list of all tools available to the Sovereign Cogntive Substrate. Every tool is Zod-validated and integrated through the `ToolingSpine`.

---

## 🏗️ Core Control Plane
*Owner: `ControlPlaneLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `plan_tool_execution` | Decomposes tasks into actionable steps. | `goal`, `steps` |
| `route_model` | Selects optimal model for task/context. | `taskType`, `reason` |
| `evaluate_result` | Analyzes output for success and lessons. | `success`, `lessons` |
| `manage_durable_memory` | Manages persistent assets on GCS. | `intent`, `payload_uri` |
| `emit_execution_manifest` | Records audit logs of cognitive intents to GCS. | `intentId`, `toolChain` |
| `cloud_shell_cognitive_assist` | Terminal-aware assist for infra/debugging. | `intent`, `terminal_context` |
| `manage_event_triggers` | Manages Cloud orchestration triggers. | `action`, `triggerId` |

---

## 💾 Memory & Learning
*Owner: `MemoryLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `search_similar_lessons` | Recalls past solutions and errors via VectorDB. | `query`, `limit` |
| `index_project_files` | Triggers high-fidelity re-indexing of codebase. | `force` |
| `add_lesson` | Manually injects a lesson into cognitive memory. | `text`, `metadata` |
| `get_memory_stats` | Learning database health and lesson counts. | (none) |

---

## 📂 File System & Project
*Owners: `FileSystemLimb`, `FileLimb`, `EntityLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `read_file` / `write_file` | Basic file I/O operations. | `path`, `content` |
| `read_many_files` | Batch read multiple files for optimization. | `paths` |
| `patch_file` | Applied targeted diffs to files (Resilient). | `path`, `search`, `replace` |
| `smart_edit` | Robust multi-strategy file editing engine. | `path`, `old_string`, `new_string` |
| `list_files` | Recursive file listing with filtering. | `dir` |
| `create_directory` | Creates a new directory path recursively. | `path` |
| `delete_file` | Deletes a file from the substrate. | `path` |
| `move_file` | Renames or moves a file. | `source`, `destination` |
| `rollback_snapshot` | Restores project to a previous state. | `snapshotId` |
| `generate_pog_manifest` | Generates a portability manifest for a folder. | `path` |
| `git_status` / `git_commit` | Sovereign version control. | `message` |
| `npm_install` | Dependency management. | `packages`, `saveDev` |
| `create_entity` | Manifests 3D entities in scene. | `id`, `entityType` |

---

## 🐚 Sovereign Shell
*Owner: `SovereignShellLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `gemini_cli_exec` | High-fidelity fallback code edits. | `args` |
| `gcloud_global_exec` | Direct Google Cloud CLI access. | `command` |
| `wrangler_global_exec` | Cloudflare Workers management. | `command` |
| `github_ssh_exec` | Secure Git operations via SSH agent. | `args` |

---

## 🌐 Substrate & AI Utility
*Owner: `SubstrateLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `visual_ocr_analysis` | High-speed Vision AI text extraction. | `imageBase64` |
| `fast_translation` | Real-time multilingual bridging. | `text`, `targetLang` |
| `entity_intent_extraction` | NLP intent categorization. | `text` |
| `edge_bake_asset` | Cloudflare Workers AI asset generation. | `prompt`, `type` |

---

## 🎨 Creative Forges
*Owners: `MediaForgeLimb`, `WebAppForgeLimb`, `NeuralForgeLimb`, `YoloLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `media_forge_request` | Generates 3D, Audio, or Text assets. | `type`, `count` |
| `scaffold_project` | Framework-aware project setup. | `name`, `stack` |
| `forge_request` | Specialized SQL/Docs/Refactor output. | `forgeType`, `prompt` |
| `yolo_reasoning` | Unrestricted high-creativity reasoning. | `prompt` |

---

## 🔊 Sensory Limbs
*Owners: `VoiceLimb`, `BioIntelligenceLimb`, `GutenbergLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `transcribe_mic` | Locally-tethered audio capture. | `duration` |
| `speak_text` | Windows SAPI text-to-speech. | `text` |
| `pathology_analysis` | Med-Gemma specialized image analysis. | `imageBase64` |
| `gutenberg_search` / `gutenberg_ingest` | Literature context ingestion. | `search`, `domains` |
| `gutenberg_styles` | List author styles/domains in cache. | (none) |
| `get_library` | Retrieve metadata for all cached books. | (none) |
| `read_book` | Read locally cached book content. | `bookId` |
| `gutenberg_analyze_style` | Analyze literary style metrics. | `bookId` |
| `rag_ingest_book` | Chunk and embed book into RAG. | `bookId` |
| `retrieve_context` | Semantic search for literary context. | `query`, `limit` |
| `audiobook_transcribe` | Transcribe audiobooks via Whisper. | `fileName` |
| `narrate_book` | Generate professional narration. | `bookId`, `style` |

---

## 🔬 Experimental Limbs
*Owners: `RelicLimb`, `QuantumLimb`, `OmegaLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `relic_excavate_cache` | Detect/list RSC archives in storage. | `cacheId` |
| `relic_read_record` | Read specific file from RSC cache. | `path`, `base64` |
| `relic_explore_museum` | Search museum for binary archives. | `category`, `limit` |
| `quantum_superposition` | Parallel multi-model intent execution. | `prompt` |
| `omega_teleology_check` | Measure project gap to completion. | `goal` |

---

## 📊 QOL & Observability
*Owner: `DashboardLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `show_dashboard` | Activates session management UI. | (none) |
| `update_dashboard` | Manually refreshes active assets. | (none) |

---

> [!NOTE]
> All tools are subject to the **Sovereign Lock** (NO MOCKS policy). Handlers MUST interface with real hardware or production APIs.

---

## 🚀 Runtime Hardening Status (2026-02-12)

### Google Gemini 2.0
- **Status**: Production Ready ✅
- **Features**: `thoughtSignature` support, Robust candidate validation, Exponential Backoff Retries.
- **Failover**: Automated rotate-on-quota to `gemini-2.0-flash-lite`.

### Cloudflare AI Gateway
- **Status**: Production Ready ✅
- **Features**: Ternary Routing (Proxy > Gateway > Direct), URL Observability, Global Auth Fallback.
### Dashboard
- **Status**: Production Ready ✅
- **Features**: Adaptive Port Management with POG-identity verification.

### Universal MCP Substrate
- **Status**: Production Ready ✅
- **Features**: Dynamic tool discovery, Stdio/SSE/HTTP support, `mcp_` prefixing.
- **Integration**: Configured via `pog-mcp.json`.
