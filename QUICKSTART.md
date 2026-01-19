# Professional Setup Guide - POG-VIBE

Deploy the production environment in under 5 minutes.

---

## 🚀 Installation

### Step 1: Install Ollama (Core Free Engine)
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### Step 2: Pull Free Models
```bash
ollama pull qwen2.5-coder:7b-instruct-q4_K_M    # Small (cpu friendly)
ollama pull yi-coder:9b-chat-q5_K_M             # Balanced
ollama pull qwen2.5-coder:14b-instruct-q5_K_M   # Power (complex tasks)
ollama pull tinyllama:latest                    # Monitor (enabled by default)
# Recommended for Cloud Fallback
# Ensure GOOGLE_API_KEY is defined in your secure .env for Gemini 2.0 Flash usage
```

### Step 3: Clone and Install Project
```bash
git hide-clone pog-coder-vibe # Use your organization's internal git mirror
cd pog-coder-vibe

npm install
```

### Step 4: Configure specialized APIs (Optional)
```bash
# Required for Elite Pathing (Sora 2, DeepL, etc.)
gcloud auth login
gcloud auth application-default login
```

### Step 5: Verify Installation
```bash
npm run typecheck  # Should show 0 errors
npm run build      # Should succeed
```

---

## 🎯 Basic Usage

### Terminal REPL
```bash
🎯 Professional Orchestration Governance v1.0 (Production)
📁 Project: ~/workspace/production-api
💾 Session: vibe_1704123456_abc123
🔌 System Interface: ws://localhost:8765
🛡️ Monitor: Active (TSC Watch + Auto-Heal)

🎯 vibe> create a TypeScript interface for User

🤖 Using free model: qwen2.5-coder:14b
[Shows dry-run of commands]
Press Enter to execute, Ctrl+C to abort
```

### Command Examples

#### Code Generation
```bash
vibe> generate a REST API endpoint for user login
vibe> create a React component for user profile
vibe> write unit tests for the User class
```

#### Debugging
```bash
vibe> fix syntax error in hello.ts
vibe> debug why this function is returning undefined
vibe> investigate memory leak in server.js
```

#### Refactoring
```bash
vibe> refactor this function to use async/await
vibe> optimize database queries in user repository
vibe> clean up code duplication in these files
```

#### Architecture
```bash
vibe> design a microservices architecture for e-commerce
vibe> explain the current project structure
vibe> suggest improvements for scalability
```

### Built-in Commands
```bash
vibe> history          # View intent history
vibe> state            # Show current state
vibe> revert <id>      # Revert to snapshot
vibe> exit             # Quit (saves session)
```

---

## 🎨 VS Code Extension

### Installation
```bash
npm run vscode:package
code --install-extension vscode-extension/*.vsix
```

### Usage

1. **Open VS Code** in your project
2. **View** → **Vibe State** panel appears in Explorer
3. **Run CLI** in terminal: `npm run dev`
4. **Watch real-time updates** in Vibe State panel

**Panel shows:**
- 📊 Intent count
- 🤖 Available models
- 📝 Recent file changes
- 🚨 AI-induced errors (with revert)
- ⚡ Performance metrics

---

## ⚙️ Configuration

### Environment Variables

```bash
# Set custom POG directory
export POG_DIR=~/custom-pog-dir

# Change WebSocket port
export VIBE_WS_PORT=9000

# Adjust circuit breaker
export VIBE_CB_THRESHOLD=5
export VIBE_CB_COOLDOWN=60000  # 60 seconds

# Set log level
export VIBE_LOG_LEVEL=debug  # trace|debug|info|warn|error

# Custom session ID
export SESSION_ID=alpha-test-01
```

### Config File

Create `~/.pog-coder-vibe/config.json`:
```json
{
  "wsPort": 9000,
  "circuitBreakerThreshold": 5,
  "circuitBreakerCooldown": 60000,
  "logLevel": "debug",
  "maxSnapshotAge": 172800000
}
```

### Programmatic Configuration

```typescript
import { ConfigManager } from './src/utils/config';

const config = new ConfigManager(process.cwd(), {
  wsPort: 9000,
  circuitBreakerThreshold: 5,
  logLevel: 'debug'
});
```

---

## 🧪 Testing

### Run Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Example Test
```typescript
import { FreeModelRouter } from './src/core/Router';

test('routes simple tasks to lightweight models', async () => {
  const router = new FreeModelRouter(config);
  const result = await router.route('fix typo');
  
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(['qwen2.5-coder:14b', 'codellama:13b']).toContain(result.value);
  }
});
```

---

## 📊 Monitoring

### View Performance Stats
```bash
vibe> state

# Output:
{
  "sessionId": "vibe_1704123456_abc123",
  "intentCount": 47,
  "models": [
    "qwen2.5-coder:14b",
    "phi3:14b",
    "deepseek-coder:33b"
  ],
  "recentIntents": [...]
}
```

### Check Logs
```bash
# Development (pretty)
npm run dev

[14:23:15.123] INFO (Router): Router initialized
    pogDir: "/home/user/.pog-coder-vibe"
    models: 5

# Production (JSON)
LOG_LEVEL=info npm run dev | pino-pretty
```

