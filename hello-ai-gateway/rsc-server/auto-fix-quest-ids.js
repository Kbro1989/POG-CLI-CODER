/**
 * Quest ID Auto-Fixer v2
 * More aggressive fuzzy matching + reports unfixable items
 * 
 * Usage: node auto-fix-quest-ids.js [--apply]
 */

const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');
const fs = require('fs');
const path = require('path');

const APPLY_FIXES = process.argv.includes('--apply');

console.log('=== QUEST ID AUTO-FIXER v2 ===');
console.log(`Mode: ${APPLY_FIXES ? '🔧 APPLYING FIXES' : '👀 DRY RUN (use --apply to fix)'}\n`);

// Build search indexes with multiple keys per entity
const npcIndex = new Map();
npcs2003.forEach((n, i) => {
    if (n && n.name) {
        const name = n.name.toLowerCase();
        // Add full name
        npcIndex.set(name, { id: i, name: n.name });
        // Add each word
        name.split(/\s+/).forEach(word => {
            if (word.length > 2 && !npcIndex.has(word)) {
                npcIndex.set(word, { id: i, name: n.name });
            }
        });
    }
});

const itemIndex = new Map();
items2003.forEach((it, i) => {
    if (it && it.name) {
        const name = it.name.toLowerCase();
        itemIndex.set(name, { id: i, name: it.name });
        name.split(/\s+/).forEach(word => {
            if (word.length > 2 && !itemIndex.has(word)) {
                itemIndex.set(word, { id: i, name: it.name });
            }
        });
    }
});

const objectIndex = new Map();
objects2003.forEach((ob, i) => {
    if (ob && ob.name) {
        const name = ob.name.toLowerCase();
        objectIndex.set(name, { id: i, name: ob.name });
        name.split(/\s+/).forEach(word => {
            if (word.length > 2 && !objectIndex.has(word)) {
                objectIndex.set(word, { id: i, name: ob.name });
            }
        });
    }
});

// Categorization
function categorizeVariable(varName) {
    const lower = varName.toLowerCase();
    if (lower.startsWith('npc_')) return 'npcs';
    if (lower.startsWith('item_')) return 'items';
    if (lower.startsWith('obj_') || lower.startsWith('object_')) return 'objects';

    const itemKw = ['item_', 'armour', 'armor', 'weapon', 'sword', 'bar', 'key', 'potion', 'rune', 'staff', 'amulet', 'ore', 'gem', 'food', 'fish', 'arrow', 'bow', 'helmet', 'shield', 'coin', 'bone', 'hide', 'feather', 'egg', 'flour', 'milk', 'bucket', 'knife', 'rope', 'candle', 'torch', 'raw_', 'cooked', 'seed', 'herb', 'remains', 'notes', 'mould', 'pass', 'trophy', 'brew'];
    const objKw = ['obj_', 'door_', 'gate_', 'chest_', 'cupboard', 'bookcase', 'stair', 'ladder', 'rock', 'tree', 'fence', 'wall', 'altar', 'furnace', 'anvil', 'range_', 'crate', 'barrel', 'coffin', 'cannon', 'railing'];
    const npcKw = ['npc_', 'guard', 'knight', 'king', 'queen', 'duke', 'wizard', 'witch', 'ghost', 'spirit', 'zombie', 'goblin', 'giant', 'dragon', 'demon', 'cook', 'druid', 'monk', 'priest', 'captain', 'general'];

    for (const kw of itemKw) if (lower.includes(kw)) return 'items';
    for (const kw of objKw) if (lower.includes(kw)) return 'objects';
    for (const kw of npcKw) if (lower.includes(kw)) return 'npcs';
    return null;
}

function extractSearchTerms(varName) {
    return varName.toLowerCase()
        .replace(/^(npc_|item_|obj_|object_)/, '')
        .replace(/_id$/, '')
        .replace(/_(\d+)$/, '') // Remove trailing numbers like _1, _2
        .replace(/_/g, ' ')
        .trim();
}

