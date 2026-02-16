import { FreeModelRouter } from '../src/core/Router.js';
import { VibeConfig } from '../src/core/models.js';
import { ModelInventory } from '../src/core/ModelInventory.js';
import dotenv from 'dotenv';
import { join } from 'path';
import fs from 'fs';

dotenv.config();

const OUTPUT_DIR = join(process.cwd(), 'tests', 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const LOG_FILE = join(OUTPUT_DIR, 'kimi_reasoning_verify.json');

/**
 * PHASE 19 VERIFICATION: Esoteric Reasoning Forge (Kimi)
 * This test confirms that Kimi is correctly prioritized for esoteric tasks 
 * and acts as an escalation forge when cloud operations are stalled.
 */
async function verifyKimiReasoning() {
    console.log('📡 Starting Phase 19 Verification: Kimi Reasoning Forge...');

    const results: any[] = [];
    const config: VibeConfig = {
        pogDir: join(process.cwd(), '.pog'),
        rootStack: [], projectRoot: process.cwd(),
        agentName: 'POG-CODER-VIBE',
        wsPort: 3000,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 60000,
        embeddingDimensions: 768,
        logLevel: 'info',
        projectId: 'test-project',
        enabledServices: ['gemini'],
        gutenbergPath: undefined,
        workspaces: [process.cwd()],
        environment: 'local'
    };

    const router = new FreeModelRouter(config);
    const models = ModelInventory.getAvailableModels();

    // Test 1: Esoteric Intent
    console.log('Test 1: Esoteric Intent Detection...');
    const esotericContext = {
        prompt: "Analyze the metaphysical resonance of the I-Ching logic gate.",
        metadata: { ghostEngagementLevel: -1, isStuck: false },
        weightedTasks: { 'esoteric': 0.9 },
        availableModels: models,
        complexity: 1,
        historicalPerformance: []
    };
    const esotericRes = await (router as any).composite.route(esotericContext);
    results.push({ test: 'Esoteric Intent', model: esotericRes?.model, passed: esotericRes?.model === 'gold_huggingface_kimi' });

    // Test 2: Stuck Escalation
    console.log('Test 2: Cloud-to-Reasoning Escalation (isStuck)...');
    const stuckContext = {
        prompt: "Refactor this complex neural loop.",
        metadata: { ghostEngagementLevel: -1, isStuck: true },
        weightedTasks: { 'refactor': 0.8 },
        availableModels: models,
        complexity: 1,
        historicalPerformance: []
    };
    const stuckRes = await (router as any).composite.route(stuckContext);
    results.push({ test: 'Stuck Escalation', model: stuckRes?.model, passed: stuckRes?.model === 'gold_huggingface_kimi' });

    // Test 3: Ghost Precedence
    console.log('Test 3: Ghost Precedence (Ghost-Master Control)...');
    const ghostContext = {
        prompt: "Emergency shutdown.",
        metadata: { ghostEngagementLevel: 1, isStuck: true },
        weightedTasks: { 'esoteric': 0.9 },
        availableModels: models,
        complexity: 1,
        historicalPerformance: []
    };
    const ghostRes = await (router as any).composite.route(ghostContext);
    results.push({ test: 'Ghost Precedence', model: ghostRes?.model, passed: ghostRes?.model === 'ghost-terminator' });

    fs.writeFileSync(LOG_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        phase: '19',
        results
    }, null, 2));

    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
        console.error('❌ Phase 19 Verification FAILED:', failed);
        process.exit(1);
    }

    console.log(`✅ Phase 19 Verification PASSED. Results saved to: ${LOG_FILE}`);
}

verifyKimiReasoning().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});

