// Quest NPC/Item/Object ID Audit
// Verifies all IDs in translated quests match 2003scape authentic data

const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');

const fs = require('fs');
const path = require('path');

console.log('=== QUEST-SPECIFIC ID AUDIT ===\n');

const questDirs = [
    'src/plugins/quests/free',
    'src/plugins/quests/members'
];

const results = {
    npcs: { valid: [], invalid: [], outOfRange: [] },
    items: { valid: [], invalid: [], outOfRange: [] },
    objects: { valid: [], invalid: [], outOfRange: [] }
};

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
        const varLower = varName.toLowerCase();

        // Categorize by variable naming convention
        let category = null;
        let authentic = null;

        if (varLower.includes('npc') || varLower.endsWith('_id') &&
            !varLower.includes('item') && !varLower.includes('object')) {
            // Check if it's likely an NPC
            if (id < npcs2003.length && npcs2003[id]?.name) {
                category = 'npcs';
                authentic = npcs2003;
            }
        }

        if (varLower.includes('item') || varLower.includes('armour') ||
            varLower.includes('weapon') || varLower.includes('bar') ||
            varLower.includes('key') || varLower.includes('potion')) {
            category = 'items';
            authentic = items2003;
        }

        if (varLower.includes('object') || varLower.includes('door') ||
            varLower.includes('gate') || varLower.includes('chest')) {
            category = 'objects';
            authentic = objects2003;
        }

        // Fallback: try to auto-detect based on ID ranges
        if (!category) {
            // If ID is valid in items, assume item
            if (id < items2003.length && items2003[id]?.name) {
                category = 'items';
                authentic = items2003;
            } else if (id < npcs2003.length && npcs2003[id]?.name) {
                category = 'npcs';
                authentic = npcs2003;
            }
        }

        if (category && authentic) {
            if (id >= authentic.length) {
                results[category].outOfRange.push({
                    quest: questName,
                    file: fileName,
                    varName,
                    id
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
                results[category].valid.push({
                    quest: questName,
                    file: fileName,
                    varName,
                    id,
                    authenticName: authentic[id].name
                });
            }
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
function printCategory(name, data, authentic) {
    console.log(`\n=== ${name.toUpperCase()} ===`);
    console.log(`Valid: ${data.valid.length}`);
    console.log(`Invalid (null in 2003scape): ${data.invalid.length}`);
    console.log(`Out of Range: ${data.outOfRange.length}`);

    if (data.invalid.length > 0) {
        console.log('\n--- INVALID ENTRIES (may need ID correction) ---');
        data.invalid.forEach(e => {
            console.log(`  ${e.quest}/${e.file}: ${e.varName} = ${e.id} (${e.reason})`);
        });
    }

    if (data.outOfRange.length > 0) {
        console.log('\n--- OUT OF RANGE (OpenRSC-only) ---');
        data.outOfRange.forEach(e => {
            console.log(`  ${e.quest}/${e.file}: ${e.varName} = ${e.id}`);
        });
    }

    // Show sample valid entries for verification
    if (data.valid.length > 0) {
        console.log('\n--- SAMPLE VALID ENTRIES ---');
        // Group by quest
        const byQuest = {};
        data.valid.forEach(e => {
            if (!byQuest[e.quest]) byQuest[e.quest] = [];
            byQuest[e.quest].push(e);
        });

        Object.keys(byQuest).slice(0, 5).forEach(quest => {
            console.log(`  ${quest}:`);
            byQuest[quest].slice(0, 3).forEach(e => {
                console.log(`    ${e.varName} = ${e.id} -> "${e.authenticName}"`);
            });
        });
    }
}

printCategory('NPCs', results.npcs, npcs2003);
printCategory('Items', results.items, items2003);
printCategory('Objects', results.objects, objects2003);

// Summary
console.log('\n=== SUMMARY ===');
const totalInvalid = results.npcs.invalid.length + results.items.invalid.length + results.objects.invalid.length;
const totalOOR = results.npcs.outOfRange.length + results.items.outOfRange.length + results.objects.outOfRange.length;
console.log(`Total Invalid: ${totalInvalid}`);
console.log(`Total Out of Range: ${totalOOR}`);
if (totalInvalid === 0 && totalOOR === 0) {
    console.log('\n✅ All quest IDs are valid 2003scape IDs!');
} else {
    console.log('\n⚠️ Some IDs may need correction. Review above.');
}
