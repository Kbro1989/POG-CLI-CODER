#!/usr/bin/env node

/**
 * COMPREHENSIVE AUDIT: Local RSC Data vs @2003scape/rsc-data
 * 
 * Compares:
 * - Local JSON config files (npcs.json, items.json, objects.json)
 * - Against official @2003scape/rsc-data reference
 * - Identifies ID misalignments and name mismatches
 * 
 * Goal: Validate all IDs match RSC wiki values (as preserved in 2003scape)
 */

const fs = require('fs');
const path = require('path');

// Load reference data from @2003scape upstream (simulated from audit reports)
// For a real fix, we need to compare against known RSC wiki values
let rscDataNpcs, rscDataItems, rscDataObjects;

try {
    // Try to load from node_modules first
    rscDataNpcs = require('@2003scape/rsc-data/config/npcs');
    rscDataItems = require('@2003scape/rsc-data/config/items');
    rscDataObjects = require('@2003scape/rsc-data/config/objects');
} catch (err) {
    console.warn('⚠ Could not load @2003scape/rsc-data from npm');
    console.log('Will use RSC wiki reference values instead...\n');
    
    // Use RSC wiki reference mappings (from authentic-ids.txt and quest audit)
    // These are documented in audit reports as the "expected" values
    // Loading from local reference JSON if available
    try {
        const refPath = './rsc-wiki-reference.json';
        if (fs.existsSync(refPath)) {
            const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
            rscDataNpcs = ref.npcs || [];
            rscDataItems = ref.items || [];
            rscDataObjects = ref.objects || [];
        } else {
            throw new Error('No reference data available');
        }
    } catch {
        console.error('ERROR: Could not load RSC wiki reference data');
        console.error('Create rsc-wiki-reference.json with authentic RSC ID mappings');
        process.exit(1);
    }
}

const localNpcs = JSON.parse(fs.readFileSync('./rsc-data-local/config/npcs.json', 'utf8'));
const localItems = JSON.parse(fs.readFileSync('./rsc-data-local/config/items.json', 'utf8'));
const localObjects = JSON.parse(fs.readFileSync('./rsc-data-local/config/objects.json', 'utf8'));

const report = {
    npcs: { mismatches: [], outOfRange: [] },
    items: { mismatches: [], outOfRange: [] },
    objects: { mismatches: [], outOfRange: [] }
};

// ====================
// NPC AUDIT
// ====================
console.log('\n=== AUDITING NPCs ===');
console.log(`Local: ${localNpcs.length} NPCs | Reference: ${rscDataNpcs.length} NPCs\n`);

for (let id = 0; id < localNpcs.length; id++) {
    const local = localNpcs[id];
    
    if (id >= rscDataNpcs.length) {
        report.npcs.outOfRange.push({
            id,
            localName: local?.name || 'UNKNOWN',
            reason: 'ID exceeds reference data range'
        });
        continue;
    }
    
    const reference = rscDataNpcs[id];
    
    // Check if name matches (case-insensitive, basic normalization)
    const localNameNorm = (local?.name || '').toLowerCase().trim();
    const refNameNorm = (reference?.name || '').toLowerCase().trim();
    
    if (localNameNorm !== refNameNorm) {
        report.npcs.mismatches.push({
            id,
            localName: local?.name || 'UNKNOWN',
            referenceName: reference?.name || 'UNKNOWN',
            type: 'NAME_MISMATCH'
        });
    }
}

// ====================
// ITEM AUDIT
// ====================
console.log('=== AUDITING ITEMS ===');
console.log(`Local: ${localItems.length} Items | Reference: ${rscDataItems.length} Items\n`);

