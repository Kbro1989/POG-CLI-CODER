const objects = require('@2003scape/rsc-data/config/objects');

console.log('=== BATCH 6 LOOKUP ===');

console.log('\n--- BIOHAZARD OBJECTS ---');
console.log(`OBJ 152: ${objects[152] ? objects[152].name : 'null'}`);
['door', 'gate', 'track', 'fence'].forEach(term => {
    objects.forEach((o, i) => { if (o && o.name && o.name.toLowerCase().includes(term)) console.log(`OBJ ${i}: ${o.name}`); });
});

console.log('\n--- BLACK KNIGHTS FORTRESS OBJECTS ---');
console.log(`OBJ 39: ${objects[39] ? objects[39].name : 'null'}`);
console.log(`OBJ 40: ${objects[40] ? objects[40].name : 'null'}`);
// Specifically looking for the secret door or guarded door in BKF
