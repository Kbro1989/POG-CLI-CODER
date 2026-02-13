import * as fs from 'fs';
import { join } from 'path';
import { CloudflareServices } from '../../services/CloudflareServices.js';
import { Result } from '../../core/models.js';
import pino from 'pino';

const logger = pino({ name: 'GlobeForge' });

/**
 * GlobeForge - Scaffolds and configures multiplayer globe projects.
 */
export class GlobeForge {
    constructor(private readonly services: CloudflareServices) { }

    /**
     * Forge a new multiplayer globe project.
     * @param targetDir The directory to scaffold the project into.
     * @param templateDir The source template directory.
     */
    async forge(targetDir: string, templateDir: string): Promise<Result<{ path: string; wranglerJson: string }>> {
        logger.info({ targetDir, templateDir }, 'Starting Globe Forge operation');

        try {
            if (!fs.existsSync(templateDir)) {
                return { ok: false, error: new Error(`Template directory not found: ${templateDir}`) };
            }

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // 1. Recursive Copy (Deep Scaffolding)
            this.copyRecursiveSync(templateDir, targetDir);

            // 2. Credential Match Replacements (wrangler.json)
            const wranglerPath = join(targetDir, 'wrangler.json');
            if (fs.existsSync(wranglerPath)) {
                let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');

                const accountId = this.services.getAccountId() || 'YOUR_ACCOUNT_ID';
                const compatibilityDate = new Date().toISOString().split('T')[0];

                // Inject credentials and sync name
                const projectName = targetDir.split(/[\\/]/).pop() || 'multiplayer-globe';

                const wrangler = JSON.parse(wranglerContent) as Record<string, unknown>;
                wrangler['name'] = projectName;
                wrangler['compatibility_date'] = compatibilityDate;
                wrangler['account_id'] = accountId;

                wranglerContent = JSON.stringify(wrangler, null, 2);
                fs.writeFileSync(wranglerPath, wranglerContent);

                // 3. GPS Injection (Sovereign Context)
                const gpsDir = join(targetDir, 'src');
                if (!fs.existsSync(gpsDir)) fs.mkdirSync(gpsDir, { recursive: true });

                const gpsPath = join(gpsDir, 'gps.json');
                const gpsData = {
                    lat: 34.0522, // Default: Los Angeles (The Forge)
                    lng: -118.2437,
                    timestamp: new Date().toISOString(),
                    origin: 'POG-CODER-VIBE'
                };
                fs.writeFileSync(gpsPath, JSON.stringify(gpsData, null, 2));

                logger.info({ projectName, wranglerPath, gpsPath }, 'Globe Forge complete');

                return {
                    ok: true,
                    value: {
                        path: targetDir,
                        wranglerJson: wranglerContent
                    }
                };
            } else {
                return { ok: false, error: new Error(`wrangler.json not found in scaffolded project at ${wranglerPath}`) };
            }
        } catch (error) {
            logger.error({ error }, 'Globe Forge failed during scaffolding');
            return { ok: false, error: error as Error };
        }
    }

    private copyRecursiveSync(src: string, dest: string) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(child => {
                if (child === 'node_modules' || child === 'dist' || child === '.wrangler') return;
                this.copyRecursiveSync(join(src, child), join(dest, child));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    }
}
