// Export all name mismatches for manual review
const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');

const fs = require('fs');
const path = require('path');

console.log('=== Generating Full Mismatch Report ===\n');

const questDirs = [
    'src/plugins/quests/free',
    'src/plugins/quests/members'
];

const mismatches = [];

// Item-related keywords
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
    'pendant', 'lever', 'crystal', 'orb', 'token', 'remains', 'notes'
];

// Object-related keywords
const OBJECT_KEYWORDS = [
    'object', 'obj_', 'door_', 'gate_', 'chest_', 'cupboard', 'bookcase',
    'stair', 'ladder', 'rock', 'tree', 'plant', 'bush', 'fence',
    'wall', 'altar', 'furnace', 'anvil', 'range', 'fire', 'well',
    'fountain', 'bank_', 'counter', 'table', 'chair', 'bed',
    'lever', 'switch', 'button', 'trap', 'coffin', 'tombstone',
    'crate', 'barrel', 'box', 'sign', 'poster', 'notice',
    'cart', 'ship', 'boat', 'raft', 'pillar', 'statue', 'cannon'
];

// NPC-related keywords
const NPC_KEYWORDS = [
    'npc_', 'guard', 'knight', 'king', 'queen', 'duke', 'prince', 'princess',
    'wizard', 'witch', 'ghost', 'spirit', 'zombie', 'skeleton',
    'goblin', 'orc', 'troll', 'giant', 'dragon', 'demon',
    'man', 'woman', 'boy', 'girl', 'child',
    'cook', 'smith', 'miner', 'fisher', 'banker', 'shop',
    'druid', 'monk', 'priest', 'mage', 'warrior', 'archer',
    'captain', 'general', 'sergeant', 'sir_', 'lord_', 'lady_',
    'assistant', 'professor', 'teacher', 'master', 'commander'
];

const SKIP_PATTERNS = [
    'quest_points', 'quest_stage', 'minimum_qp', 'required_level',
    'reward_xp', 'reward_amount', 'stage_', 'step_',
    'x_coord', 'y_coord', 'level_req'
];

function categorizeVariable(varName) {
    const lower = varName.toLowerCase();

    for (const skip of SKIP_PATTERNS) {
        if (lower.includes(skip)) return null;
    }

    if (lower.startsWith('npc_')) return 'npcs';
    if (lower.startsWith('item_')) return 'items';
    if (lower.startsWith('obj_') || lower.startsWith('object_')) return 'objects';

    for (const kw of ITEM_KEYWORDS) {
        if (lower.includes(kw)) return 'items';
    }

    for (const kw of OBJECT_KEYWORDS) {
        if (lower.includes(kw)) return 'objects';
    }

    for (const kw of NPC_KEYWORDS) {
        if (lower.includes(kw)) return 'npcs';
    }

    return null;
}

function extractIdsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const questDir = path.basename(path.dirname(filePath));
    const questName = questDir === 'free' || questDir === 'members' ? fileName.replace('.js', '') : questDir;

    const constPattern = /const\s+(\w+)\s*=\s*(\d+)\s*;/g;
    let match;

    while ((match = constPattern.exec(content)) !== null) {
        const varName = match[1];
        const id = parseInt(match[2]);

        const category = categorizeVariable(varName);
        if (!category) continue;

        const authentic = category === 'npcs' ? npcs2003 :
            category === 'items' ? items2003 : objects2003;

        if (id >= authentic.length || !authentic[id] || !authentic[id].name) continue;

        const authName = authentic[id].name.toLowerCase();
        const varLower = varName.toLowerCase()
            .replace(/_id$/, '')
            .replace(/^(npc_|item_|obj_)/, '')
            .replace(/_/g, ' ');

        const nameMatch = authName.includes(varLower.split(' ')[0]) ||
            varLower.includes(authName.split(' ')[0]);

        if (!nameMatch) {
            mismatches.push({
                quest: questName,
                file: fileName,
                category: category.toUpperCase(),
                varName,
                id,
                authenticName: authentic[id].name
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

// Sort by quest, then category
mismatches.sort((a, b) => {
    if (a.quest !== b.quest) return a.quest.localeCompare(b.quest);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.varName.localeCompare(b.varName);
});

// Output to file
let output = '# Quest ID Mismatch Report\n\n';
output += `Generated: ${new Date().toISOString()}\n\n`;
output += `Total Mismatches: ${mismatches.length}\n\n`;
output += '> **Note**: These are variable names that don\'t match the authentic entity name.\n';
output += '> Many are intentional (e.g., `ROVIN_KEY_ID` → "Silverlight key 2").\n';
output += '> Review and fix only those that look like actual bugs.\n\n';
output += '## Mismatches by Quest\n\n';

let currentQuest = null;
mismatches.forEach(m => {
    if (m.quest !== currentQuest) {
        currentQuest = m.quest;
        output += `### ${m.quest}\n\n`;
        output += '| Category | Variable | ID | Authentic Name | Action |\n';
        output += '|---|---|---|---|---|\n';
    }
    output += `| ${m.category} | \`${m.varName}\` | ${m.id} | "${m.authenticName}" | ☐ |\n`;
});

// Write to file
fs.writeFileSync('quest-id-mismatch-report.md', output);
console.log(`\nReport written to quest-id-mismatch-report.md`);
console.log(`Total mismatches: ${mismatches.length}`);
