import * as fs from 'node:fs/promises';
import pino from 'pino';
import { Result } from '../core/models.js';

const logger = pino({
    name: 'ReadManyFiles',
    base: { hostname: 'POG-VIBE' }
});

export interface FileContent {
    path: string;
    content: string;
}

/**
 * ReadManyFiles - Optimization for reading multiple files in a single turn.
 */
export async function readManyFiles(paths: string[]): Promise<Result<FileContent[]>> {
    try {
        const results: FileContent[] = [];
        for (const path of paths) {
            try {
                const content = await fs.readFile(path, 'utf8');
                results.push({ path, content });
            } catch (err) {
                logger.warn({ path, error: err }, 'Failed to read individual file in batch');
                // We continue reading others even if one fails
            }
        }
        return { ok: true, value: results };
    } catch (error) {
        logger.error({ error }, 'Batch read failed');
        return { ok: false, error: error as Error };
    }
}
