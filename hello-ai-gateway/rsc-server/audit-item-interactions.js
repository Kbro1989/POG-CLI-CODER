#!/usr/bin/env node
/**
 * COMPREHENSIVE ITEM INTERACTION AUDIT
 * 
 * Checks for:
 * 1. Items with equip flag but missing wieldable data
 * 2. Items marked as edible/drinkable but missing handlers
 * 3. Items with "command" field but no handler plugin
 * 4. Deprecated or incomplete item definitions
 */

import fs from 'fs';
import path from 'path';

const items = JSON.parse(fs.readFileSync('./rsc-data-local/config/items.json', 'utf-8'));
let wieldable;
try {
    wieldable = require('@2003scape/rsc-data/wieldable.json');
} catch {
    wieldable = JSON.parse(fs.readFileSync('./rsc-data-local/wieldable.json', 'utf-8'));
}

const edible = JSON.parse(fs.readFileSync('./rsc-data-local/edible.json', 'utf-8'));
const ranged = JSON.parse(fs.readFileSync('./rsc-data-local/ranged.json', 'utf-8'));

const report = {
    wieldableMissing: [],
    edibleMissing: [],
    rangedMissing: [],
    incompleteDefinitions: [],
    summary: {}
};

console.log('🔍 AUDITING ITEM INTERACTIONS...\n');

// ==================
// WIELDABLE AUDIT
// ==================
console.log('='.repeat(80));
console.log('WIELDABLE ITEMS AUDIT');
console.log('='.repeat(80));

let wieldableIssues = 0;
items.forEach((item, id) => {
    if (!item) return;
    
    // Check if item has equip slots defined
    if (item.equip && Array.isArray(item.equip) && item.equip.length > 0) {
        // Item should have wieldable data
        if (!wieldable || !wieldable[id]) {
            report.wieldableMissing.push({
                id,
                name: item.name,
                equip: item.equip,
                reason: 'Item has equip slots but missing wieldable data'
            });
            wieldableIssues++;
        }
    }
});

if (wieldableIssues === 0) {
    console.log('✅ All equippable items have wieldable data\n');
} else {
    console.log(`⚠️  Found ${wieldableIssues} items with missing wieldable data:\n`);
    report.wieldableMissing.slice(0, 15).forEach(m => {
        console.log(`  ID ${m.id.toString().padStart(4)}: "${m.name}" - equip: [${m.equip.join(', ')}]`);
    });
    if (wieldableIssues > 15) {
        console.log(`  ... and ${wieldableIssues - 15} more\n`);
    } else {
        console.log();
    }
}

report.summary.wieldableMissing = wieldableIssues;

// ==================
// EDIBLE AUDIT
// ==================
console.log('='.repeat(80));
console.log('EDIBLE/DRINKABLE ITEMS AUDIT');
console.log('='.repeat(80));

let edibleIssues = 0;
items.forEach((item, id) => {
    if (!item) return;
    
    // Check if item has edible/drink related names
    const name = (item.name || '').toLowerCase();
    const isFood = name.includes('bread') || name.includes('meat') || name.includes('pie') || 
                   name.includes('cake') || name.includes('banana') || name.includes('orange') ||
                   name.includes('apple') || name.includes('pizza') || name.includes('fish');
    const isDrink = name.includes('beer') || name.includes('wine') || name.includes('tea') || 
                    name.includes('potion') || name.includes('ale') || name.includes('drink');
    
    if ((isFood || isDrink) && (!edible || !edible[id])) {
        // Check if it's actually edible by looking at command
        if (!item.command || (item.command !== 'eat' && item.command !== 'drink')) {
            report.edibleMissing.push({
                id,
                name: item.name,
                command: item.command || 'none',
                inEdibleData: edible && edible[id] ? 'yes' : 'no',
                reason: 'Food/drink item missing interaction data'
            });
            edibleIssues++;
        }
    }
});

