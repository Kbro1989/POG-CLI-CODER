
import { VectorDB } from '../src/learning/VectorDB.js';
import { CodebaseIndexer } from '../src/learning/CodebaseIndexer.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { VibeConfig } from '../src/core/models.js';
import { join } from 'path';
import pino from 'pino';

// Simple logger setup
const logger = pino({
    name: 'ReferenceIndexer',
    transport: {
        target: 'pino-pretty'
    }
});

async function main() {
    const config: VibeConfig = {
        pogDir: join(process.cwd(), '.pog-coder-vibe'),
        projectId: 'global',
        // other required config mocks
        cloudflareAccountId: '',
        cloudflareApiToken: '',
        googleApiKey: process.env.GOOGLE_API_KEY
    };

    const vectorDB = new VectorDB(config);
    await vectorDB.initialize();

    // Initialize Gemini for embeddings if key is present
    let gemini: GeminiService | undefined;
    if (process.env.GOOGLE_API_KEY) {
        gemini = new GeminiService(process.env.GOOGLE_API_KEY);
        logger.info('Gemini Service initialized for embeddings');
    }

    const referenceDir = join(process.cwd(), 'src', 'references');
    logger.info({ referenceDir }, 'Indexing References');

    const indexer = new CodebaseIndexer(vectorDB, gemini, referenceDir);

    // We want to index specifically the 'external_patterns' but pointing to 'src/references' covers it.
    // The indexer respects .gitignore, but we should clear the ignore filter for this specific run definition if needed, 
    // or just rely on the fact that src/references is mostly new code.

    // We need to make sure the Indexer doesn't think 500kb files are too big if we copied huge chunks, 
    // but the default limit is 500KB which is generous for code.

    const result = await indexer.indexProject();
    logger.info({ result }, 'Indexing Complete');

    await vectorDB.close();
}

main().catch(err => {
    logger.error({ err }, 'Fatal error');
    process.exit(1);
});
