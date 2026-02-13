// Full Item ID Audit: command.js vs @2003scape/rsc-data
const items = require('@2003scape/rsc-data/config/items');

// All item IDs used in command.js spawn menu
const usedIds = [
    // Food
    { id: 546, expected: 'Lobster' },
    { id: 373, expected: 'Swordfish' },
    { id: 370, expected: 'Shark' },
    { id: 325, expected: 'Meat Pizza' },
    // Potions
    { id: 221, expected: 'Str Pot (4)' },
    { id: 474, expected: 'Atk Pot (3)' },
    { id: 480, expected: 'Def Pot (3)' },
    { id: 486, expected: 'Super Atk (3)' },
    { id: 483, expected: 'Prayer Pot (3)' },
    // Drinks
    { id: 142, expected: 'Beer' },
    { id: 193, expected: 'Wine' },
    { id: 830, expected: 'Grog' },
    { id: 739, expected: 'Dragon Bitter' },
    // Helmets
    { id: 112, expected: 'Bronze Med' },
    { id: 104, expected: 'Steel Med' },
    { id: 116, expected: 'Addy Med' },
    { id: 120, expected: 'Rune Med' },
    { id: 795, expected: 'Dragon Med' },
    // Bodies
    { id: 8, expected: 'Bronze Plate' },
    { id: 86, expected: 'Steel Plate' },
    { id: 84, expected: 'Addy Plate' },
    { id: 401, expected: 'Rune Plate' },
    { id: 1278, expected: 'Dragon Plate' },
    // Legs
    { id: 206, expected: 'Bronze Legs' },
    { id: 121, expected: 'Steel Legs' },
    { id: 125, expected: 'Addy Legs' },
    { id: 402, expected: 'Rune Legs' },
    { id: 1279, expected: 'Dragon Legs' },
    // Shields
    { id: 4, expected: 'Wooden Shield' },
    { id: 48, expected: 'Steel Kite' },
    { id: 56, expected: 'Addy Kite' },
    { id: 403, expected: 'Rune Kite' },
    { id: 1276, expected: 'Dragon Sq' },
    // Swords
    { id: 70, expected: 'Bronze Sword' },
    { id: 60, expected: 'Steel Sword' },
    { id: 68, expected: 'Addy Sword' },
    { id: 396, expected: 'Rune Sword' },
    { id: 593, expected: 'Dragon Sword' },
    // 2H Swords
    { id: 76, expected: 'Bronze 2H' },
    { id: 77, expected: 'Steel 2H' },
    { id: 79, expected: 'Addy 2H' },
    { id: 398, expected: 'Rune 2H' },
    // Battleaxes
    { id: 12, expected: 'Bronze Baxe' },
    { id: 89, expected: 'Steel Baxe' },
    { id: 97, expected: 'Addy Baxe' },
    { id: 405, expected: 'Rune Baxe' },
    { id: 594, expected: 'Dragon Baxe' },
    // Bows
    { id: 188, expected: 'Shortbow' },
    { id: 189, expected: 'Longbow' },
    { id: 654, expected: 'Yew Short' },
    { id: 655, expected: 'Yew Long' },
    { id: 656, expected: 'Magic Short' },
    { id: 657, expected: 'Magic Long' },
    // Partyhats
    { id: 576, expected: 'Red Phat' },
    { id: 577, expected: 'Yellow Phat' },
    { id: 578, expected: 'Blue Phat' },
    { id: 579, expected: 'Green Phat' },
    { id: 580, expected: 'Purple Phat' },
    { id: 581, expected: 'White Phat' },
    // Masks (CURRENT - NEED VERIFICATION)
    { id: 831, expected: 'Red Mask' },
    { id: 832, expected: 'Blue Mask' },
    { id: 828, expected: 'Green Mask' },
    // Other Rares
    { id: 575, expected: 'Xmas Cracker' },
    { id: 422, expected: 'Disk of Return' },
    { id: 1289, expected: 'Scythe' },
    { id: 971, expected: 'Bunny Ears' },
    { id: 677, expected: 'Easter Egg' },
    { id: 1315, expected: 'Santa Hat' },
    // Ores/Bars
    { id: 150, expected: 'Copper Ore' },
    { id: 153, expected: 'Coal' },
    { id: 409, expected: 'Runite Ore' },
    { id: 408, expected: 'Runite Bar' },
    // Logs
    { id: 14, expected: 'Logs' },
    { id: 633, expected: 'Willow' },
    { id: 635, expected: 'Yew Logs' },
    { id: 636, expected: 'Magic Logs' },
    // Runes
    { id: 31, expected: 'Air (Fire-Rune in 2003)' },
    { id: 38, expected: 'Chaos' },
    { id: 42, expected: 'Death' },
    { id: 825, expected: 'Blood' },
    // Coins
    { id: 10, expected: 'Coins' },
];

console.log('=== ITEM ID AUDIT: command.js vs @2003scape/rsc-data ===\n');

const mismatches = [];
const outOfRange = [];

usedIds.forEach(({ id, expected }) => {
    if (id >= items.length) {
        outOfRange.push({ id, expected, actual: 'OUT OF RANGE' });
        console.log(`❌ ID ${id}: OUT OF RANGE (max: ${items.length - 1}) - Expected: ${expected}`);
    } else {
        const actual = items[id];
        if (!actual || !actual.name) {
            mismatches.push({ id, expected, actual: 'NULL/UNDEFINED' });
            console.log(`❌ ID ${id}: NULL/UNDEFINED - Expected: ${expected}`);
        } else if (!actual.name.toLowerCase().includes(expected.split(' ')[0].toLowerCase().replace(/[^a-z]/gi, ''))) {
            mismatches.push({ id, expected, actual: actual.name });
            console.log(`⚠️  ID ${id}: "${actual.name}" - Expected: ${expected}`);
        } else {
            console.log(`✓  ID ${id}: "${actual.name}" - Expected: ${expected}`);
        }
    }
});

console.log('\n=== SUMMARY ===');
console.log(`Total checked: ${usedIds.length}`);
console.log(`Mismatches: ${mismatches.length}`);
console.log(`Out of range: ${outOfRange.length}`);

if (mismatches.length > 0) {
    console.log('\n=== MISMATCHES (Need openrsc cross-reference) ===');
    mismatches.forEach(m => console.log(`  ${m.id}: "${m.actual}" vs "${m.expected}"`));
}

if (outOfRange.length > 0) {
    console.log('\n=== OUT OF RANGE (openrsc-only items) ===');
    outOfRange.forEach(m => console.log(`  ${m.id}: ${m.expected}`));
}
