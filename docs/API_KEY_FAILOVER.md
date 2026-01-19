# API Key Failover System

## Quick Start

### 1. Add Backup Keys
```bash
# Add your current key (if not already in vault)
npx tsx cli/cli-keys.ts add primary AIzaSyDOoSSyVk6Gk8tTbBAuCuCa0udOq-WN5g4

# Add backup keys
npx tsx cli/cli-keys.ts add backup-1 AIzaSyABCDEFG...
npx tsx cli/cli-keys.ts add backup-2 AIzaSyXYZ1234...
```

### 2. List Keys
```bash
npx tsx cli/cli-keys.ts list

# Output:
# 🔑 Stored API Keys:
#  ★ primary       AIza****...N5g4
#    backup-1      AIza****...G123
#    backup-2      AIza****...4567
```

### 3. Automatic Failover
No action needed! When a key hits rate limits (429) or auth errors (401/403), the system automatically:
1. Rotates to the next available key
2. Retries the request
3. Logs the rotation event

### 4. Manual Switching (Optional)
```bash
npx tsx cli/cli-keys.ts switch backup-1
```

---

## How It Works

### Encrypted Storage
- Keys stored in `~/.pog-coder-vibe/keys.vault`
- AES-256-CBC encryption (machine-specific key)
- Derived from `COMPUTERNAME` + salt

### Automatic Rotation
```typescript
// On API error (429/401/403)
1. Detect error type (rate_limit / auth_error)
2. Rotate to next key with lowest fail count
3. Retry request once with new key
4. Log rotation event
```

### Fail Count Tracking
- Each key tracks consecutive failures
- Successful call resets count to 0
- Rotation prefers keys with lowest fail count

---

## Security

✅ **Encrypted at rest** (AES-256)  
✅ **Masked in logs** (`AIza****...N5g4`)  
✅ **Machine-specific** (can't copy vault to another machine)  
❌ **Not for production** (use service accounts instead)

---

## Example Usage

```typescript
// System automatically handles rotation
const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

// If primary key fails → auto-switches to backup
const result = await orchestrator.executeIntent("Write a function...");
// ℹ️ Logs: "API key rotated from primary to backup-1"
```

---

## Files

- `src/utils/KeyVault.ts` - Encryption & storage
- `src/core/GeminiService.ts` - Auto-rotation logic
- `cli/cli-keys.ts` - Management CLI
- `~/.pog-coder-vibe/keys.vault` - Encrypted key storage