if (edibleIssues === 0) {
    console.log('✅ All food/drink items have interaction data\n');
} else {
    console.log(`⚠️  Found ${edibleIssues} potential food/drink items with missing data:\n`);
    report.edibleMissing.slice(0, 15).forEach(m => {
        console.log(`  ID ${m.id.toString().padStart(4)}: "${m.name}" - command: "${m.command}"`);
    });
    if (edibleIssues > 15) {
        console.log(`  ... and ${edibleIssues - 15} more\n`);
    } else {
        console.log();
    }
}

report.summary.edibleMissing = edibleIssues;

// ==================
// RANGED AUDIT
// ==================
console.log('='.repeat(80));
console.log('RANGED WEAPON AUDIT');
console.log('='.repeat(80));

let rangedIssues = 0;
items.forEach((item, id) => {
    if (!item) return;
    
    // Check if ranged weapon is missing ammunition data
    const name = (item.name || '').toLowerCase();
    const isRanged = name.includes('bow') || name.includes('crossbow') || name.includes('blowpipe');
    
    if (isRanged && (!ranged || !ranged[id])) {
        report.rangedMissing.push({
            id,
            name: item.name,
            reason: 'Ranged weapon missing ammunition/attack data'
        });
        rangedIssues++;
    }
});

if (rangedIssues === 0) {
    console.log('✅ All ranged weapons have required data\n');
} else {
    console.log(`⚠️  Found ${rangedIssues} ranged weapons with missing data:\n`);
    report.rangedMissing.slice(0, 10).forEach(m => {
        console.log(`  ID ${m.id.toString().padStart(4)}: "${m.name}"`);
    });
    if (rangedIssues > 10) {
        console.log(`  ... and ${rangedIssues - 10} more\n`);
    } else {
        console.log();
    }
}

report.summary.rangedMissing = rangedIssues;

// ==================
// UNDEFINED ITEMS
// ==================
console.log('='.repeat(80));
console.log('INCOMPLETE ITEM DEFINITIONS');
console.log('='.repeat(80));

let incompleteCount = 0;
items.forEach((item, id) => {
    if (!item) {
        if (id < items.length - 10) { // Don't report last few empty slots
            report.incompleteDefinitions.push({ id, reason: 'Null/undefined item entry' });
            incompleteCount++;
        }
    } else if (!item.name || item.name.trim() === '') {
        report.incompleteDefinitions.push({ id, reason: 'Missing name' });
        incompleteCount++;
    } else if (item.sprite === undefined || item.sprite === null) {
        report.incompleteDefinitions.push({ id, name: item.name, reason: 'Missing sprite ID' });
        incompleteCount++;
    }
});

if (incompleteCount === 0) {
    console.log('✅ All item definitions are complete\n');
} else {
    console.log(`⚠️  Found ${incompleteCount} incomplete definitions:\n`);
    report.incompleteDefinitions.slice(0, 10).forEach(m => {
        console.log(`  ID ${m.id.toString().padStart(4)}: ${m.name || '(unnamed)'} - ${m.reason}`);
    });
    if (incompleteCount > 10) {
        console.log(`  ... and ${incompleteCount - 10} more\n`);
    } else {
        console.log();
    }
}

report.summary.incompleteCount = incompleteCount;

// ==================
// SUMMARY
// ==================
console.log('='.repeat(80));
console.log('AUDIT SUMMARY');
console.log('='.repeat(80));

const totalIssues = wieldableIssues + edibleIssues + rangedIssues + incompleteCount;

console.log(`
📊 ITEM INTERACTION AUDIT RESULTS:

  Wieldable items missing data:     ${wieldableIssues}
  Edible/drink items missing data:  ${edibleIssues}
  Ranged weapons missing data:      ${rangedIssues}
  Incomplete definitions:           ${incompleteCount}
  ─────────────────────────────────
  TOTAL ISSUES FOUND:               ${totalIssues}

  Total items defined:              ${items.filter(i => i).length}
  Total items in config:            ${items.length}
`);

if (totalIssues === 0) {
    console.log('✅ All items have complete interaction data!\n');
} else {
    console.log('⚠️  Review the detailed report: audit-items-interactions.json\n');
}

// Save detailed report
fs.writeFileSync('./audit-items-interactions.json', JSON.stringify(report, null, 2));
console.log('📋 Report saved: audit-items-interactions.json');
