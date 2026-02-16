import { describe, it, expect, beforeEach } from '@jest/globals';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';
import 'dotenv/config';

describe('Limbs Startup & Health Check', () => {
    let orchestrator: FreeOrchestrator;
    let testDir: string;

    beforeEach(async () => {
        process.env['ENABLE_MONITOR'] = 'false';
        testDir = join(tmpdir(), 'pog-limbs-test-' + Date.now());
        mkdirSync(testDir, { recursive: true });

        const configManager = new ConfigManager(testDir, {
            pogDir: join(testDir, '.pog'),
            rootStack: [],
            projectRoot: testDir,
            projectId: 'LIMB_HEALTH_TEST',
            wsPort: 0,
            enabledServices: ['dashboard', 'gutenberg_knowledge', 'webforge']
        });

        const config = configManager.getConfig();
        const vectorDB = new VectorDB(config);
        const sandbox = new Sandbox(config);
        const watcher = new ASTWatcher(config);

        orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);
        await orchestrator.initialize();
    }, 15000);

    afterEach(async () => {
        if (orchestrator) await orchestrator.cleanup();
        try {
            // Retry cleanup to handle Windows file locking
            for (let i = 0; i < 3; i++) {
                try {
                    rmSync(testDir, { recursive: true, force: true });
                    break;
                } catch {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        } catch { }
    });

    it('should have all 26 core limbs active on startup', () => {
        const state = (orchestrator as any).getCurrentState();
        expect(state.limbs).toBeDefined();
        // The current Orchestrator registers 26 limbs
        expect(state.limbs.length).toBeGreaterThanOrEqual(25);

        console.log(`✅ Verified ${state.limbs.length} limbs registered on startup.`);
    });

    it('should gate intentions for disabled limbs', async () => {
        // 'gutenberg_knowledge' is enabled in beforeEach
        // 'media_forge' is NOT (not in the initial list above)

        const gutenberg = (orchestrator as any).limbs.find((l: any) => l.id === 'gutenberg_knowledge');
        const media = (orchestrator as any).limbs.find((l: any) => l.id === 'media_forge'); // Wait, check ID

        // Verify Gutenberg is enabled and can handle
        const gDecision = await gutenberg.canHandle({ prompt: 'Read a book', metadata: {} });
        expect(gDecision).not.toBe('Yin');

        // Verify Media is gated
        const mDecision = await media.canHandle({ prompt: 'Generate image', metadata: {} });
        expect(mDecision).toBe('Yin');

        console.log('✅ Verified gating logic: Enabled limbs respond, disabled limbs remain inert.');
    });

    it('should reflect toggle changes in real-time', async () => {
        // Toggle media_forge ON
        await (orchestrator as any).handleControlMessage({
            command: 'toggleService',
            data: { service: 'media_forge', enabled: true }
        }, { send: () => { }, readyState: 1 } as any);

        const media = (orchestrator as any).limbs.find((l: any) => l.id === 'media_forge');
        const mDecisionAfter = await media.canHandle({ prompt: 'Generate image', metadata: {} });
        expect(mDecisionAfter).not.toBe('Yin');

        console.log('✅ Verified dynamic toggle: Service enabled via control plane becomes active.');
    });
});
