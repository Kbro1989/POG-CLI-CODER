import { HexagramManager, YaoState } from './src/core/HexagramManager.js';
import { VectorDB } from './src/learning/VectorDB.js';
import { VibeConfig } from './src/core/models.js';
import pino from 'pino';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { homedir } from 'os';

dotenv.config();

const config: VibeConfig = {
    agentName: 'HEX-CHECK',
    projectRoot: process.cwd(),
    pogDir: join(homedir(), '.pog-coder-vibe'),
    wsPort: 9999,
    maxSnapshotAge: 3600,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldown: 60000,
    embeddingDimensions: 768,
    logLevel: 'info'
};

const logger = pino();

async function verify() {
    const db = new VectorDB(config);
    await db.initialize();

    const manager = new HexagramManager(db);

    console.log('--- Phase 5: Hexagram Verification ---');

    // 1. Pin a card
    console.log('Action: Pinning "Core Performance Pillars" to Line 1 (Foundation)');
    const pinResult = await manager.pinCard(
        1,
        'Core Performance Pillars',
        'Zero technical debt, O(1) lookups for core registries, and aggressive tree-shaking.',
        YaoState.YoungYang
    );

    if (!pinResult.ok) {
        console.error('FAILED: Could not pin card', pinResult.error);
        process.exit(1);
    }
    console.log('SUCCESS: Card pinned.');

    // 2. Set the Transition line to "Moving"
    console.log('Action: Setting Line 3 (Transition) to Old Yang (Moving)');
    await manager.pinCard(3, 'Phase 5: Esoteric Memory', 'Migrating context slots to hexagram-sharded persistence.', YaoState.OldYang);

    // 3. Verify format
    console.log('\n--- Formatted Prompt Output ---');
    const prompt = await manager.formatForPrompt();
    console.log(prompt);

    // 4. Verify interpretation logic
    if (prompt.includes('Future Hexagram')) {
        console.log('SUCCESS: Moving line logic detected and future hexagram calculated.');
    } else {
        console.error('FAILED: Moving line logic not triggered.');
        process.exit(1);
    }

    console.log('\nVERIFICATION COMPLETE: Phase 5 is operational.');
}

verify().catch(console.error);
