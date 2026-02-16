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
import { TaskType } from '../src/core/models.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync } from 'fs';
import 'dotenv/config';

describe('FreeModelRouter (Real Integration)', () => {
  let router: FreeModelRouter;
  const testPogDir = join(tmpdir(), 'pog-test-' + Date.now());

  delete process.env['VIBE_CB_COOLDOWN'];

  beforeEach((): void => {
    const configManager = new ConfigManager(process.cwd(), {
      pogDir: testPogDir,
      rootStack: [], projectRoot: process.cwd(),
      circuitBreakerThreshold: 3,
      circuitBreakerCooldown: 1000
    });

    try { mkdirSync(testPogDir, { recursive: true }); } catch { }
    const config = configManager.getConfig();
    router = new FreeModelRouter(config);
  });

  describe('Ternary Decision Tree (Real Models)', () => {
    it('should route simple tasks to fast local models', async (): Promise<void> => {
      const result = await router.route({
        prompt: 'fix typo in hello.ts',
        metadata: { extension: '.ts' }
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('qwen2.5-coder:7b');
      }
    });

    it('should route complex architectural tasks to reasoning models', async (): Promise<void> => {
      const complexPrompt = `
        Architect and design a comprehensive microservices system for a scalable global e-commerce platform.
        The system must include a robust web interface gateway, decentralized service discovery, and asynchronous event-driven communication using Kafka.
        You must meticulously consider horizontal scalability, multi-region fault tolerance, and eventually consistent data patterns.
      `;

      const result = await router.route({
        prompt: complexPrompt,
        metadata: { type: TaskType.Architecture }
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const validModels = ['gemini-thinking', 'gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.0-flash'];
        expect(validModels).toContain(result.value);
      }
    });

    it('should prefer local models for short code generation', async (): Promise<void> => {
      const result = await router.route({
        prompt: 'generate a function to add two numbers',
        metadata: { type: TaskType.Generate }
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('qwen2.5-coder');
      }
    });
  });

  describe('Circuit Breaker (Real Logic)', () => {
    it('should open circuit after threshold failures', (): void => {
      const model = 'gemini-2.0-flash';
      router.recordFailure(model);
      router.recordFailure(model);
      expect(router.getCircuitState(model)).toBe('CLOSED');

      router.recordFailure(model);
      expect(router.getCircuitState(model)).toBe('OPEN');
    });

    it('should move to half-open after cooldown', async (): Promise<void> => {
      const model = 'gemini-2.0-flash';
      router.recordFailure(model);
      router.recordFailure(model);
      router.recordFailure(model);

      expect(router.getCircuitState(model)).toBe('OPEN');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger update
      await router.route('ping');
      expect(router.getCircuitState(model)).toBe('HALF_OPEN');
    });
  });

  describe('Task Classification', () => {
    it('should classify architecture tasks correctly', async (): Promise<void> => {
      const result = await router.route('design a microservices architecture');
      expect(result.ok).toBe(true);
      if (result.ok) {
        const cloudModels = ['gemini-2.0-flash', 'gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-thinking'];
        expect(cloudModels.some(m => result.value.includes(m))).toBe(true);
      }
    });

    it('should handle specialized intents via OverrideStrategy', async (): Promise<void> => {
      const result = await router.route('radiology analysis report');
      expect(result.ok).toBe(true);
      if (result.ok) {
        // IntentMap maps 'radiology' to medgemma:7b. 
        // If not found, it falls back to the most capable local/edge candidate.
        const expectedModels = ['medgemma:7b', 'qwen2.5-coder'];
        expect(expectedModels.some(m => result.value.includes(m))).toBe(true);
      }
    });
  });
});

