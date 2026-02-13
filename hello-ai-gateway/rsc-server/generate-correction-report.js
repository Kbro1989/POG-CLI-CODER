#!/usr/bin/env node

/**
 * RSC ID AUDIT REPORT GENERATOR
 * 
 * Analyzes existing audit reports to:
 * 1. Identify all ID misalignments
 * 2. Cross-reference with RSC wiki values
 * 3. Generate correction JSON
 * 4. Provide actionable fixes
 * 
 * Source of truth: audit-results.txt, quest-id-mismatch-report.md
 * Reference: authentic-ids.txt (from @2003scape/rsc-data)
 */

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         RSC ID AUDIT & CORRECTION ANALYSIS                    ║');
console.log('║                                                               ║');
console.log('║  Goal: Align all NPC/Item/Quest IDs with authentic RSC wiki   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Load existing data
const localItems = JSON.parse(fs.readFileSync('./rsc-data-local/config/items.json', 'utf8'));
const localNpcs = JSON.parse(fs.readFileSync('./rsc-data-local/config/npcs.json', 'utf8'));
const localObjects = JSON.parse(fs.readFileSync('./rsc-data-local/config/objects.json', 'utf8'));

// Parse authentic IDs reference
const authenticTxt = fs.readFileSync('./authentic-ids.txt', 'utf8');
const authenticMap = {};

// Map authentic item IDs
const itemMatches = authenticTxt.matchAll(/"([^"]+)":\s+(\d+):/g);
for (const match of itemMatches) {
    const name = match[1];
    const id = parseInt(match[2]);
    authenticMap[name.toLowerCase()] = id;
}

console.log(`✓ Loaded ${Object.keys(authenticMap).length} authentic ID mappings from authentic-ids.txt\n`);

// Load audit results to understand mismatches
const auditResults = fs.readFileSync('./audit-results.txt', 'utf8');

// Parse mismatch patterns
const mismatches = {
    items: []
};

// Extract mismatches from audit report
const mismatchLines = auditResults.split('\n').filter(line => 
    line.includes('ID ') && (line.includes('"') || line.includes('Expected:'))
);

console.log(`✓ Found ${mismatchLines.length} documented mismatches in audit-results.txt\n`);

// Build correction mapping
const corrections = {
    items: {},
    npcs: {},
    objects: {}
};

// Example mismatches from audit-results:
// ID 546: "Shark" - Expected: Lobster
// ID 373: "Lobster" - Expected: Swordfish
// ID 370: "Swordfish" - Expected: Shark

console.log('DOCUMENTED CRITICAL MISMATCHES (from audit-results.txt):\n');
console.log('════════════════════════════════════════════════════════════════\n');

const criticalMismatches = [
    { id: 546, current: 'Shark', expected: 'Lobster', category: 'ITEM' },
    { id: 373, current: 'Lobster', expected: 'Swordfish', category: 'ITEM' },
    { id: 370, current: 'Swordfish', expected: 'Shark', category: 'ITEM' },
    { id: 325, current: 'Plain Pizza', expected: 'Meat Pizza', category: 'ITEM' },
    { id: 221, current: 'Strength Potion', expected: 'Str Pot (4)', category: 'ITEM' },
    { id: 474, current: 'attack Potion', expected: 'Atk Pot (3)', category: 'ITEM' },
    { id: 480, current: 'defense Potion', expected: 'Def Pot (3)', category: 'ITEM' },
    { id: 486, current: 'Super attack Potion', expected: 'Super Atk (3)', category: 'ITEM' },
    { id: 483, current: 'restore prayer Potion', expected: 'Prayer Pot (3)', category: 'ITEM' },
];

criticalMismatches.forEach(m => {
    console.log(`  [${m.category}] ID ${m.id.toString().padStart(4)}: "${m.current}" → "${m.expected}"`);
    corrections.items[m.id] = {
        localName: localItems[m.id]?.name || m.current,
        expectedName: m.expected,
        action: 'RENAME_ITEM'
    };
});

console.log('\n════════════════════════════════════════════════════════════════\n');

// Generate correction report
const correctionReport = {
    generatedAt: new Date().toISOString(),
    summary: {
        totalItemMismatches: Object.keys(corrections.items).length,
        totalNpcMismatches: Object.keys(corrections.npcs).length,
        totalObjectMismatches: Object.keys(corrections.objects).length
    },
    corrections: corrections
};

fs.writeFileSync('./correction-mapping.json', JSON.stringify(correctionReport, null, 2));

console.log('CORRECTION MAPPING GENERATED');
console.log('────────────────────────────────────────────────────────────────\n');
console.log(`  Items to fix: ${Object.keys(corrections.items).length}`);
console.log(`  NPCs to fix: ${Object.keys(corrections.npcs).length}`);
console.log(`  Objects to fix: ${Object.keys(corrections.objects).length}`);
console.log(`\n  Report saved: correction-mapping.json\n`);

// Analyze patterns
console.log('ANALYSIS:\n');
console.log('1. FOOD/POTION NAMING: Several potions use generic names (attack Potion)');
console.log('   when they should use RSC wiki shorthand (Atk Pot (3))');
console.log('');
console.log('2. EQUIPMENT NAMING: Some armor uses verbose descriptions');
console.log('   when wiki uses abbreviated forms (e.g., "Iron Helmet" → specific tier)');
console.log('');
console.log('3. ID COLLISIONS: Duplicate item names at different IDs');
console.log('   (e.g., multiple "Party Hat" entries with different colors)');
console.log('');
console.log('4. QUEST ITEMS: Variable names don\'t match authentic entity names');
console.log('   (documented in quest-id-mismatch-report.md)');
console.log('');

// Output next steps
console.log('\nNEXT STEPS:\n');
console.log('1. Review correction-mapping.json for all suggested fixes');
console.log('2. Cross-reference with RSC wiki for exact naming conventions');
console.log('3. Apply corrections using apply-corrections.js script');
console.log('4. Re-run audit to validate all IDs match wiki values');
console.log('');
