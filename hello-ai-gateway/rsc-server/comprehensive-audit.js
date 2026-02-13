// Comprehensive NPC/Object/Item ID Audit - Improved Patterns
// Compares @2003scape/rsc-data vs local plugin usage

const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');

const fs = require('fs');
const path = require('path');

console.log('=== 2003SCAPE DATA SUMMARY ===');
console.log(`NPCs: ${npcs2003.length} (IDs 0-${npcs2003.length - 1})`);
console.log(`Objects: ${objects2003.length} (IDs 0-${objects2003.length - 1})`);
console.log(`Items: ${items2003.length} (IDs 0-${items2003.length - 1})`);

// Data structures
const npcIdsUsed = new Map(); // id -> { name, files: [] }
const objectIdsUsed = new Map();
const itemIdsUsed = new Map();

function extractIdsFromFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);

        // Pattern: const SOMETHING_ID = 123; or const SOMETHING = 123;
        // Group 1 = variable name (used to categorize), Group 2 = numeric ID
        const constPattern = /const\s+(\w+)\s*=\s*(\d+)\s*;/g;

        let match;
        while ((match = constPattern.exec(content)) !== null) {
            const varName = match[1].toLowerCase();
            const id = parseInt(match[2]);

            if (isNaN(id)) continue;

            // Categorize based on variable name
            if (varName.includes('npc') || varName.includes('_id') && !varName.includes('item') && !varName.includes('object') && !varName.includes('armour') && !varName.includes('bar') && !varName.includes('ore')) {
                // Likely NPC if ends in _ID and doesn't have item/object keywords
                if (varName.endsWith('_id') && !varName.includes('item') && !varName.includes('object') && !varName.includes('armour') && !varName.includes('weapon') && !varName.includes('gold') && !varName.includes('bar')) {
                    if (!npcIdsUsed.has(id)) {
                        npcIdsUsed.set(id, { varName: varName.toUpperCase(), files: [] });
                    }
                    npcIdsUsed.get(id).files.push(fileName);
                }
                // Standalone names like QUEST_ADVISOR = 489 are likely NPCs
                else if (!varName.includes('_id') && !varName.includes('item') && !varName.includes('object') && !varName.includes('armour')) {
                    if (!npcIdsUsed.has(id)) {
                        npcIdsUsed.set(id, { varName: varName.toUpperCase(), files: [] });
                    }
                    npcIdsUsed.get(id).files.push(fileName);
                }
            }

            // Items: have item, armour, bar, ore, weapon patterns
            if (varName.includes('armour') || varName.includes('bar') || varName.includes('ore') || varName.includes('item')) {
                if (!itemIdsUsed.has(id)) {
                    itemIdsUsed.set(id, { varName: varName.toUpperCase(), files: [] });
                }
                itemIdsUsed.get(id).files.push(fileName);
            }

            // Objects: have object pattern
            if (varName.includes('object')) {
                if (!objectIdsUsed.has(id)) {
                    objectIdsUsed.set(id, { varName: varName.toUpperCase(), files: [] });
                }
                objectIdsUsed.get(id).files.push(fileName);
            }
        }

        // Also capture npc.id === X patterns
        const npcIdCheckPattern = /npc\.id\s*[!=]==?\s*(\d+)/g;
        while ((match = npcIdCheckPattern.exec(content)) !== null) {
            const id = parseInt(match[1]);
            if (!isNaN(id)) {
                if (!npcIdsUsed.has(id)) {
                    npcIdsUsed.set(id, { varName: 'INLINE_CHECK', files: [] });
                }
                npcIdsUsed.get(id).files.push(fileName);
            }
        }

        // object.id === X patterns
        const objectIdCheckPattern = /object\.id\s*[!=]==?\s*(\d+)/g;
        while ((match = objectIdCheckPattern.exec(content)) !== null) {
            const id = parseInt(match[1]);
            if (!isNaN(id)) {
                if (!objectIdsUsed.has(id)) {
                    objectIdsUsed.set(id, { varName: 'INLINE_CHECK', files: [] });
                }
                objectIdsUsed.get(id).files.push(fileName);
            }
        }

    } catch (err) {
        // Skip files that can't be read
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
        // Skip inaccessible directories
    }
}

// Scan all plugin directories
console.log('\n=== SCANNING ALL PLUGINS ===');
walkDir('src/plugins', extractIdsFromFile);

console.log(`Found ${npcIdsUsed.size} unique NPC IDs`);
console.log(`Found ${objectIdsUsed.size} unique Object IDs`);
console.log(`Found ${itemIdsUsed.size} unique Item IDs`);

// Cross-reference with 2003scape
function auditCategory(name, usedMap, authentic) {
    console.log(`\n=== ${name.toUpperCase()} ID AUDIT ===`);

    const mismatches = [];
    const outOfRange = [];
    const valid = [];

    [...usedMap.keys()].sort((a, b) => a - b).forEach(id => {
        const usage = usedMap.get(id);
        if (id >= authentic.length) {
            outOfRange.push({ id, ...usage });
        } else {
            const authItem = authentic[id];
            if (authItem && authItem.name) {
                valid.push({ id, ...usage, authenticName: authItem.name });
            } else {
                mismatches.push({ id, ...usage, reason: 'NULL_IN_2003' });
            }
        }
    });

    console.log(`\n--- IN RANGE (0-${authentic.length - 1}) ---`);
    console.log(`Valid: ${valid.length}`);

    if (valid.length > 0) {
        console.log('\nSample valid entries:');
        valid.slice(0, 15).forEach(v => {
            console.log(`  ${v.id}: ${v.varName} -> "${v.authenticName}" [${v.files[0]}]`);
        });
        if (valid.length > 15) console.log(`  ... and ${valid.length - 15} more`);
    }

    console.log(`\nNull/Missing in 2003scape: ${mismatches.length}`);
    if (mismatches.length > 0) {
        mismatches.forEach(m => console.log(`  ${m.id}: ${m.varName} [${m.files.join(', ')}] - NOT IN 2003SCAPE`));
    }

    console.log(`\n--- OUT OF RANGE (>${authentic.length - 1}) [OpenRSC-only] ---`);
    console.log(`Count: ${outOfRange.length}`);
    if (outOfRange.length > 0) {
        outOfRange.forEach(o => console.log(`  ${o.id}: ${o.varName} [${o.files.join(', ')}]`));
    }

    return { valid, mismatches, outOfRange };
}

const npcResults = auditCategory('NPCs', npcIdsUsed, npcs2003);
const objectResults = auditCategory('Objects', objectIdsUsed, objects2003);
const itemResults = auditCategory('Items', itemIdsUsed, items2003);

// Summary
console.log('\n=== FINAL SUMMARY ===');
console.log(`NPCs: ${npcResults.valid.length} valid, ${npcResults.mismatches.length} mismatches, ${npcResults.outOfRange.length} OpenRSC-only`);
console.log(`Objects: ${objectResults.valid.length} valid, ${objectResults.mismatches.length} mismatches, ${objectResults.outOfRange.length} OpenRSC-only`);
console.log(`Items: ${itemResults.valid.length} valid, ${itemResults.mismatches.length} mismatches, ${itemResults.outOfRange.length} OpenRSC-only`);
