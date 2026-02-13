// Audit: Find all item IDs used in codebase that are OpenRSC-exclusive (not in 2003scape)
const items2003 = require('@2003scape/rsc-data/config/items');

// 2003scape max ID is array length - 1
const MAX_2003SCAPE_ID = items2003.length - 1;
console.log(`2003scape authentic item range: 0 - ${MAX_2003SCAPE_ID}\n`);

// Items currently used in command.js spawn menu that need verification
const usedItems = [
    // Helmets (need verification)
    { id: 112, expected: 'Bronze Med Helmet' },
    { id: 104, expected: 'Steel Med Helmet' },
    { id: 116, expected: 'Addy Med Helmet' },
    { id: 120, expected: 'Rune Med Helmet' },
    { id: 795, expected: 'Dragon Med Helmet' },
    // Bodies
    { id: 8, expected: 'Bronze Plate Body' },
    { id: 86, expected: 'Steel Plate Body' },
    { id: 84, expected: 'Addy Plate Body' },
    { id: 401, expected: 'Rune Plate Body' },
    { id: 1278, expected: 'Dragon Plate Body' },
    // Legs
    { id: 206, expected: 'Bronze Plate Legs' },
    { id: 121, expected: 'Steel Plate Legs' },
    { id: 125, expected: 'Addy Plate Legs' },
    { id: 402, expected: 'Rune Plate Legs' },
    { id: 1279, expected: 'Dragon Plate Legs' },
    // Shields
    { id: 4, expected: 'Wooden Shield' },
    { id: 48, expected: 'Steel Kite Shield' },
    { id: 56, expected: 'Addy Kite Shield' },
    { id: 403, expected: 'Rune Kite Shield' },
    { id: 1276, expected: 'Dragon Square Shield' },
    // Swords
    { id: 70, expected: 'Bronze Long Sword' },
    { id: 60, expected: 'Steel Long Sword' },
    { id: 68, expected: 'Addy Long Sword' },
    { id: 396, expected: 'Rune Long Sword' },
    { id: 593, expected: 'Dragon Long Sword' },
    // 2H
    { id: 76, expected: 'Bronze 2H' },
    { id: 77, expected: 'Steel 2H' },
    { id: 79, expected: 'Addy 2H' },
    { id: 398, expected: 'Rune 2H' },
    // Axes
    { id: 12, expected: 'Bronze Axe' },
    { id: 89, expected: 'Steel Battle Axe' },
    { id: 97, expected: 'Addy Battle Axe' },
    { id: 405, expected: 'Rune Battle Axe' },
    { id: 594, expected: 'Dragon Battle Axe' },
    // Rares
    { id: 576, expected: 'Red Party Hat' },
    { id: 577, expected: 'Yellow Party Hat' },
    { id: 578, expected: 'Blue Party Hat' },
    { id: 579, expected: 'Green Party Hat' },
    { id: 580, expected: 'Purple Party Hat' },
    { id: 581, expected: 'White Party Hat' },
    { id: 831, expected: 'Red Halloween Mask' },
    { id: 832, expected: 'Blue Halloween Mask' },
    { id: 828, expected: 'Green Halloween Mask' },
    { id: 575, expected: 'Christmas Cracker' },
    { id: 387, expected: 'Disk of Returning' },
    { id: 1289, expected: 'Scythe' },
    { id: 1156, expected: 'Bunny Ears' },
    { id: 677, expected: 'Easter Egg' },
    // Potions
    { id: 221, expected: 'Strength Potion' },
    { id: 474, expected: 'Attack Potion' },
    { id: 480, expected: 'Defense Potion' },
    { id: 486, expected: 'Super Attack Potion' },
    { id: 483, expected: 'Prayer Potion' },
];

console.log('=== AUTHENTIC vs OPENRSC-EXCLUSIVE ===\n');

const authentic = [];
const openrscExclusive = [];
const wrongName = [];

usedItems.forEach(({ id, expected }) => {
    if (id > MAX_2003SCAPE_ID) {
        openrscExclusive.push({ id, expected, reason: 'OUT_OF_RANGE' });
    } else {
        const actual = items2003[id];
        if (actual && actual.name) {
            authentic.push({ id, expected, actual: actual.name });
        } else {
            openrscExclusive.push({ id, expected, reason: 'NULL_IN_2003' });
        }
    }
});

console.log('--- AUTHENTIC (in 2003scape) ---');
authentic.forEach(a => console.log(`  ${a.id}: ${a.actual} ${a.actual.toLowerCase().includes(a.expected.split(' ')[0].toLowerCase()) ? '✓' : `(expected: ${a.expected})`}`));

console.log('\n--- OPENRSC-EXCLUSIVE (NOT in authentic RSC) ---');
openrscExclusive.forEach(o => console.log(`  ${o.id}: ${o.expected} [${o.reason}]`));

console.log(`\nSummary: ${authentic.length} authentic, ${openrscExclusive.length} OpenRSC-exclusive`);
