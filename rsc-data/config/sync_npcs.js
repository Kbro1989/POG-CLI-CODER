const fs = require('fs');
const path = require('path');

const NPC_FILE = path.join(__dirname, 'npcs.json');
const AUTH_FILE = path.join(__dirname, 'authoritative_npcs.txt');

try {
    const authContent = fs.readFileSync(AUTH_FILE, 'utf8');
    const npcLines = authContent.split('\n').filter(line => line.trim() !== '');
    const authMap = new Map();

    npcLines.forEach(line => {
        const match = line.match(/^(\d+):\s*(.+)$/);
        if (match) {
            authMap.set(parseInt(match[1]), match[2].trim());
        }
    });

    const npcs = JSON.parse(fs.readFileSync(NPC_FILE, 'utf8'));
    let updatedCount = 0;

    authMap.forEach((name, id) => {
        if (npcs[id]) {
            if (npcs[id].name !== name) {
                console.log(`Updating ID ${id}: ${npcs[id].name} -> ${name}`);
                npcs[id].name = name;
                updatedCount++;
            }
        } else {
            console.log(`Adding stub for ID ${id}: ${name}`);
            npcs[id] = {
                name: name,
                description: `Forensic recovery required for ${name}`,
                attack: 1,
                strength: 1,
                hits: 10,
                defense: 1,
                animations: [null, null, null, null, null, null, null, null, null, null, null, null]
            };
            updatedCount++;
        }
    });

    fs.writeFileSync(NPC_FILE, JSON.stringify(npcs, null, 4));
    console.log(`Successfully synchronized ${updatedCount} NPCs.`);
} catch (e) {
    console.error('Failed to sync NPCs:', e);
}
