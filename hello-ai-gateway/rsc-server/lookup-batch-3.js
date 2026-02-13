const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');

console.log('=== BATCH 3 LOOKUP ===');

console.log('\n--- FAMILY CREST ---');
['avan', 'dhigna', 'boot', 'caleb', 'johnathon', 'dimintheis', 'chef', 'chronozon', 'goldsmith', 'cooking gaunt', 'chaos gaunt'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});

console.log('\n--- HOLY GRAIL ---');
['fisher king', 'percival', 'titan', 'excalibur', 'whistle', 'feather', 'holy grail', 'bell'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

console.log('\n--- JUNGLE POTION ---');
['trufitus', 'ardrigal', 'sito', 'volencia', 'rogue', 'snake weed'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

console.log('\n--- DEMON SLAYER ---');
['silverlight', 'rovin', 'traiborn', 'prysin', 'drain'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});
