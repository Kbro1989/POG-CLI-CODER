
const fs = require('fs');
const path = require('path');

const configDir = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/rsc-data-local/config';

const targetNpcs = [735, 736, 626];
const targetItems = [989, 984, 985, 638];
const targetObjects = [97, 726, 727];

function verify() {
    try {
        console.log('Loading configs...');
        const npcs = JSON.parse(fs.readFileSync(path.join(configDir, 'npcs.json'), 'utf8'));
        const items = JSON.parse(fs.readFileSync(path.join(configDir, 'items.json'), 'utf8'));
        const objects = JSON.parse(fs.readFileSync(path.join(configDir, 'objects.json'), 'utf8'));

        console.log('\n--- NPC Verification ---');
        targetNpcs.forEach(id => {
            if (npcs[id]) {
                console.log(`PASS: NPC[${id}] = "${npcs[id].name}" - ${npcs[id].description}`);
            } else {
                console.error(`FAIL: NPC[${id}] NOT FOUND`);
            }
        });

        console.log('\n--- Item Verification ---');
        targetItems.forEach(id => {
            if (items[id]) {
                console.log(`PASS: Item[${id}] = "${items[id].name}" - ${items[id].description}`);
            } else {
                console.error(`FAIL: Item[${id}] NOT FOUND`);
            }
        });

        console.log('\n--- Object Verification ---');
        targetObjects.forEach(id => {
            // Objects array index might not be ID if IDs are properties, but usually in RSC config arrays, index = ID.
            // Let's check if there's an 'id' property or if it relies on index. 
            // In previous view_file, objects had "id" property in nested "model", but the main entry didn't show an explicit ID property for the object definition itself in the list, confusingly. 
            // Standard RSC often uses index. Let's assume index first, but if name doesn't match, we'll search.

            let obj = objects[id];
            if (obj) {
                console.log(`CHECK: Object[${id}] (Index match) = "${obj.name}" - ${obj.description}`);
            }

            // Also search by ID property if it exists?
            // Previous view showed: { "name": "Tree", ..., "model": { "id": 1 } }
            // The object ID is usually the index.
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

verify();
