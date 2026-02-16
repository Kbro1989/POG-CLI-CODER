import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import 'dotenv/config';

// Mock HexagramManager to avoid complex initialization/vectorDB calls? 
// No, existing tests use real VectorDB. We'll stick to real.

describe('Idle State & Objectives Verification', () => {
    let orchestrator: FreeOrchestrator;
    let testDir: string;
    let objectivesPath: string;

    beforeEach(async () => {
        process.env['ENABLE_MONITOR'] = 'false';
        process.env['NODE_ENV'] = 'test'; // Ensure we use test bypasses

        testDir = join(tmpdir(), 'pog-idle-test-' + Date.now());
        mkdirSync(testDir, { recursive: true });

        // Seed objectives.md
        objectivesPath = join(testDir, 'objectives.md');
        writeFileSync(objectivesPath,
            "# Sovereign Objectives\n\n- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3\n" // 33% progress
        );

        const configManager = new ConfigManager(testDir, {
            pogDir: join(testDir, '.pog'),
            rootStack: [], projectRoot: testDir,
            projectId: 'TEST_IDLE',
            wsPort: 0
        });

        const config = configManager.getConfig();
        const vectorDB = new VectorDB(config);
        const sandbox = new Sandbox(config);
        const watcher = new ASTWatcher(config);

        mkdirSync(join(testDir, '.pog'), { recursive: true });

        orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);
        // We don't need full initialization for tool testing if we manually inject dependencies or just test public methods
        // But SovereignCLILimb is initialized in constructor.
        // We do need initialize() to set up some items, but maybe not all.
        // Let's call initialize() to be safe.
        try {
            await orchestrator.initialize();
        } catch (e) {
            console.warn("Orchestrator init partial failure (expected in isolated test):", e);
        }
    });

    afterEach(async () => {
        if (orchestrator) {
            // Mock cleanup if needed
        }
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch { }
    });

    it('should read objectives.md via checkObjectiveProgress', async () => {
        // Spy on logger
        const logSpy = jest.spyOn((orchestrator as any).logger, 'info');

        await orchestrator.checkObjectiveProgress();

        // 1 completed out of 3 total = ~33%
        // logger.info({ progress, completed, total }, 'Objective Progress Checked');
        expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({ progress: 33, completed: 1, total: 3 }),
            'Objective Progress Checked'
        );
    });

    it('should expose check_objective_progress tool via SovereignCLILimb', async () => {
        // We can access the limb directly or try via handleToolCall
        const limbs = (orchestrator as any).limbs;
        const cliLimb = limbs.find((l: any) => l.id === 'sovereign_cli');
        expect(cliLimb).toBeDefined();

        const tools = cliLimb.getTools();
        const hasTool = tools.some((t: any) => t.functionDeclarations.some((f: any) => f.name === 'check_objective_progress'));
        expect(hasTool).toBe(true);

        // Execute tool directly
        const result = await cliLimb.handleToolCall('check_objective_progress', {});
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.output).toContain('- [x] Task 1');
            expect(result.value.output).toContain('- [ ] Task 2');
        }
    });
});
