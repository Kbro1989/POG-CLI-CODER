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
| `get_memory_stats` | Learning database health and lesson counts. | (none) |

---

## 📂 File System & Project
*Owners: `FileSystemLimb`, `FileLimb`, `EntityLimb`*

| Tool Name | Description | Key Parameters |
|:---|:---|:---|
| `read_file` / `write_file` | Basic file I/O operations. | `path`, `content` |
| `patch_file` | Applied targeted diffs to files. | `path`, `patches` |
| `list_files` | Recursive file listing with filtering. | `directory`, `depth` |
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
| `gutenberg_search` | Literature context ingestion. | `query` |

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
