// Comprehensive NPC lookup for quests with major mismatches
const npcs = require('@2003scape/rsc-data/config/npcs');

console.log('=== QUEST NPC ID VERIFICATION ===\n');

// Lost City Quest NPCs (wiki says: Adventurer Cleric=13, Wizard=12, Warrior=56, Archer=25, Leprechaun=18, Tree Spirit=95)
console.log('--- LOST CITY ---');
const lostCityIds = [12, 13, 18, 25, 56, 95, 219, 220, 221, 222, 223, 224];
lostCityIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});

// Fight Arena Quest NPCs (wiki says: Lady Servil=265, General Khazard=383, Bouncer=388, Khazard Ogre=384)
console.log('\n--- FIGHT ARENA ---');
const fightArenaIds = [265, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 383, 384, 385, 386, 387, 388];
fightArenaIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});

// Sea Slug Quest NPCs (currently mapping to Gnome Trainers)
console.log('\n--- SEA SLUG ---');
const seaSlugIds = [456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 574, 575, 576, 577, 578, 579];
seaSlugIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});

// Hazeel Cult Quest NPCs
console.log('\n--- HAZEEL CULT ---');
const hazeelIds = [500, 501, 502, 503, 504, 505, 506, 507, 508, 509];
hazeelIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});

// Fishing Contest Quest NPCs
console.log('\n--- FISHING CONTEST ---');
const fishingContestIds = [293, 294, 295, 296, 300];
fishingContestIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});

// Family Crest Quest NPCs
console.log('\n--- FAMILY CREST ---');
const familyCrestIds = [256, 262, 263, 267, 268];
familyCrestIds.forEach(id => {
    console.log(`ID ${id}: ${npcs[id] ? npcs[id].name : 'null'}`);
});
