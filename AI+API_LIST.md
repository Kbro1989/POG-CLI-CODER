# AI + API Reference

**POG-CODER-VIBE Supported Models & Services**

This document catalogs AI models and APIs integrated with POG-CODER-VIBE across three tiers: Local (Ollama), Cloud (Gemini), and Edge (Cloudflare Workers AI).

---

## 🏠 Local Models (Ollama)

**Path:** `D:\ollama-models\` (39.86 GB)

| Model | Size | Role | Config Key |
|-------|------|------|------------|
| `qwen2.5-coder` | ~8B | Planning & decomposition | `planningModel` |
| `deepseek-coder` | ~7B | Adversarial critique | `criticModel` |
| `yi-coder` | ~9B | Snapshot analysis | `snapshotModel` |
| `tinyllama` | ~1.1B | Fast background monitoring | `monitorModel` |

**Commands:**
```bash
ollama list          # Show installed models
ollama pull <model>  # Download model
ollama rm <model>    # Remove model
ollama ps            # Show running models
```

---

## ☁️ Cloud Models (Google Gemini)

**SDK:** `@google/genai` v1.36+  
**Auth:** `GOOGLE_API_KEY` env var

### Primary Models

| Model | Context | Best For |
|-------|---------|----------|
| `gemini-2.0-flash` | 1M tokens | Primary orchestrator, daily tasks |
| `gemini-2.5-pro` | 2M tokens | Complex architecture, long context |
| `gemini-2.5-flash` | 1M tokens | Balanced reasoning + speed |
| `gemini-3-flash-preview` | 1M tokens | Agentic workflows |
| `gemini-3-pro-preview` | 2M tokens | Most powerful coding |

### Specialized Models

| Model | Domain | Purpose |
|-------|--------|---------|
| `medgemma` | Medical | Clinical text/image comprehension |
| `imagen-4` | Image | Text-to-image generation |
| `veo-3` | Video | Text-to-video with audio |
| `lyria-2` | Audio | Music generation |
| `hear` | Health | Health acoustic embeddings |
| `derm-foundation` | Dermatology | Skin condition analysis |
| `path-foundation` | Pathology | H&E slide analysis |

---

## ⚡ Edge Models (Cloudflare Workers AI)

**Path:** `CloudflareLimb.ts`  
**Auth:** `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`

### Text/Chat Models

| Model ID | Provider | Context |
|----------|----------|---------|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Meta | Heavy reasoning |
| `@cf/meta/llama-3.2-3b-instruct` | Meta | Fast responses |
| `@cf/mistral/mistral-7b-instruct-v0.1` | Mistral | General chat |

### Image Models

| Model ID | Output |
|----------|--------|
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | 1024x1024 PNG |
| `@cf/black-forest-labs/flux-1-schnell` | Fast generation |

### Embeddings

| Model ID | Dimensions |
|----------|------------|
| `@cf/baai/bge-large-en-v1.5` | 1024 |
| `@cf/baai/bge-base-en-v1.5` | 768 |

### Speech

| Model ID | Purpose |
|----------|---------|
| `@cf/openai/whisper` | Speech-to-text |
| `@cf/microsoft/tts` | Text-to-speech |

---

## 🔀 Routing Strategy

POG-CODER-VIBE uses **Ternary Routing** to select models:

```
1. Check Gemini prefix (gemini:*) → Use Gemini SDK
2. Check Cloudflare intent (image/chat) → Use CloudflareLimb
3. Check storage health (<5GB free) → Force Gemini fallback
4. Check context size (>32K tokens) → Force Gemini fallback
5. Route via ternary tree → Local Ollama
6. On Ollama failure → Emergency Gemini fallback
```

### Ternary Classification

| Value | Meaning | Route |
|-------|---------|-------|
| `-1` | Simple/Local | Ollama |
| `0` | Ambiguous | Fallback chain |
| `+1` | Complex/Cloud | Gemini |

---

## 📊 Model Garden Categories

The following categories are available via Google Vertex AI Model Garden (requires `gcloud auth`):

### Generation
- **Text:** Gemini, Llama, Mistral, Qwen, DeepSeek
- **Image:** Imagen 4, FLUX, Stable Diffusion
- **Video:** Veo 3, CogVideoX, Wan 2
- **Audio:** Lyria 2, Chirp 3, CSM Sesame

### Understanding
- **Vision:** PaLI, CLIP, BLIP, LLaVA
- **Documents:** Document AI OCR, LayoutLM
- **Speech:** Whisper, Chirp 2, MedASR

### Embeddings
- **Text:** Gemini Embedding, E5, BGE, Voyage
- **Multimodal:** ImageBind, MaMMUT

### Specialized Domains
- **Medical:** MedGemma, HeAR, Path Foundation, Derm Foundation, CXR Foundation
- **Code:** Codestral, CodeGemma, Qwen-Coder
- **Translation:** TranslateGemma, NLLB, DeepL

---

## 🔧 Configuration

### Environment Variables
```bash
GOOGLE_API_KEY=...           # Gemini API
CLOUDFLARE_ACCOUNT_ID=...    # Cloudflare account
CLOUDFLARE_API_TOKEN=...     # Cloudflare token
```

### D:\pog-coder-vibe\config.json
```json
{
  "monitorModel": "tinyllama",
  "snapshotModel": "yi-coder",
  "criticModel": "deepseek-coder",
  "planningModel": "qwen2.5-coder"
}
```

---

*For complete Model Garden catalog, see [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)*
