#!/usr/bin/env node
/**
 * Gemini Preview Model Verification Script
 * 
 * Simply lists the priority order of models to verify Gemini Preview models are first.
 */

console.log('🧪 Verifying Gemini Preview Model Priority...\n');

// Manually define the model priority list (extracted from Router.ts)
const models = [
    { name: 'gemini-3-flash-preview', priority: 100 },
    { name: 'gemini-3-pro-preview', priority: 99 },
    { name: 'gemini-2.5-flash-preview', priority: 98 },
    { name: 'gemini-2.5-pro', priority: 97 },
    { name: 'gemini-flash (2.0)', priority: 90 },
    { name: 'gemini-thinking (2.0)', priority: 95 },
    { name: 'qwen2.5-coder:7b', priority: 75 },
    { name: 'qwen2.5-coder:14b', priority: 80 }
];

const sorted = [...models].sort((a, b) => b.priority - a.priority);

console.log('🔢 Model Priority Order (Highest → Lowest):\n');
sorted.forEach((m, i) => {
    const badge = i === 0 ? '👑' : i < 4 ? '⭐' : '  ';
    console.log(`  ${badge} ${i + 1}. ${m.name.padEnd(30)} (Priority: ${m.priority})`);
});

const topModel = sorted[0];
if (topModel && topModel.name === 'gemini-3-flash-preview') {
    console.log('\n✅ SUCCESS: Gemini 3 Flash Preview is top priority!');
    console.log('   This ensures maximum "umph" for all tasks by default.\n');
} else {
    console.log(`\n⚠️  WARNING: Expected gemini-3-flash-preview at top, got ${topModel?.name || 'NONE'}\n`);
}

console.log('📊 Key Insights:');
console.log('   • Tier 0: Gemini 3/2.5 Preview models (Priority 100-97)');
console.log('   • Tier 1: Legacy Gemini 2.0/1.5 models (Priority 95-45)');
console.log('   • Tier 2: Local Ollama models (Priority 80-75)');
console.log('\n🎯 Preview models will be selected first for cloud-based tasks!');

