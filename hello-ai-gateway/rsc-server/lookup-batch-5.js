const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');
const objects = require('@2003scape/rsc-data/config/objects');

console.log('=== BATCH 5 LOOKUP ===');

console.log('\n--- GERTRUDES CAT ---');
['gertrude', 'shilop', 'wilough', 'kitten', 'cat', 'doogle', 'sardine'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

console.log('\n--- CLOCK TOWER ---');
['dungeon rat', 'brother', 'koftik', 'camelot', 'clock'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['rat cage', 'lever', 'cog'].forEach(term => {
    objects.forEach((o, i) => { if (o && o.name && o.name.toLowerCase().includes(term)) console.log(`OBJ ${i}: ${o.name}`); });
});

console.log('\n--- BIOHAZARD ---');
['guidor', 'elena', 'mourner', 'distillator'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['plague', 'reagent', 'sample'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

console.log('\n--- BLACK KNIGHTS FORTRESS ---');
['grilled', 'cabbage', 'iron chain', 'bronze med'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});
['wall', 'grill', 'listen'].forEach(term => {
    objects.forEach((o, i) => { if (o && o.name && o.name.toLowerCase().includes(term)) console.log(`OBJ ${i}: ${o.name}`); });
});
