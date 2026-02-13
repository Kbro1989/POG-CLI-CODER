// Lookup IDs for next batch of quests
const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');

console.log('=== QUEST ID LOOKUP BATCH 2 ===\n');

// Hero's Quest
console.log('--- HERO\'S QUEST ---');
['grip', 'straven', 'grubor', 'trobert', 'garv', 'achietties', 'alfonse', 'katrine'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['firebird', 'ice gloves', 'master thief', 'misc key', 'lava eel'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

// Merlin's Crystal
console.log('\n--- MERLIN\'S CRYSTAL ---');
['morgan', 'lancelot', 'gawain', 'mordred', 'thrantax', 'lady of the lake', 'beggar', 'arthur'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['excalibur', 'black candle', 'wax bucket', 'insect repellent', 'bat bones'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

// Tribal Totem
console.log('\n--- TRIBAL TOTEM ---');
['cromperty', 'kangai', 'horacio', 'employee'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['totem', 'address label'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

// Scorpion Catcher
console.log('\n--- SCORPION CATCHER ---');
['thormac', 'seer', 'scorpion'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['cage'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});

// Temple of Ikov
console.log('\n--- TEMPLE OF IKOV ---');
['lucien', 'winelda', 'guardian', 'fire warrior'].forEach(term => {
    npcs.forEach((n, i) => { if (n && n.name && n.name.toLowerCase().includes(term)) console.log(`NPC ${i}: ${n.name}`); });
});
['pendant of lucien', 'staff of armadyl', 'lever'].forEach(term => {
    items.forEach((it, i) => { if (it && it.name && it.name.toLowerCase().includes(term)) console.log(`ITEM ${i}: ${it.name}`); });
});
