import { ConfigManager } from './src/utils/config.js';
import { FreeOrchestrator } from './src/core/Orchestrator.js';
import { ASTWatcher } from './src/watcher/ASTWatcher.js';
import { VectorDB } from './src/learning/VectorDB.js';
import { Sandbox } from './src/sandbox/Sandbox.js';
import pino from 'pino';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const logger = pino({ name: 'TestRun' });

/**
 * Simple .env loader
 */
function loadEnv() {
  if (existsSync('.env')) {
    const content = readFileSync('.env', 'utf-8');
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

async function runTest() {
  loadEnv();
  
  const projectRoot = process.cwd();
  const configManager = new ConfigManager(projectRoot, {
    logLevel: 'debug'
  });
  const config = configManager.getConfig();

  const watcher = new ASTWatcher(config);
  const vectorDB = new VectorDB(config);
  const sandbox = new Sandbox(config);

  const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

  logger.info('Initializing system...');
  const initResult = await orchestrator.initialize();
  if (!initResult.ok) {
    logger.error({ error: initResult.error.message }, 'Initialization failed');
    process.exit(1);
  }

  // Define models to test
  const models = [
    'qwen2.5-coder:14b-instruct-q5_K_M',
    'yi-coder:9b-chat-q5_K_M',
    'qwen2.5-coder:7b-instruct-q4_K_M',
    'deepseek-coder:33b-instruct-q4_K_M',
    'gemini-free'
  ];

  logger.info('Starting model verification sequence...');

  for (const model of models) {
    logger.info(`\n----------------------------------------`);
    logger.info(`TESTING MODEL: ${model}`);
    logger.info(`----------------------------------------`);
    
    // Force router to use this model
    (orchestrator as any).router.route = () => ({ ok: true, value: model });

    const prompt = `Hello ${model}, please respond with a short verification message confirming your identity.`;
    
    try {
      const result = await orchestrator.executeIntent(prompt);
      
      if (result.ok) {
        logger.info(`✅ ${model} SUCCESS`);
        console.log(`\nRESPONSE from ${model}:`);
        console.log(result.value.trim());
        console.log('----------------------------------------\n');
      } else {
        logger.error(`❌ ${model} FAILED: ${result.error.message}`);
      }
    } catch (err) {
       logger.error(`❌ ${model} EXCEPTION: ${err}`);
    }
  }

  logger.info('Test sequence completed.');
  await orchestrator.cleanup();
  await vectorDB.close();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
