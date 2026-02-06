/**
 * Unit tests for DashboardLimb
 * Verifies intent handling and asset generation.
 * 
 * STRICT REALISM: Dependencies are real, rooted in a temp dir.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DashboardLimb } from '../src/limbs/core/DashboardLimb.js';
import { PreviewServer } from '../src/core/PreviewServer.js';
import { ConfigManager } from '../src/utils/config.js';
import { VibeConfig } from '../src/core/models.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('DashboardLimb (Real Integration)', () => {
    let dashboard: DashboardLimb;
    let previewServer: PreviewServer;
    let testDir: string;
    let config: VibeConfig;

    beforeEach(() => {
        testDir = join(tmpdir(), 'pog-dash-test-' + Date.now());
        mkdirSync(testDir, { recursive: true });

        const configManager = new ConfigManager(testDir, {
            pogDir: join(testDir, '.pog'),
            projectRoot: testDir,
            projectId: 'TEST_DASH',
            wsPort: 0,
            enabledServices: ['neural', 'hexagram', 'gutenberg']
        });

        config = configManager.getConfig();
        mkdirSync(config.pogDir, { recursive: true });

        previewServer = new PreviewServer();
        dashboard = new DashboardLimb(config, previewServer);
    });

    afterEach(async () => {
        await previewServer.stopAll();
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch { }
    });

    it('should identify dashboard intents correctly', async () => {
        expect(await dashboard.canHandle({ prompt: 'show dashboard' })).toBe(true);
        expect(await dashboard.canHandle({ prompt: 'open UI' })).toBe(true);
        expect(await dashboard.canHandle({ prompt: 'start the dashboard interface' })).toBe(true);
        expect(await dashboard.canHandle({ prompt: 'fix some code' })).toBe(false);
    });

    it('should generate HTML, CSS, and JS assets on activation', async () => {
        const result = await dashboard.activate();

        expect(result.ok).toBe(true);
        if (result.ok) {
            // Check the output message mentions activation
            expect(result.value.output).toContain('Dashboard activated');

            // Verify files were created in the expected location
            const dashboardDir = join(config.pogDir, 'session_dashboards', config.projectId);
            expect(existsSync(join(dashboardDir, 'index.html'))).toBe(true);
            expect(existsSync(join(dashboardDir, 'styles.css'))).toBe(true);
            expect(existsSync(join(dashboardDir, 'main.js'))).toBe(true);
        }
    });
});
