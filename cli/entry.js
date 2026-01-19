#!/usr/bin/env node

/**
 * POG-CODER-VIBE Thin Wrapper ESM Entry Point
 * 
 * Implements native ESM polyfills for Node.js 20+ compatibility.
 * Resolves pathing issues for worker threads and native bindings.
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 1. Initialize Polyfills
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure global compatibility for bundled CJS dependencies
globalThis.require = require;
globalThis.__filename = __filename;
globalThis.__dirname = __dirname;

// 2. Fix Worker Pathing
// Bundled worker threads often fail to resolve relative to process.cwd()
// We force resolution relative to the distribution folder.
process.env['VIBE_DIST_ROOT'] = __dirname;

// 3. Execution Logic
async function bootstrap() {
    try {
        // Dynamic import of the bundled CLI logic (relative to dist/ root as defined in env)
        const { main } = await import('../dist/cli.js');

        if (typeof main !== 'function') {
            throw new Error('Fatal: Bundled CLI does not export a main function.');
        }

        await main(process.argv);
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'POG-CODER-VIBE Critical Failure:');
        if (error instanceof Error) {
            console.error(error.stack);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

// Execute with ternary exit handling if required by project standards
bootstrap().catch(() => process.exit(1));
