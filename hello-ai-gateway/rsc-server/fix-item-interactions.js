#!/usr/bin/env node
/**
 * FIX MISSING ITEM INTERACTION DATA
 * 
 * Fixes:
 * 1. Add missing Drink command to unfinished potions
 * 2. Add missing wieldable data for staffs and capes
 */

const fs = require('fs');

// Load data
const items = JSON.parse(fs.readFileSync('./rsc-data-local/config/items.json', 'utf-8'));
let wieldable = JSON.parse(fs.readFileSync('./rsc-data-local/wieldable.json', 'utf-8'));
const refWieldable = JSON.parse(fs.readFileSync('../../openrsc-vanilla/rsc-data/wieldable.json', 'utf-8'));

console.log('🔧 FIXING MISSING ITEM INTERACTION DATA\n');

// ==================
// FIX 1: POTION COMMANDS
// ==================
console.log('1. Setting Drink command for unfinished/special potions...');

const potionIDsNeedingCommand = [
    58, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 935, 1052, 1053, 1054, 1074
];

let potionsFixed = 0;
potionIDsNeedingCommand.forEach(id => {
    if (items[id] && items[id].command !== 'Drink') {
        items[id].command = 'Drink';
        potionsFixed++;
    }
});

console.log(`   ✅ Fixed ${potionsFixed} potion items\n`);

// ==================
// FIX 2: WIELDABLE DATA FOR STAFFS & CAPES
// ==================
console.log('2. Adding wieldable data for staffs and capes...');

const staffsNeedingWieldable = [
    100, 101, 102, 103, 197, 198, 509, 614, 615, 616, 617, 618, 682, 683, 684, 685,
    725, 1000, 1216, 1217, 1218, 1288, 1306, 1307, 1308, 1309, 1310, 1311
];

let staffsFixed = 0;
staffsNeedingWieldable.forEach(id => {
    if (items[id] && items[id].equip && !wieldable[id]) {
        // Get from reference data
        if (refWieldable[id]) {
            wieldable[id] = refWieldable[id];
            staffsFixed++;
        } else {
            // For missing ones (1306-1311 god items), use sensible defaults
            // God staffs: similar to standard staffs but slightly better
            if (id >= 1306 && id <= 1308) {
                // God staffs (similar to battlestaff)
                wieldable[id] = {
                    "female": false,
                    "animation": 123,
                    "armour": 0,
                    "weaponAim": 35,
                    "weaponPower": 32,
                    "magic": 0,
                    "prayer": 0
                };
                staffsFixed++;
            } else if (id >= 1309 && id <= 1311) {
                // God capes (similar to legend cape)
                wieldable[id] = {
                    "female": false,
                    "animation": 226,
                    "armour": 7,
                    "weaponAim": 0,
                    "weaponPower": 0,
                    "magic": 0,
                    "prayer": 3
                };
                staffsFixed++;
            }
        }
    }
});

console.log(`   ✅ Added wieldable data for ${staffsFixed} items\n`);

// ==================
// SAVE CHANGES
// ==================
fs.writeFileSync('./rsc-data-local/config/items.json', JSON.stringify(items, null, 4) + '\n');
fs.writeFileSync('./rsc-data-local/wieldable.json', JSON.stringify(wieldable, null, 2) + '\n');

console.log('📝 FILES UPDATED:');
console.log('   - rsc-data-local/config/items.json');
console.log('   - rsc-data-local/wieldable.json\n');

console.log('✅ All fixes applied successfully!');
