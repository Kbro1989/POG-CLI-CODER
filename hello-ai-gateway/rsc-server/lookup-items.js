// Look up specific items from @2003scape/rsc-data
const items = require('@2003scape/rsc-data/config/items');

console.log('=== ITEM ID Lookup ===\n');

console.log('Item 210:', items[210] ? items[210].name : 'null');
console.log('Item 211:', items[211] ? items[211].name : 'null');

console.log('\n--- Searching for "railing" ---');
items.forEach((it, i) => {
    if (it && it.name && it.name.toLowerCase().includes('railing')) {
        console.log(`ID ${i}: ${it.name}`);
    }
});

console.log('\n--- Items 1090-1110 (high range for dwarf cannon items) ---');
for (let i = 1090; i <= 1110; i++) {
    if (items[i]) {
        console.log(`ID ${i}: ${items[i].name}`);
    }
}
