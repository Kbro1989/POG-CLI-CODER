
import { Sandbox } from '../src/sandbox/Sandbox.js';

import { ConfigManager } from '../src/utils/config.js';
import path from 'path';
import fs from 'fs';

// 0. Initialize Real Config (NO MOCKS Law)
const projectRoot = process.cwd();
const configManager = new ConfigManager(projectRoot);
const config = configManager.getConfig();

async function verifySandbox() {
    console.log('📦 Verifying Sandbox Logic...\n');

    const sandbox = new Sandbox(config);
    // Hardened Version: Sandbox now copies 'tests' directory as well
    const testFile = path.join(process.cwd(), 'tests', 'sandbox_test_v2.ts');
    const originalContent = 'export const test = "Original";';

    try {
        // 1. Setup Test File
        fs.writeFileSync(testFile, originalContent);
        console.log(`1. Created test file in tests/: ${testFile}`);

        // 2. Create Snapshot
        const snapshotResult = await sandbox.createSnapshot('Test Snapshot V2');
        if (!snapshotResult.ok) throw new Error(snapshotResult.error?.message);
        const snapshotId = snapshotResult.value;
        console.log(`2. Snapshot created: ${snapshotId}`);

        // 3. Mutate File
        fs.writeFileSync(testFile, 'export const test = "MUTATED";');
        console.log('3. Mutated test file');

        // 4. Verification Check
        if (fs.readFileSync(testFile, 'utf-8') === originalContent) {
            throw new Error('Mutation failed to apply!');
        }

        // 5. Rollback
        console.log('4. Rolling back...');
        const rollbackResult = await sandbox.rollback(snapshotId);
        if (!rollbackResult.ok) throw new Error(rollbackResult.error?.message);

        // 6. Verify Rollback
        const currentContent = fs.readFileSync(testFile, 'utf-8');
        if (currentContent === originalContent) {
            console.log('\n✅ Sandbox Rollback Successful!');
            console.log(`   File content restored: "${currentContent}"`);
        } else {
            console.log('\n❌ Sandbox Rollback Failed!');
            console.log(`   Expected: "${originalContent}"`);
            console.log(`   Actual:   "${currentContent}"`);
        }

    } catch (error: any) {
        console.error(`\n❌ Test Error: ${error.message}`);
    } finally {
        // Cleanup
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
}

verifySandbox().catch(console.error);
