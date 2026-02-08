const fs = require('fs');
const path = require('path');

const TXT_PATH = 'C:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-vanilla/rsc-server/src/plugins/items/item_list.txt';
const JSON_PATH = 'c:/Users/Destiny/Desktop/New folder/POG-Ultimate/rsc-data/config/items.json';

// Parse arguments
const args = process.argv.slice(2);
const isWrite = args.includes('--write');
const isDryRun = !isWrite;

if (isDryRun) {
    console.log("--- DRY RUN MODE (No changes will be saved) ---");
    console.log("Use --write to apply changes.\n");
}

function parseTxt(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n|\r/); // Handle all line endings
    const itemMap = new Map();

    const regex = /ItemID\s*=\s*(\d+)\s+(.+)/i; // Case insensitive

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const match = line.match(regex);
        if (match) {
            const id = parseInt(match[1], 10);
            const name = match[2].trim();
            itemMap.set(id, name);
        } else {
            console.log(`[DEBUG] Line ${i + 1} failed match: "${line}"`);
        }
    }
    return itemMap;
}

function main() {
    console.log(`[START] Authoritative Source: ${TXT_PATH}`);
    const sourceMap = parseTxt(TXT_PATH);
    console.log(`[INFO] Source Map Size: ${sourceMap.size}`);

    console.log(`[START] Target JSON: ${JSON_PATH}`);
    const jsonContent = fs.readFileSync(JSON_PATH, 'utf8');
    let items = JSON.parse(jsonContent);
    console.log(`[INFO] Target JSON Array Length: ${items.length}`);

    let renames = 0;
    let expansion = 0;

    // 1. Expansion
    const ids = Array.from(sourceMap.keys());
    const maxId = Math.max(...ids);
    console.log(`[INFO] Maximum ID found in source: ${maxId}`);

    if (items.length <= maxId) {
        expansion = maxId + 1 - items.length;
        console.log(`[ACTION] Expanding JSON by ${expansion} slots...`);
        for (let i = items.length; i <= maxId; i++) {
            items[i] = {
                name: "Unimplemented Item",
                description: "Auto-generated placeholder",
                command: "",
                sprite: 0,
                price: 0,
                stackable: false,
                special: false,
                equip: null,
                colour: null,
                untradeable: true,
                members: false
            };
        }
    }

    // 2. Sync
    for (const [id, sourceName] of sourceMap.entries()) {
        const item = items[id];
        if (item.name !== sourceName) {
            if (id < 10) console.log(`[SYNC] ID ${id}: "${item.name}" -> "${sourceName}"`);
            item.name = sourceName;
            renames++;
        }
    }

    console.log(`\n[RESULTS] Renames: ${renames}, Expanded: ${expansion}, MaxID: ${maxId}`);

    if (isWrite && (renames > 0 || expansion > 0)) {
        console.log(`[WRITE] Saving ${JSON_PATH}...`);
        fs.writeFileSync(JSON_PATH, JSON.stringify(items, null, 4), 'utf8');
        console.log("[DONE] Write successful.");
    } else {
        console.log("[INFO] Dry run or no changes. File preserved.");
    }
}

main();
