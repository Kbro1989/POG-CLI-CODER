// Lookup IDs for broken quests
const npcs = require('@2003scape/rsc-data/config/npcs');
const items = require('@2003scape/rsc-data/config/items');

console.log('=== BROKEN QUEST ID LOOKUP ===\n');

// Helper function
function search(arr, terms, label) {
    console.log(`\n--- ${label} ---`);
    terms.forEach(term => {
        const t = term.toLowerCase();
        let found = false;
        arr.forEach((obj, i) => {
            if (obj && obj.name && obj.name.toLowerCase().includes(t)) {
                console.log(`ID ${i}: ${obj.name}`);
                found = true;
            }
        });
        if (!found) console.log(`No match for "${term}"`);
    });
}

// Jungle Potion
search(npcs, ['Trufitus'], 'Jungle Potion NPCs');
search(items, ['Ardrigal', 'Sito foil', 'Volencia', 'Rogues purse', 'Snake weed'], 'Jungle Potion Items');

// Merlin's Crystal
search(npcs, ['King Arthur', 'Merlin', 'Morgan Le', 'Lady of the lake', 'Gawain', 'Lancelot', 'Mordred', 'Thrantax', 'Beggar'], 'Merlins Crystal NPCs');
search(items, ['Excalibur', 'Insect repellent', 'Black candle', 'Bat bones', 'shatter'], 'Merlins Crystal Items');

// Murder Mystery
search(npcs, ['Sinclair', 'Anna', 'Bob', 'Carol', 'David', 'Elizabeth', 'Frank', 'Gossip', 'Hobbes', 'Louisa', 'Mary', 'Pierre', 'Stanford', 'Poison Salesman'], 'Murder Mystery NPCs');
search(items, ['Murder', 'Pot', 'Dagger', 'Thread', 'Flypaper', 'Manure'], 'Murder Mystery Items');

// Observatory
search(npcs, ['Professor', 'Simon', 'Goblin guard'], 'Observatory NPCs');
search(items, ['Lens', 'Mould', 'Chart', 'Quadrant'], 'Observatory Items');
