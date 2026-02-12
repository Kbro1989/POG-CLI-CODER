
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { CloudflareServices } from '../../services/CloudflareServices.js';
import { CloudflarePipeline } from './Pipeline.js';
import pino from 'pino';
import { VectorDB } from '../../learning/VectorDB.js';
import { HexagramManager } from '../../core/HexagramManager.js';

const logger = pino({ name: 'CloudflareCLI', level: 'info', transport: { target: 'pino-pretty' } });

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Initialize Sovereign Memory (Soul State)
    const config = {
        pogDir: process.env['POG_DIR'] || './.pog',
        projectRoot: process.cwd(),
        projectId: 'cloudflare-cli'
    };
    const vectorDB = new VectorDB(config as any);
    const hexManager = new HexagramManager(vectorDB, config.projectId);
    await hexManager.initialize();

    // Auto-detect credentials from env
    const services = new CloudflareServices({
        accountId: process.env['CLOUDFLARE_ACCOUNT_ID'] || '',
        apiToken: process.env['CLOUDFLARE_API_TOKEN'] || process.env['CLOUDFLARE_API_KEY'] || '',
        authEmail: process.env['CLOUDFLARE_EMAIL'] || '',
        gatewayUrl: process.env['CLOUDFLARE_GATEWAY_URL'] || '',
        bindingUrl: process.env['CLOUDFLARE_BINDING_URL'] || '',
        hexagramManager: hexManager
    });

    // Ensure auth
    const auth = await services.auditAbilities();
    if (!auth.ok) {
        logger.error({ error: auth.error.message }, 'Authentication failed');
        process.exit(1);
    }

    switch (command) {
        case 'health':
            const statusMap: Record<number, string> = {
                1: 'GLOBAL_OAUTH (Sovereign Tier)',
                0: 'TOKEN_AUTH (Standard Tier)',
                [-1]: 'UNAUTHORIZED (Critical Failure)'
            };

            // Get Soul State Interpretation
            const soulState = hexManager.getInterpretation();

            logger.info({
                accountId: auth.value.accountId,
                status: statusMap[auth.value.status] || 'UNKNOWN',
                archetype: soulState.name,
                directive: soulState.strategy
            }, 'Cloudflare Connectivity & Soul State Verified');
            break;

        case 'gen-image':
            const prompt = args[1];
            if (!prompt) {
                logger.error('Usage: gen-image <prompt>');
                process.exit(1);
            }
            logger.info({ prompt }, 'Generating image...');
            const result = await services.runAi('@cf/stabilityai/stable-diffusion-xl-base-1.0', { prompt });
            if (result.ok) {
                logger.info('Image generated successfully (Buffer received)');
                // In a real CLI we might write to file
                const fs = await import('fs');
                fs.writeFileSync(`output_${Date.now()}.png`, result.value);
                logger.info('Saved to current directory.');
            } else {
                logger.error('Generation failed');
                console.error('Raw Error:', result.error);
                if (result.error instanceof Error) {
                    console.error('Message:', result.error.message);
                    console.error('Stack:', result.error.stack);
                }
            }
            break;

        case 'pipeline':
            const task = args[1];
            if (!task) {
                logger.error('Usage: pipeline <task>');
                process.exit(1);
            }
            const pipeline = new CloudflarePipeline(services);
            logger.info({ task }, 'Running pipeline...');
            const pResult = await pipeline.execute(task);
            if (pResult.ok) {
                logger.info({ result: pResult.value }, 'Pipeline complete');
            } else {
                logger.error({ error: pResult.error }, 'Pipeline failed');
            }
            break;

        default:
            console.log(`
Cloudflare Limb CLI
===================
Commands:
  health                 Check connection status
  gen-image <prompt>     Generate an image
  pipeline <task>        Run a creative pipeline
`);
            break;
    }
}

main().catch(console.error);
