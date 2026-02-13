// Look up Dwarf Cannon item IDs from @2003scape/rsc-data
const items = require('@2003scape/rsc-data/config/items');

console.log('=== DWARF CANNON ITEM LOOKUP ===\n');

// Search for dwarf cannon related items
const keywords = ['railing', 'remains', 'tool', 'dwarf', 'cannon', 'mould', 'ammo', 'notes', 'base', 'stand', 'barrel', 'furnace', 'ball'];

keywords.forEach(kw => {
    console.log(`--- Searching for "${kw}" ---`);
    items.forEach((it, i) => {
        if (it && it.name && it.name.toLowerCase().includes(kw)) {
            console.log(`ID ${i}: ${it.name}`);
        }
    });
});

// Also check high range items
console.log('\n--- Items 1030-1050 (cannon parts range) ---');
for (let i = 1030; i <= 1050; i++) {
    if (items[i]) {
        console.log(`ID ${i}: ${items[i].name}`);
    }
}
