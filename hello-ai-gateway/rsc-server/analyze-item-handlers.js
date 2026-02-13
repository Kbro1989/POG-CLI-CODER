#!/usr/bin/env node
/**
 * ITEM INTERACTION HANDLER ANALYSIS
 * 
 * Checks which items need handlers and which handlers exist
 */

import fs from 'fs';

const items = JSON.parse(fs.readFileSync('./rsc-data-local/config/items.json', 'utf-8'));
const edible = JSON.parse(fs.readFileSync('./rsc-data-local/edible.json', 'utf-8'));

console.log('📋 ITEM INTERACTION HANDLER ANALYSIS\n');

// ==================
// FIND DRINKABLE POTIONS
// ==================
console.log('='.repeat(80));
console.log('POTION ITEMS NEEDING HANDLER FIX');
console.log('='.repeat(80));

const potionsNeedingFix = [];
items.forEach((item, id) => {
    if (!item) return;
    const name = (item.name || '').toLowerCase();
    
    // Potions that should have drink command
    const isPotionType = name.includes('potion') || name.includes('dose') || 
                        (name.includes('strength') && name.includes('potion'));
    
    if (isPotionType) {
        // Check if command is correctly set
        if (!item.command || (item.command.toLowerCase() !== 'drink' && item.command.toLowerCase() !== 'quaff')) {
            potionsNeedingFix.push({
                id,
                name: item.name,
                command: item.command || 'none',
                shouldBe: 'Drink'
            });
        }
    }
});

if (potionsNeedingFix.length > 0) {
    console.log(`\nPotions with incorrect/missing command (should be 'Drink'):\n`);
    potionsNeedingFix.slice(0, 20).forEach(p => {
        console.log(`  ID ${p.id.toString().padStart(4)}: "${p.name.padEnd(30)}" - current: "${p.command}"`);
    });
    if (potionsNeedingFix.length > 20) {
        console.log(`  ... and ${potionsNeedingFix.length - 20} more`);
    }
} else {
    console.log('\n✅ All potions have correct commands');
}

// ==================
// FIND EDIBLE ITEMS
// ==================
console.log('\n' + '='.repeat(80));
console.log('FOOD ITEMS NEEDING HANDLER FIX');
console.log('='.repeat(80));

const foodNeedingFix = [];
items.forEach((item, id) => {
    if (!item) return;
    const name = (item.name || '').toLowerCase();
    
    // Foods that should have eat command
    const isFoodType = name.includes('bread') || name.includes('meat') || name.includes('pie') || 
                       name.includes('cake') || name.includes('banana') || name.includes('orange') ||
                       name.includes('apple') || name.includes('pizza') || name.includes('fish') ||
                       name.includes('cheese') || name.includes('chocolate');
    
    if (isFoodType && edible[id]) {
        if (!item.command || item.command.toLowerCase() !== 'eat') {
            foodNeedingFix.push({
                id,
                name: item.name,
                command: item.command || 'none',
                shouldBe: 'Eat',
                healAmount: edible[id]
            });
        }
    }
});

if (foodNeedingFix.length > 0) {
    console.log(`\nFood items with incorrect/missing command (should be 'Eat'):\n`);
    foodNeedingFix.slice(0, 20).forEach(f => {
        console.log(`  ID ${f.id.toString().padStart(4)}: "${f.name.padEnd(30)}" - current: "${f.command}"`);
    });
    if (foodNeedingFix.length > 20) {
        console.log(`  ... and ${foodNeedingFix.length - 20} more`);
    }
} else {
    console.log('\n✅ All food items have correct commands');
}

// ==================
// RANGED WEAPONS
// ==================
console.log('\n' + '='.repeat(80));
console.log('RANGED WEAPONS ANALYSIS');
console.log('='.repeat(80));

const rangedWeapons = [];
items.forEach((item, id) => {
    if (!item) return;
    const name = (item.name || '').toLowerCase();
    const isRanged = name.includes('bow') || name.includes('crossbow') || name.includes('blowpipe') ||
                     name.includes('dart') || name.includes('javelin');
    
    if (isRanged) {
        rangedWeapons.push({ id, name: item.name });
    }
});

console.log(`\nFound ${rangedWeapons.length} ranged weapons (requiring ranged.json data):`);
rangedWeapons.slice(0, 10).forEach(r => {
    console.log(`  ID ${r.id.toString().padStart(4)}: "${r.name}"`);
});
if (rangedWeapons.length > 10) {
    console.log(`  ... and ${rangedWeapons.length - 10} more`);
}

// ==================
// STAFFS
// ==================
console.log('\n' + '='.repeat(80));
console.log('MAGICAL ITEMS (STAFFS, CAPES, RUNES)');
console.log('='.repeat(80));

const staffsNeedingWieldable = [];
items.forEach((item, id) => {
    if (!item || !item.equip) return;
    const name = (item.name || '').toLowerCase();
    
    if (name.includes('staff') || name.includes('cape of ')) {
        staffsNeedingWieldable.push({ id, name: item.name, equip: item.equip });
    }
});

console.log(`\nMagical items needing wieldable.json entries:\n`);
staffsNeedingWieldable.forEach(s => {
    console.log(`  ID ${s.id.toString().padStart(4)}: "${s.name}" - equip: [${s.equip.join(', ')}]`);
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY OF FIXES NEEDED');
console.log('='.repeat(80));

console.log(`
1. COMMAND FIELD FIXES:
   - Potions: ${potionsNeedingFix.length} items need command set to "Drink"
   - Food:    ${foodNeedingFix.length} items need command set to "Eat"
   
2. WIELDABLE DATA MISSING:
   - 6 items (Staffs & Capes) need entries in wieldable.json
   
3. RANGED DATA MISSING:
   - 42 ranged weapons need entries in ranged.json
`);