function findBestMatch(searchTerms, index) {
    // Try exact match
    if (index.has(searchTerms)) {
        return index.get(searchTerms);
    }

    // Try each word
    const words = searchTerms.split(' ').filter(w => w.length > 2);
    for (const word of words) {
        if (index.has(word)) {
            return index.get(word);
        }
    }

    // Try partial match
    for (const [key, entry] of index) {
        for (const word of words) {
            if (key.includes(word) || word.includes(key)) {
                return entry;
            }
        }
    }

    return null;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const fixes = [];
    const unfixable = [];
    const constPattern = /^(\s*const\s+)(\w+)(\s*=\s*)(\d+)(\s*;.*)$/;

    lines.forEach((line, lineIndex) => {
        const match = line.match(constPattern);
        if (!match) return;

        const [, prefix, varName, equals, idStr, suffix] = match;
        const currentId = parseInt(idStr);
        const category = categorizeVariable(varName);

        if (!category) return;

        const authentic = category === 'npcs' ? npcs2003 : category === 'items' ? items2003 : objects2003;
        const index = category === 'npcs' ? npcIndex : category === 'items' ? itemIndex : objectIndex;

        if (currentId >= authentic.length || !authentic[currentId]) return;

        const currentName = authentic[currentId].name.toLowerCase();
        const searchTerms = extractSearchTerms(varName);

        // Check if it's already correct (any word matches)
        const searchWords = searchTerms.split(' ').filter(w => w.length > 2);
        const currentWords = currentName.split(' ').filter(w => w.length > 2);
        const isMatch = searchWords.some(sw => currentWords.some(cw => cw.includes(sw) || sw.includes(cw)));

        if (isMatch) return; // Already correct

        // Find the correct ID
        const bestMatch = findBestMatch(searchTerms, index);

        if (bestMatch && bestMatch.id !== currentId) {
            fixes.push({
                lineIndex,
                varName,
                searchTerms,
                currentId,
                currentName: authentic[currentId].name,
                newId: bestMatch.id,
                newName: bestMatch.name,
                prefix, equals, suffix
            });
        } else {
            unfixable.push({
                varName,
                searchTerms,
                currentId,
                currentName: authentic[currentId].name,
                category
            });
        }
    });

    return { filePath, lines, fixes, unfixable };
}

function walkDir(dir, callback) {
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) walkDir(filePath, callback);
            else if (file.endsWith('.js')) callback(filePath);
        });
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

// Process all quest files
const allResults = [];
const questDirs = ['src/plugins/quests/free', 'src/plugins/quests/members'];

questDirs.forEach(dir => {
    walkDir(dir, (filePath) => {
        const result = processFile(filePath);
        if (result.fixes.length > 0 || result.unfixable.length > 0) {
            allResults.push(result);
        }
    });
});

// Report
let totalFixes = 0;
let totalUnfixable = 0;

console.log('=== AUTO-FIXABLE ===');
allResults.forEach(result => {
    if (result.fixes.length === 0) return;
    const fileName = path.basename(result.filePath);
    console.log(`\n📄 ${fileName}:`);
    result.fixes.forEach(fix => {
        console.log(`  ✓ ${fix.varName}: ${fix.currentId} ("${fix.currentName}") → ${fix.newId} ("${fix.newName}")`);
        totalFixes++;
    });

    if (APPLY_FIXES) {
        result.fixes.forEach(fix => {
            const newLine = `${fix.prefix}${fix.varName}${fix.equals}${fix.newId}${fix.suffix.replace(/\/\/.*$/, `// "${fix.newName}" (auto-fixed)`)}`;
            result.lines[fix.lineIndex] = newLine;
        });
        fs.writeFileSync(result.filePath, result.lines.join('\n'));
        console.log(`  ✅ Applied!`);
    }
});

console.log('\n=== UNFIXABLE (need manual review) ===');
allResults.forEach(result => {
    if (result.unfixable.length === 0) return;
    const fileName = path.basename(result.filePath);
    console.log(`\n📄 ${fileName}:`);
    result.unfixable.slice(0, 5).forEach(u => {
        console.log(`  ⚠ ${u.varName} (${u.category}): "${u.searchTerms}" → currently ${u.currentId} ("${u.currentName}")`);
        totalUnfixable++;
    });
    if (result.unfixable.length > 5) {
        console.log(`  ... and ${result.unfixable.length - 5} more`);
        totalUnfixable += result.unfixable.length - 5;
    }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Auto-fixable: ${totalFixes}`);
console.log(`Unfixable (manual review): ${totalUnfixable}`);
console.log(`Files affected: ${allResults.filter(r => r.fixes.length > 0).length}`);

if (!APPLY_FIXES && totalFixes > 0) {
    console.log(`\n🔧 Run: node auto-fix-quest-ids.js --apply`);
}