for (let id = 0; id < localItems.length; id++) {
    const local = localItems[id];
    
    if (id >= rscDataItems.length) {
        report.items.outOfRange.push({
            id,
            localName: local?.name || 'UNKNOWN',
            reason: 'ID exceeds reference data range'
        });
        continue;
    }
    
    const reference = rscDataItems[id];
    
    const localNameNorm = (local?.name || '').toLowerCase().trim();
    const refNameNorm = (reference?.name || '').toLowerCase().trim();
    
    if (localNameNorm !== refNameNorm) {
        report.items.mismatches.push({
            id,
            localName: local?.name || 'UNKNOWN',
            referenceName: reference?.name || 'UNKNOWN',
            type: 'NAME_MISMATCH'
        });
    }
}

// ====================
// OBJECT AUDIT
// ====================
console.log('=== AUDITING OBJECTS ===');
console.log(`Local: ${localObjects.length} Objects | Reference: ${rscDataObjects.length} Objects\n`);

for (let id = 0; id < localObjects.length; id++) {
    const local = localObjects[id];
    
    if (id >= rscDataObjects.length) {
        report.objects.outOfRange.push({
            id,
            localName: local?.name || 'UNKNOWN',
            reason: 'ID exceeds reference data range'
        });
        continue;
    }
    
    const reference = rscDataObjects[id];
    
    const localNameNorm = (local?.name || '').toLowerCase().trim();
    const refNameNorm = (reference?.name || '').toLowerCase().trim();
    
    if (localNameNorm !== refNameNorm) {
        report.objects.mismatches.push({
            id,
            localName: local?.name || 'UNKNOWN',
            referenceName: reference?.name || 'UNKNOWN',
            type: 'NAME_MISMATCH'
        });
    }
}

// ====================
// REPORT
// ====================
console.log('\n========== COMPREHENSIVE AUDIT REPORT ==========\n');

// Summary
const totalMismatches = report.npcs.mismatches.length + report.items.mismatches.length + report.objects.mismatches.length;
const totalOutOfRange = report.npcs.outOfRange.length + report.items.outOfRange.length + report.objects.outOfRange.length;

console.log(`SUMMARY:`);
console.log(`  NPCs: ${report.npcs.mismatches.length} mismatches, ${report.npcs.outOfRange.length} out of range`);
console.log(`  Items: ${report.items.mismatches.length} mismatches, ${report.items.outOfRange.length} out of range`);
console.log(`  Objects: ${report.objects.mismatches.length} mismatches, ${report.objects.outOfRange.length} out of range`);
console.log(`\n  TOTAL: ${totalMismatches} mismatches, ${totalOutOfRange} out of range\n`);

// Show first 50 critical mismatches
const allMismatches = [
    ...report.npcs.mismatches.map(m => ({ ...m, category: 'NPC' })),
    ...report.items.mismatches.map(m => ({ ...m, category: 'ITEM' })),
    ...report.objects.mismatches.map(m => ({ ...m, category: 'OBJECT' }))
].sort((a, b) => a.id - b.id);

console.log('CRITICAL MISMATCHES (First 50):');
console.log('────────────────────────────────────────────────────────');
allMismatches.slice(0, 50).forEach(m => {
    console.log(`  [${m.category}] ID ${m.id.toString().padStart(4)}: "${m.localName}" → "${m.referenceName}"`);
});

if (allMismatches.length > 50) {
    console.log(`  ... and ${allMismatches.length - 50} more mismatches\n`);
}

// Out of range items
if (totalOutOfRange > 0) {
    console.log('\nOUT OF RANGE (Beyond reference data):');
    console.log('────────────────────────────────────────────────────────');
    [...report.npcs.outOfRange, ...report.items.outOfRange, ...report.objects.outOfRange]
        .sort((a, b) => a.id - b.id)
        .slice(0, 20)
        .forEach(m => {
            console.log(`  ID ${m.id}: "${m.localName}"`);
        });
}

// Save detailed report
fs.writeFileSync('./audit-2023scape-detailed.json', JSON.stringify(report, null, 2));
console.log('\nDetailed report saved to: audit-2023scape-detailed.json');
console.log(`Total entries checked: ${localNpcs.length + localItems.length + localObjects.length}`);
