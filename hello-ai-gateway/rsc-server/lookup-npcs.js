// Look up specific NPCs from @2003scape/rsc-data
const npcs = require('@2003scape/rsc-data/config/npcs');

console.log('=== NPC ID Lookup ===\n');

// Search for druids
console.log('--- DRUIDS ---');
npcs.forEach((n, i) => {
    if (n && n.name) {
        const name = n.name.toLowerCase();
        if (name.includes('kaqemeex') || name.includes('sanfew') ||
            name.includes('druid') || name.includes('herblore')) {
            console.log(`ID ${i}: ${n.name}`);
        }
    }
});

// Search for Dwarf Cannon NPCs
console.log('\n--- DWARF CANNON QUEST NPCs ---');
npcs.forEach((n, i) => {
    if (n && n.name) {
        const name = n.name.toLowerCase();
        if (name.includes('lawgof') || name.includes('nulodion') ||
            name.includes('lollk') || name.includes('gilob')) {
            console.log(`ID ${i}: ${n.name}`);
        }
    }
});

// Show NPCs 200-230
console.log('\n--- NPCs 200-230 (current mismatched range) ---');
for (let i = 200; i <= 230; i++) {
    if (npcs[i]) {
        console.log(`ID ${i}: ${npcs[i].name}`);
    }
}

// Show NPCs 450-470 (where Kaqemeex likely is)
console.log('\n--- NPCs 450-470 (druids?) ---');
for (let i = 450; i <= 470; i++) {
    if (npcs[i]) {
        console.log(`ID ${i}: ${npcs[i].name}`);
    }
}

// Total NPCs
console.log(`\n--- Total NPCs in 2003scape: ${npcs.length} ---`);
