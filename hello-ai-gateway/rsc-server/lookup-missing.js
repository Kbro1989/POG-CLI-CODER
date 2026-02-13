// Lookup for remaining missing IDs
const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');

console.log('--- MISSING IDs LOOKUP ---');

// NPCs
console.log('NPCS:');
['straven', 'achietties', 'weapon', 'phoenix', 'black arm'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});

// Items
console.log('ITEMS:');
['insect', 'shield of arrav'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});
