
import { ModelInventory } from '../src/core/ModelInventory.js';
import { VibeConfig } from '../src/core/models.js';

// Mock Config from .env
const mockConfig: Partial<VibeConfig> = {
    planningModel: 'qwen2.5-coder:14b-instruct-q5_K_M',
    monitorModel: 'tinyllama:latest'
};

console.log('🧪 Verifying Model Inventory Priority...');

const models = ModelInventory.getAvailableModels(mockConfig as VibeConfig);

const planning = models.find(m => m.name === mockConfig.planningModel);
const monitor = models.find(m => m.name === mockConfig.monitorModel);
const other = models.find(m => m.name.includes('llama-3.1'));

console.log(`\nPlanning Model (${planning?.name}): Priority ${planning?.priority} (Expected 110)`);
console.log(`Monitor Model  (${monitor?.name}):  Priority ${monitor?.priority}  (Expected 110)`);
console.log(`Other Model    (${other?.name}):    Priority ${other?.priority}   (Expected 50-90)`);

if (planning?.priority === 110 && monitor?.priority === 110 && (other?.priority || 0) < 100) {
    console.log('\n✅ SUCCESS: .env models are prioritized correctly!');
} else {
    console.error('\n❌ FAILURE: Priority logic mismatch.');
}

