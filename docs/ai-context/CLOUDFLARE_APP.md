# Cloudflare App & CLI (Standalone)

**Location**: `src/apps/cloudflare/`
**CLI Entry**: `src/apps/cloudflare/cli.ts`

The Cloudflare Limb has been isolated into a standalone application that can function independently of the main POG Orchestrator. This allows for direct access to Cloudflare Workers AI and R2 storage without booting the entire neural mesh.

## Quick Start

Ensure your `.env` has valid credentials:
```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

### 1. Health Check
Verify connectivity and authentication:
```bash
npm run cf:cli health
```

### 2. Generate Images
Generate valid Stable Diffusion XL images directly from the terminal:
```bash
npm run cf:cli gen-image "A futuristic cyberpunk city with neon lights, high quality, 8k"
```
*Images are saved to the current working directory.*

### 3. Run Pipeline
Execute the multi-stage creative pipeline (Interpret -> Generate -> Persist):
```bash
npm run cf:cli pipeline "Create a logo for a space exploration company"
```
*This pipeline:*
1. Uses Llama 3.1 8B to refine your prompt.
2. Generates the image via SDXL.
3. Uploads the result to your R2 bucket (`workspace-bucketsespreview`).
4. Returns a public URL.

## Architecture

- **`src/services/CloudflareServices.ts`**: Low-level API client (Shared).
- **`src/apps/cloudflare/Pipeline.ts`**: Encapsulates the creative workflow logic.
- **`src/apps/cloudflare/cli.ts`**: The CLI entry point.
- **`src/limbs/cloud/CloudflareLimb.ts`**: A thin wrapper that connects this standalone app to the POG Orchestrator, ensuring the core system can still drive these tools.

## Integration

The `CloudflareLimb` lazy-loads the pipeline from the app directory, ensuring efficient startup for the main system while keeping the heavy logic isolated.
