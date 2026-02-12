
import { GutenbergLimb } from '../src/limbs/gutenberg/GutenbergLimb.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { VibeConfig } from '../src/core/models.js';
import * as dotenv from 'dotenv';


// Load environment variables
dotenv.config();

async function main() {
    console.log('🧪 Starting RAG Verification...');

    const apiKey = process.env['GOOGLE_API_KEY'];
    if (!apiKey) {
        console.error('❌ GOOGLE_API_KEY not found');
        process.exit(1);
    }

    // Initialize Services
    const gemini = new GeminiService(apiKey);
    const vectorDB = new VectorDB({} as VibeConfig); // Config not needed for DB init
    await vectorDB.initialize();

    // Fix: Correct constructor argument order
    // constructor(config, vectorDB?, gemini?, modelExecutor?)
    const limb = new GutenbergLimb({} as VibeConfig, vectorDB, gemini, undefined);

    // 1. Ingest Alice in Wonderland (ID 11)
    console.log('\n📚 Ingesting Book 11 (Alice in Wonderland)...');

    try {
        // Use type assertion to access private method for testing
        const ingestResult = await (limb as any).ingestBookIntoMemory(11);
        if (!ingestResult.ok) throw ingestResult.error;
        console.log('✅ Ingestion Complete');
    } catch (error) {
        console.error('❌ Ingestion Failed:', error);
        process.exit(1);
    }

    // 2. Query
    console.log('\n🔍 Querying: "How does the Queen of Hearts speak?"');
    const query = "How does the Queen of Hearts speak?";

    try {
        const contextResult = await (limb as any).retrieveLiteraryContext(query);
        if (!contextResult.ok) throw contextResult.error;

        console.log('\n📄 Retrieved Context:');
        if (Array.isArray(contextResult.value)) {
            contextResult.value.forEach((chunk: string, i: number) => {
                console.log(`\n--- Chunk ${i + 1} ---`);
                console.log(chunk.substring(0, 200) + '...');
            });
        } else {
            console.log(contextResult.value);
        }

        console.log('\n✅ Verification Successful');
    } catch (error) {
        console.error('❌ Query Failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
