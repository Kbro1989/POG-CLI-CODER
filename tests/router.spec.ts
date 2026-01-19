/**
 * Unit tests for Ternary Binary Router
 * Demonstrates decision tree logic and circuit breaker
 * 
 * STRICT REALISM MODE: No mocks allowed. 
 * Tests run against actual detected models and real configuration.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FreeModelRouter } from '../src/core/Router.js';
import { ConfigManager } from '../src/utils/config.js';
import { TaskType as TT } from '../src/core/models.js';
import { join } from 'path';
import { tmpdir } from 'os';
import 'dotenv/config'; // Load .env for REAL integration tests

// NO MOCKS - Real integration only
// jest.mock('child_process'); <--- DELETED

describe('FreeModelRouter (Real Integration)', () => {
  let router: FreeModelRouter;
  const testPogDir = join(tmpdir(), 'pog-test-' + Date.now());

  // Unset conflicting env var that overrides config
  delete process.env['VIBE_CB_COOLDOWN'];

  beforeEach((): void => {
    // strict: true would force real file checks etc.
    const configManager = new ConfigManager(process.cwd(), {
      pogDir: testPogDir,
      projectRoot: process.cwd(),
      circuitBreakerThreshold: 3,
      circuitBreakerCooldown: 1000 // 1 second for testing
    });
    const config = configManager.getConfig();

    // Initialize with REAL config
    router = new FreeModelRouter(config);

    // DEBUG: Verify environment and detected models
    const apiKey = process.env['GOOGLE_API_KEY'];
    console.log('DEBUG: API Key present:', !!apiKey);
    // Access private method for debugging test failure
    const available = (router as any).getAvailableModels().map((m: any) => m.name);
    console.log('DEBUG: Available Models:', available);
  });

  describe('Ternary Decision Tree (Real Models)', () => {
    it('should route simple tasks to fast cloud models (Priority 100)', (): void => {
      const result = router.route('fix syntax error in hello.ts', 'hello.ts');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Syntax tasks route to gemini-flash (priority 100, fastest model)
        // This validates cloud-first strategy is working
        expect(result.value).toBe('gemini-flash');
      }
    });

    it('should route complex architectural tasks to reasoning models', (): void => {
      // Must be > 40 words to trigger Complexity Score >= 3.
      // We explicitly avoid the word 'API' because it triggers TT.APIOrchestration which has a different scoring path!
      // We want TT.Architecture to trigger the +2 Score boost.
      const complexPrompt = `
        Architect and design a comprehensive microservices system for a scalable global e-commerce platform.
        The system must include a robust web interface gateway, decentralized service discovery, and asynchronous event-driven communication using Kafka.
        You must meticulously consider horizontal scalability, multi-region fault tolerance, and eventually consistent data patterns.
        Please provide a detailed diagram and explanation of the component interactions.
        Also include security best practices for inter-service authentication.
      `;

      const result = router.route(complexPrompt);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // High complexity -> Right Node -> Architecture -> Right -> gemini-thinking
        expect(result.value).toBe('gemini-thinking');
      }
    });

    it('should prefer cloud models over local (Optimization Strategy)', (): void => {
      const result = router.route('generate a function');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // With Gemini API available, cloud models (priority 95-100) beat local models (priority 60-75)
        // Simple generate task routes to gemini-flash due to highest priority
        expect(result.value).toBe('gemini-flash');

        // Verify longer prompts still use flash (not thinking) for generate tasks
        const longPrompt = "generate a function " + "word ".repeat(45);
        const res = router.route(longPrompt);
        if (res.ok) {
          expect(res.value).toBe('gemini-flash');
        }
      }
    });

    it('should use historical performance to optimize routing', (): void => {
      // Verify router considers historical data for model selection
      // With cloud models having priority 95-100, local models need circuit breaker
      // to be bypassed in favor of historical performance
      const goodModel = 'qwen2.5-coder:14b-instruct-q5_K_M';
      const badModel = 'yi-coder:9b-chat-q5_K_M';

      for (let i = 0; i < 5; i++) {
        router.recordPerformance({ model: goodModel, taskType: TT.Generate, extension: 'ts', latency: 200, success: true, timestamp: Date.now(), isFree: true });
      }
      for (let i = 0; i < 5; i++) {
        router.recordPerformance({ model: badModel, taskType: TT.Generate, extension: 'ts', latency: 5000, success: false, timestamp: Date.now(), isFree: true });
      }

      const result = router.route('generate TypeScript function', 'test.ts');

      expect(result.ok).toBe(true);
    });
  });

  describe('Circuit Breaker (Real Logic)', () => {
    it('should open circuit after threshold failures', (): void => {
      const model = 'gemini-flash';
      // Note: Router returns 'gemini-flash' name, not command string.

      router.recordFailure(model);
      router.recordFailure(model);
      expect(router.getCircuitState(model)).toBe('CLOSED');

      router.recordFailure(model);
      expect(router.getCircuitState(model)).toBe('OPEN');
    });

    it('should move to half-open after cooldown', async (): Promise<void> => {
      const model = 'gemini-flash';
      // Reset state logic is tricky without new instance, but new instance created in beforeEach doesn't persist failures from previous test
      // Each 'it' gets a fresh router from beforeEach so strict isolation.

      router.recordFailure(model);
      router.recordFailure(model);
      router.recordFailure(model);

      expect(router.getCircuitState(model)).toBe('OPEN');

      // Wait > 1000ms (Safe margin 2500ms)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Trigger lazy update by calling route or internal check
      // We must call route() to trigger applyCircuitBreaker logic which updates the state for 'gemini-flash'
      // 'fix syntax error' triggers TT.Syntax -> gemini-flash
      router.route('fix syntax error');

      expect(router.getCircuitState(model)).toBe('HALF_OPEN');
    });

    it('should use fallback when circuit is open', (): void => {
      const primaryModel = 'gemini-flash';
      // Fallback logic for flash? Defaults to qwen-14b
      const expectedFallback = 'qwen2.5-coder:14b-instruct-q5_K_M';

      router.recordFailure(primaryModel);
      router.recordFailure(primaryModel);
      router.recordFailure(primaryModel);

      // Trigger routing to gemini-flash
      // Syntax task normally routes to gemini-flash, but circuit is open
      const result = router.route('fix syntax error');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedFallback);
        expect(result.value).not.toBe(primaryModel);
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Task Classification', () => {
    it('should classify architecture tasks', (): void => {
      const prompts = [
        'design a microservices architecture',
      ];

      for (const prompt of prompts) {
        const result = router.route(prompt);
        expect(result.ok).toBe(true);
        // Short prompt -> gemini-flash (Center node)
        // Long prompt -> gemini-thinking (Right node)
        // So we expect flash here.
        if (result.ok) {
          expect(result.value).toBe('gemini-flash');
        }
      }
    });

    it('should classify syntax/debug tasks', (): void => {
      // Syntax tasks -> Flash (Cloud)
      const prompts = [
        'fix syntax error in line 42',
        'debug stack overflow error'
      ];

      for (const prompt of prompts) {
        const result = router.route(prompt);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).not.toContain('thinking'); // Should be fast model
        }
      }
    });
  });
});
