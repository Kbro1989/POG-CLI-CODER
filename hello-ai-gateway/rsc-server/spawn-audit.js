// Spawn Location Audit - Compare locations/*.json against @2003scape/rsc-data
const npcs2003 = require('@2003scape/rsc-data/config/npcs');
const objects2003 = require('@2003scape/rsc-data/config/objects');
const items2003 = require('@2003scape/rsc-data/config/items');

const fs = require('fs');

console.log('=== 2003SCAPE DATA LIMITS ===');
console.log(`NPCs: 0-${npcs2003.length - 1}`);
console.log(`Objects: 0-${objects2003.length - 1}`);
console.log(`Items: 0-${items2003.length - 1}`);

// Load local spawn data
const localNpcs = JSON.parse(fs.readFileSync('rsc-data-local/locations/npcs.json', 'utf8'));
const localObjects = JSON.parse(fs.readFileSync('rsc-data-local/locations/objects.json', 'utf8'));
const localItems = JSON.parse(fs.readFileSync('rsc-data-local/locations/items.json', 'utf8'));

console.log('\n=== LOCAL SPAWN DATA ===');
console.log(`NPC spawns: ${localNpcs.length}`);
console.log(`Object spawns: ${localObjects.length}`);
console.log(`Item spawns: ${localItems.length}`);

function auditSpawns(name, spawns, authentic, idField = 'id') {
    console.log(`\n=== ${name.toUpperCase()} SPAWN AUDIT ===`);

    const uniqueIds = new Set();
    const outOfRange = [];
    const nullInAuth = [];
    const valid = [];

    spawns.forEach(spawn => {
        const id = spawn[idField];
        if (id === undefined) return;

        uniqueIds.add(id);

        if (id >= authentic.length) {
            outOfRange.push({ id, spawn });
        } else if (!authentic[id] || !authentic[id].name) {
            nullInAuth.push({ id, spawn });
        } else {
            valid.push({ id, name: authentic[id].name, spawn });
        }
    });

    console.log(`Unique IDs used: ${uniqueIds.size}`);
    console.log(`Valid (in 2003scape): ${valid.length} spawns`);
    console.log(`Null in 2003scape: ${nullInAuth.length} spawns`);
    console.log(`Out of range (OpenRSC-only): ${outOfRange.length} spawns`);

    // Show out-of-range samples
    if (outOfRange.length > 0) {
        console.log('\n--- OUT OF RANGE IDs ---');
        const uniqueOOR = [...new Set(outOfRange.map(o => o.id))].sort((a, b) => a - b);
        uniqueOOR.slice(0, 20).forEach(id => {
            console.log(`  ${id}: ${outOfRange.filter(o => o.id === id).length} spawns`);
        });
        if (uniqueOOR.length > 20) console.log(`  ... and ${uniqueOOR.length - 20} more unique IDs`);
    }

    // Show null samples
    if (nullInAuth.length > 0) {
        console.log('\n--- NULL IN 2003SCAPE ---');
        const uniqueNull = [...new Set(nullInAuth.map(o => o.id))].sort((a, b) => a - b);
        uniqueNull.slice(0, 10).forEach(id => {
            console.log(`  ${id}: ${nullInAuth.filter(o => o.id === id).length} spawns`);
        });
    }

    return { valid, nullInAuth, outOfRange, uniqueIds };
}

const npcResults = auditSpawns('NPCs', localNpcs, npcs2003);
const objectResults = auditSpawns('Objects', localObjects, objects2003);
const itemResults = auditSpawns('Items', localItems, items2003);

// Summary
console.log('\n=== FINAL SUMMARY ===');
console.log(`NPCs: ${npcResults.uniqueIds.size} unique IDs, ${npcResults.outOfRange.length} out-of-range spawns`);
console.log(`Objects: ${objectResults.uniqueIds.size} unique IDs, ${objectResults.outOfRange.length} out-of-range spawns`);
console.log(`Items: ${itemResults.uniqueIds.size} unique IDs, ${itemResults.outOfRange.length} out-of-range spawns`);

// Detailed out-of-range report
if (npcResults.outOfRange.length > 0) {
    console.log('\n=== NPC IDs NEEDING REMEDIATION ===');
    const ids = [...new Set(npcResults.outOfRange.map(o => o.id))].sort((a, b) => a - b);
    console.log(`Total unique out-of-range NPC IDs: ${ids.length}`);
    ids.forEach(id => {
        console.log(`  NPC ${id}: ${npcResults.outOfRange.filter(o => o.id === id).length} spawns`);
    });
}

if (objectResults.outOfRange.length > 0) {
    console.log('\n=== OBJECT IDs NEEDING REMEDIATION ===');
    const ids = [...new Set(objectResults.outOfRange.map(o => o.id))].sort((a, b) => a - b);
    console.log(`Total unique out-of-range Object IDs: ${ids.length}`);
    ids.forEach(id => {
        console.log(`  Object ${id}: ${objectResults.outOfRange.filter(o => o.id === id).length} spawns`);
    });
}

if (itemResults.outOfRange.length > 0) {
    console.log('\n=== ITEM IDs NEEDING REMEDIATION ===');
    const ids = [...new Set(itemResults.outOfRange.map(o => o.id))].sort((a, b) => a - b);
    console.log(`Total unique out-of-range Item IDs: ${ids.length}`);
    ids.forEach(id => {
        console.log(`  Item ${id}: ${itemResults.outOfRange.filter(o => o.id === id).length} spawns`);
    });
}
