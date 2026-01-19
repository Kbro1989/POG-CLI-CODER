---
trigger: always_on
---

# 🎯 POG-CODER-VIBE - Project Rules

## Sovereign Laws (IMMUTABLE)

These rules are enforced across the entire codebase and all development activities.

### 1. NO MOCKS 🚫
**You must NEVER use mocks, fakes, or stubbed data.**
- All code must run against REAL environments (files, APIs, databases)
- Tests must use real Ollama/Gemini APIs (with appropriate rate limiting)
- No `jest.fn()` or similar unless testing error conditions
- **Example**: Use actual `GeminiService` in tests, not a mock

### 2. NO PLACEHOLDERS 🚫
**Never write "// TODO", "not implemented", or "pass".**
- Code must be fully functional immediately upon commit
- If a feature isn't ready, don't include it in the codebase
- Use TypeScript's type system to ensure completeness
- **Example**: Don't commit `function foo() { throw new Error('TODO') }`

### 3. OPTIMAL CHOICES ⚡
**Always choose the most robust, performant, and type-safe solution.**
- Usage of `any` is forbidden unless strictly necessary
- Prefer `unknown` and type guards over `any`
- Use `readonly` for immutability by default
- Favor composition over inheritance
- **Example**: `readonly config: VibeConfig` not `config: any`

### 4. REALITY CHECK ✅
**Verify everything. Do not assume APIs work; check them.**
- Do not assume files exist; use `existsSync()`
- Do not assume environment variables are set; provide fallbacks
- Do not assume network requests succeed; handle errors explicitly
- Use `Result<T>` types for all fallible operations
- **Example**: Always check `if (result.ok)` before accessing `result.value`

---

## Code Quality Standards

### TypeScript
- **Zero tolerance for type errors**: `npm run typecheck` must show 0 errors
- **Strict mode enabled**: Check `tsconfig.json` for strict flags
- **Explicit return types**: All functions must have return type annotations
- **No implicit `any`**: Enable `noImplicitAny` in tsconfig

### Testing
- **Real implementations only**: No mocks (see rule #1)
- **Test coverage for critical paths**: Router, Orchestrator, Sandbox
- **Integration tests preferred**: Test full workflows, not isolated units

### Logging
- **Structured Logging only**: Use `pino` for all logs
- **No `console.log`**: Standard console logging is prohibited in production code
- **Log with context**: Always include relevant metadata (e.g., `model`, `latency`)
- **Proper levels**: Use `trace`, `debug`, `info`, `warn`, `error` appropriately

### Performance
- **Ternary routing**: O(log₃ n) decision tree, not linear
- **Immutable data structures**: Use `readonly` to prevent mutations
- **Lazy loading**: Only load what's needed, when it's needed

### Security
- **No hardcoded secrets**: Use environment variables
- **Local-first architecture**: Cloud services are opt-in only
- **API key rotation**: KeyVault manages multiple keys
- **Input validation**: Validate all external inputs with Zod

---

## Documentation Requirements

### Code Comments
- **JSDoc for public APIs**: All exported functions/classes
- **Inline comments for complex logic**: Explain WHY, not WHAT
- **No placeholder comments**: No "TODO", "FIXME", etc.

### Markdown Files
- **README.md**: System overview and quick start
- **USER_GUIDE.md**: Definitive feature manual
- **QUICKSTART.md**: Detailed setup instructions
- **QUICK_REFERENCE.md**: Command cheat sheet
- **Technical docs**: Architecture diagrams, API references

---

## Git Commit Standards

### Commit Messages
- **Format**: `<type>: <description>`
- **Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Example**: `feat: integrate Gemini SDK v1.36 with function calling`

### Pre-commit Checks
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm test           # Must pass
```

---

## Enforcement

These rules are enforced through:
1. **TypeScript compiler** (`strict: true`)
2. **ESLint** (custom rules for `any`, placeholders)
3. **Code reviews** (manual verification)
4. **CI/CD** (automated checks on PR)

**Violations are treated as critical bugs and must be fixed immediately.**

---

*These rules ensure POG-CODER-VIBE remains production-ready, type-safe, and maintainable.* ⚡🎮