### Performance Analysis
```typescript
// In code
const router = new FreeModelRouter(config);

// After some usage
const stats = router.getPerformanceStats();
console.log({
  totalRequests: stats.total,
  avgLatency: stats.avgLatency,
  successRate: stats.successRate,
  modelBreakdown: stats.byModel
});
```

---

## 🔧 Troubleshooting

### No Models Available
```bash
# Check Ollama is running
ollama list

# If empty, pull models
ollama pull qwen2.5-coder:14b

# Check Ollama is running
ps aux | grep ollama

# Start Ollama if needed
ollama serve
```

### WebSocket Connection Failed
```bash
# Check port is not in use
lsof -i :8765

# Use different port
export VIBE_WS_PORT=9000
npm run dev
```

### Type Errors
```bash
# Run type checker
npm run typecheck

# Fix errors shown
# All errors are actionable with clear messages

# Re-check
npm run typecheck  # Should show 0 errors
```

### Circuit Breaker Triggered
```bash
# Check circuit states
vibe> state

# If model is OPEN:
# 1. Wait for cooldown (30s default)
# 2. Or increase threshold:
export VIBE_CB_THRESHOLD=10

# 3. Or restart to reset:
vibe> exit
npm run dev
```

### Performance Issues
```bash
# Enable debug logging
export VIBE_LOG_LEVEL=debug
npm run dev

# Check model latency in logs
# Look for high latency values

# Try different model manually
vibe> history  # See which models were used

# Prefer faster models for simple tasks
```

---

## 🎓 Learning Path

### Day 1: Basics
1. ✅ Install Ollama and models
2. ✅ Run `npm run dev`
3. ✅ Try simple commands: "generate a function"
4. ✅ Use `history` to see what happened
5. ✅ Try `state` to see metrics

### Day 2: Advanced
1. ✅ Install VS Code extension
2. ✅ Configure environment variables
3. ✅ Try complex prompts: "design architecture"
4. ✅ Use snapshots: revert when needed
5. ✅ Check performance with `state`

### Day 3: Mastery
1. ✅ Read ternary tree docs
2. ✅ Customize decision tree
3. ✅ Write custom tests
4. ✅ Configure circuit breaker
5. ✅ Analyze performance data

---

## 📚 Documentation

### Core Concepts
- [USER_GUIDE.md](./USER_GUIDE.md) - Definitive manual for all features
- [Ternary Tree Guide](./TERNARY_TREE_GUIDE.md) - Routing algorithm explained
- [Optimization Summary](./OPTIMIZATION_SUMMARY.md) - Before/after comparison
- [README](./README.md) - Full feature documentation

### Code Examples
- [Router Tests](./tests/router.spec.ts) - How to use the router
- [Config Examples](./src/utils/config.ts) - Configuration patterns
- [Type Definitions](./src/core/models.ts) - All types explained

### Best Practices
- **Always check Result types** with `isOk()` / `isErr()`
- **Use readonly by default** for immutability
- **Enable strict TypeScript** for safety
- **Log with context** for debugging
- **Write tests** for critical paths

---

## 🤝 Contributing

### Development Setup
```bash
# Install
npm install

# Run with auto-reload
npm run dev

# Lint code
npm run lint

# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

### Code Style
- **0 TypeScript errors** tolerated
- **No `any` types** unless absolutely necessary
- **Readonly by default** for function params
- **Result types** for error handling
- **Structured logging** with pino
- **Max function complexity: 15**

### Submitting PRs
1. Fork the repo
2. Create feature branch
3. Make changes (pass all checks)
4. Add tests
5. Submit PR with clear description

---

## 🆘 Support

### Common Questions

**Q: Which model should I use for X?**  
A: Don't worry! POG-VIBE features **Elite Pathing**. You can describe your intent (e.g., "translate to French", "generate cinematic video") and the system will automatically route your request to the most specialized high-fidelity model in the 283-model registry.

**Q: Can I use paid models?**  
A: Yes! Add them to the `FREE_MODELS` config with custom commands.

**Q: How do I speed up routing?**  
A: The ternary tree is already optimized (O(log₃ n)). For further speedup:
1. Use faster models for simple tasks
2. Increase circuit breaker threshold
3. Reduce logging level in production

**Q: Is my data sent to the cloud?**  
A: No! Everything runs locally with Ollama. Optional cloud models (gemini-free) require explicit API keys.

**Q: Can I customize the decision tree?**  
A: Yes! See [TERNARY_TREE_GUIDE.md](./TERNARY_TREE_GUIDE.md) for examples.

### Getting Help
- 📖 Read the docs first
- 💬 Open an issue on GitHub
- 🐛 Include logs and config when reporting bugs
- ✨ Share your optimizations with the community

---

## 🏆 Next Steps

### Beginner
- [x] Install and run
- [x] Try 10 different prompts
- [x] Review history
- [x] Install VS Code extension

### Intermediate
- [x] Configure environment variables
- [x] Analyze performance data
- [x] Create custom config file
- [x] Use snapshots for safety

### Advanced
- [x] Read ternary tree docs
- [x] Write custom tests
- [x] Tune circuit breaker
- [x] Contribute improvements

---

*Engineering excellence through autonomous orchestration.*
