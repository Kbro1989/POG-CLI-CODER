const npcs = require('@2003scape/rsc-data/config/npcs');
const objects = require('@2003scape/rsc-data/config/objects');

console.log('=== BATCH 4 LOOKUP ===');

console.log('\n--- FAMILY CREST SONS ---');
// Looking for Avan, Johnathon, Caleb/Chef
for (let i = 308; i <= 316; i++) {
    if (npcs[i]) console.log(`NPC ${i}: ${npcs[i].name}`);
}

console.log('\n--- HOLY GRAIL FISHERMAN ---');
for (let i = 400; i <= 420; i++) {
    if (npcs[i]) console.log(`NPC ${i}: ${npcs[i].name}`);
}

console.log('\n--- JUNGLE POTION OBJECTS ---');
['snake', 'ardrigal', 'sito', 'volencia', 'rogue', 'palm', 'marshy', 'scorched'].forEach(term => {
    objects.forEach((o, i) => { if (o && o.name && o.name.toLowerCase().includes(term)) console.log(`OBJ ${i}: ${o.name}`); });
});
