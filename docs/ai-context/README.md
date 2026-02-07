# AI Context Files

This directory contains reference documentation and help files that provide context for AI assistants working on the POG-CODER-VIBE project.

## Purpose

These files serve as a **knowledge base** for AI agents, providing:
- CLI command references (wrangler, gcloud, ollama, pog)
- API documentation and usage examples
- Tool-specific help and best practices
- Model configurations and capabilities
- Project-specific paths and configurations

## Files

### Cloudflare Wrangler
-`wrangler_help.txt` / `wrangler_help_utf8.txt` — General Wrangler CLI documentation
- `wrangler_ai_help.txt` / `wrangler_ai_help_utf8.txt` — Wrangler AI-specific commands
- `wrangler_ai_models.txt` — Available Cloudflare AI models and their capabilities (162KB reference)

### Google Cloud / Gemini
- `gcloud_help.txt` / `gcloud_help_utf8.txt` — General gcloud CLI documentation
- `gcloud_auth_help.txt` / `gcloud_auth_help_utf8.txt` — Authentication and credentials
- `gcloud_ai_help.txt` / `gcloud_ai_help_utf8.txt` — Google AI Platform commands
- `gcloud_gemini_help.txt` / `gcloud_gemini_help_utf8.txt` — Gemini API usage
- `gcloud_gemini_indexes_help.txt` — Vector index management help
- `gcloud_gemini_indexes.txt` — Gemini index configurations and examples
- `standalone_gemini_help.txt` — Standalone Gemini SDK reference
- `gemini_paths.txt` — Project-specific Gemini configuration paths

### Ollama
- `ollama_help.txt` / `ollama_help_utf8.txt` — Ollama local LLM management

### POG-CODER-VIBE
- `pog_help.txt` / `pog_help_utf8.txt` — POG-specific commands and workflows

## Total Files: 22

## Usage

When an AI assistant is working on this project, it can reference these files to:
1. **Understand available tools and commands**
2. **Learn API-specific syntax and best practices**
3. **Avoid common pitfalls and errors**
4. **Make informed decisions about model selection and routing**
5. **Access project-specific configurations and paths**

## Maintenance

These files should be updated when:
- New CLI tools are added to the project
- API versions change significantly
- New models or capabilities become available
- Project-specific workflows evolve
- Configuration paths change

---

**Note:** UTF-8 variants are provided for compatibility with different text editors and terminals.
