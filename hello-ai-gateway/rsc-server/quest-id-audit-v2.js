// Quest NPC/Item/Object ID Audit v2
// Properly categorizes IDs based on variable naming conventions
// and validates against 2003scape authentic data

const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');

const fs = require('fs');
const path = require('path');

console.log('=== QUEST ID AUDIT v2 (Improved Categorization) ===\n');

const questDirs = [
    'src/plugins/quests/free',
    'src/plugins/quests/members'
];

const results = {
    npcs: { valid: [], invalid: [], outOfRange: [], mismatch: [] },
    items: { valid: [], invalid: [], outOfRange: [], mismatch: [] },
    objects: { valid: [], invalid: [], outOfRange: [], mismatch: [] },
    uncategorized: []
};

// Item-related keywords (MUST CHECK FIRST - these are often mistaken for NPCs)
const ITEM_KEYWORDS = [
    'item_', 'armour', 'armor', 'weapon', 'sword', 'axe', 'pickaxe', 'bar', '_bar',
    'key', 'potion', 'rune', 'staff', 'amulet', 'ring', 'necklace', 'bracelet',
    'ore', 'gem', 'diamond', 'ruby', 'emerald', 'sapphire', 'opal',
    'food', 'fish', 'bread', 'meat', 'cake', 'pie', 'wine', 'beer',
    'logs', 'plank', 'arrow', 'bow', 'helmet', 'platebody', 'platelegs',
    'shield', 'boots', 'gloves', 'cape', 'cloak', 'coin', 'gold_',
    'bone', 'hide', 'leather', 'cloth', 'thread', 'needle', 'wool',
    'feather', 'egg', 'flour', 'milk', 'bucket', 'jug', 'pot',
    'hammer', 'chisel', 'saw', 'knife', 'tinderbox', 'rope',
    'candle', 'torch', 'lantern', 'lamp', 'oil', 'bronze_', 'iron_',
    'steel_', 'mithril_', 'adamant', 'runit', 'dragon_',
    'raw_', 'cooked', 'burnt', 'uncut', 'cut_',
    'seed', 'herb', 'vial', 'grimy', 'clean',
    'pebble', 'urn', 'branch', 'mould', 'lens',
    'pendant', 'lever', 'crystal', 'orb', 'token'
];

// Object-related keywords
const OBJECT_KEYWORDS = [
    'object', 'obj_', 'door_', 'gate_', 'chest_', 'cupboard', 'bookcase',
    'stair', 'ladder', 'rock', 'tree', 'plant', 'bush', 'fence',
    'wall', 'altar', 'furnace', 'anvil', 'range', 'fire', 'well',
    'fountain', 'bank_', 'counter', 'table', 'chair', 'bed',
    'lever', 'switch', 'button', 'trap', 'coffin', 'tombstone',
    'crate', 'barrel', 'box', 'sign', 'poster', 'notice',
    'cart', 'ship', 'boat', 'raft', 'pillar', 'statue'
];

// NPC-related keywords (most specific - names often used)
const NPC_KEYWORDS = [
    'npc_', 'guard', 'knight', 'king', 'queen', 'duke', 'prince', 'princess',
    'wizard', 'witch', 'ghost', 'spirit', 'zombie', 'skeleton',
    'goblin', 'orc', 'troll', 'giant', 'dragon', 'demon',
    'man', 'woman', 'boy', 'girl', 'child',
    'cook', 'smith', 'miner', 'fisher', 'banker', 'shop',
    'druid', 'monk', 'priest', 'mage', 'warrior', 'archer',
    'captain', 'general', 'sergeant', 'sir_', 'lord_', 'lady_',
    'assistant', 'professor', 'teacher', 'master'
];

// Skip these generic variable names (not entity IDs)
const SKIP_PATTERNS = [
    'quest_points', 'quest_stage', 'minimum_qp', 'required_level',
    'reward_xp', 'reward_amount', 'stage_', 'step_',
    'x_coord', 'y_coord', 'level_req'
];

function categorizeVariable(varName) {
    const lower = varName.toLowerCase();

    // Skip generic non-ID variables
    for (const skip of SKIP_PATTERNS) {
        if (lower.includes(skip)) return null;
    }

    // Check for explicit prefixes first (most reliable)
    if (lower.startsWith('npc_')) return 'npcs';
    if (lower.startsWith('item_')) return 'items';
    if (lower.startsWith('obj_') || lower.startsWith('object_')) return 'objects';

    // Check item keywords (before NPC, since items are often named like entities)
    for (const kw of ITEM_KEYWORDS) {
        if (lower.includes(kw)) return 'items';
    }

    // Check object keywords
    for (const kw of OBJECT_KEYWORDS) {
        if (lower.includes(kw)) return 'objects';
    }

    // Check NPC keywords
    for (const kw of NPC_KEYWORDS) {
        if (lower.includes(kw)) return 'npcs';
    }

    return null; // Can't categorize
}

function extractIdsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const questName = path.basename(path.dirname(filePath));

    // Extract all const declarations with numeric values
    const constPattern = /const\s+(\w+)\s*=\s*(\d+)\s*;/g;
    let match;

    while ((match = constPattern.exec(content)) !== null) {
        const varName = match[1];
        const id = parseInt(match[2]);

        const category = categorizeVariable(varName);

        if (!category) {
            results.uncategorized.push({
                quest: questName,
                file: fileName,
                varName,
                id
            });
            continue;
        }

        const authentic = category === 'npcs' ? npcs2003 :
            category === 'items' ? items2003 : objects2003;

        if (id >= authentic.length) {
            results[category].outOfRange.push({
                quest: questName,
                file: fileName,
                varName,
                id,
                maxId: authentic.length - 1
            });
        } else if (!authentic[id] || !authentic[id].name) {
            results[category].invalid.push({
                quest: questName,
                file: fileName,
                varName,
                id,
                reason: 'NULL_ENTRY'
            });
        } else {
            // Check if variable name roughly matches authentic name
            const authName = authentic[id].name.toLowerCase();
            const varLower = varName.toLowerCase()
                .replace(/_id$/, '')
                .replace(/^(npc_|item_|obj_)/, '')
                .replace(/_/g, ' ');

            const nameMatch = authName.includes(varLower.split(' ')[0]) ||
                varLower.includes(authName.split(' ')[0]);

            results[category].valid.push({
                quest: questName,
                file: fileName,
                varName,
                id,
                authenticName: authentic[id].name,
                nameMatch
            });
        }
    }
}

function walkDir(dir, callback) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walkDir(filePath, callback);
            } else if (file.endsWith('.js')) {
                callback(filePath);
            }
        });
    } catch (err) {
        console.error(`Error reading ${dir}: ${err.message}`);
    }
}

// Scan all quest plugins
questDirs.forEach(dir => {
    console.log(`Scanning ${dir}...`);
    walkDir(dir, extractIdsFromFile);
});

// Report results
function printCategory(name, data) {
    console.log(`\n=== ${name.toUpperCase()} ===`);
    console.log(`Valid: ${data.valid.length}`);
    console.log(`Invalid (null in 2003scape): ${data.invalid.length}`);
    console.log(`Out of Range: ${data.outOfRange.length}`);

    // Count mismatches (variable name doesn't match authentic name)
    const mismatches = data.valid.filter(e => !e.nameMatch);
    console.log(`Name Mismatches: ${mismatches.length}`);

    if (data.invalid.length > 0) {
        console.log('\n--- INVALID ENTRIES (may need ID correction) ---');
        data.invalid.forEach(e => {
            console.log(`  ${e.quest}/${e.file}: ${e.varName} = ${e.id} (${e.reason})`);
        });
    }

    if (data.outOfRange.length > 0) {
        console.log('\n--- OUT OF RANGE (OpenRSC-only or invalid) ---');
        data.outOfRange.forEach(e => {
            console.log(`  ${e.quest}/${e.file}: ${e.varName} = ${e.id} (max: ${e.maxId})`);
        });
    }

    // Show sample MATCHING entries for verification
    const matching = data.valid.filter(e => e.nameMatch);
    if (matching.length > 0) {
        console.log('\n--- SAMPLE MATCHING ENTRIES (correct) ---');
        const byQuest = {};
        matching.forEach(e => {
            if (!byQuest[e.quest]) byQuest[e.quest] = [];
            byQuest[e.quest].push(e);
        });

        Object.keys(byQuest).slice(0, 3).forEach(quest => {
            console.log(`  ${quest}:`);
            byQuest[quest].slice(0, 2).forEach(e => {
                console.log(`    ✓ ${e.varName} = ${e.id} -> "${e.authenticName}"`);
            });
        });
    }

    // Show mismatches (variable name != authentic name)
    if (mismatches.length > 0) {
        console.log('\n--- NAME MISMATCHES (verify these manually) ---');
        mismatches.slice(0, 10).forEach(e => {
            console.log(`  ⚠️  ${e.quest}/${e.file}:`);
            console.log(`      Variable: ${e.varName} = ${e.id}`);
            console.log(`      Authentic: "${e.authenticName}"`);
        });
        if (mismatches.length > 10) {
            console.log(`  ... and ${mismatches.length - 10} more`);
        }
    }
}

printCategory('NPCs', results.npcs);
printCategory('Items', results.items);
printCategory('Objects', results.objects);

// Show uncategorized
if (results.uncategorized.length > 0) {
    console.log('\n=== UNCATEGORIZED (could not determine type) ===');
    console.log(`Count: ${results.uncategorized.length}`);
    results.uncategorized.slice(0, 10).forEach(e => {
        console.log(`  ${e.quest}/${e.file}: ${e.varName} = ${e.id}`);
    });
}

// Summary
console.log('\n=== SUMMARY ===');
const totalValid = results.npcs.valid.length + results.items.valid.length + results.objects.valid.length;
const totalInvalid = results.npcs.invalid.length + results.items.invalid.length + results.objects.invalid.length;
const totalOOR = results.npcs.outOfRange.length + results.items.outOfRange.length + results.objects.outOfRange.length;
const totalMismatches = results.npcs.valid.filter(e => !e.nameMatch).length +
    results.items.valid.filter(e => !e.nameMatch).length +
    results.objects.valid.filter(e => !e.nameMatch).length;

console.log(`Total Valid IDs: ${totalValid}`);
console.log(`Total Invalid: ${totalInvalid}`);
console.log(`Total Out of Range: ${totalOOR}`);
console.log(`Total Name Mismatches: ${totalMismatches}`);
console.log(`Uncategorized: ${results.uncategorized.length}`);

if (totalInvalid === 0 && totalOOR === 0) {
    console.log('\n✅ All categorized IDs exist in 2003scape data!');
} else {
    console.log('\n⚠️ Some IDs may need correction. Review above.');
}

if (totalMismatches > 0) {
    console.log('⚠️ Some variable names don\'t match their authentic entity names.');
    console.log('   These could be correct (just named differently) or bugs.');
}
