/**
 * Unit tests for FreeOrchestrator
 * Verifies high-level intent execution flow and limb coordination.
 * 
 * STRICT REALISM: Dependencies are real, rooted in a temp dir.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';
import 'dotenv/config';

describe('FreeOrchestrator (Real Integration)', () => {
    let orchestrator: FreeOrchestrator;
    let testDir: string;

    beforeEach(async () => {
        // Disable MonitorAgent during tests to prevent async leaks from TSC watcher
        process.env['ENABLE_MONITOR'] = 'false';

        testDir = join(tmpdir(), 'pog-orch-test-' + Date.now());
        mkdirSync(testDir, { recursive: true });

        const configManager = new ConfigManager(testDir, {
            pogDir: join(testDir, '.pog'),
            projectRoot: testDir,
            projectId: 'TEST_ORCH',
            wsPort: 0
        });

        const config = configManager.getConfig();

        // Initialize Real Dependencies
        const vectorDB = new VectorDB(config); // Needs .pog dir which we'll let it create or we pre-create
        const sandbox = new Sandbox(config);
        const watcher = new ASTWatcher(config);

        // Pre-create .pog structure if needed by VectorDB init
        mkdirSync(join(testDir, '.pog'), { recursive: true });

        orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

        // We might need to init them explicitly if orchestrator.initialize() does it
        // Orchestrator.initialize() initializes watcher and db.
        await orchestrator.initialize();
    });

    afterEach(async () => {
        // CRITICAL: Cleanup orchestrator (WebSocket, Previews) before deleting temp dir
        if (orchestrator) {
            await orchestrator.cleanup();
        }
        try {
            // Cleanup matches behavior of real app? 
            // In tests we just nuke the dir.
            rmSync(testDir, { recursive: true, force: true });
        } catch { }
    });

    it('should initialize successfully', () => {
        expect(orchestrator).toBeDefined();
        expect(orchestrator.getSessionId()).toContain('TEST_ORCH');
    });

    it('should route conversational intents to fast path', async () => {
        const prompt = "Hello! Who are you?";
        const result = await orchestrator.executeIntent(prompt);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.output).toBeDefined();
            // Conversational path usually returns a string response
            expect(typeof result.value.output).toBe('string');
        }
    });

    // We can add more tests as we verify this basic setup works
});
