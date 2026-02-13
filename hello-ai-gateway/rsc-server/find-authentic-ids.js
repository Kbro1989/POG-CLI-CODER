// Find correct authentic IDs from @2003scape/rsc-data for all equipment
const items = require('@2003scape/rsc-data/config/items');

const searches = [
    // Helmets
    'bronze med', 'iron med', 'steel med', 'mithril med', 'adamant med', 'rune med',
    'bronze large', 'iron large', 'steel large', 'mithril large', 'adamant large', 'rune large',
    // Plate Bodies
    'bronze plate mail body', 'iron plate mail body', 'steel plate mail body',
    'mithril plate mail body', 'adamantite plate mail body', 'rune plate mail body',
    // Plate Legs
    'bronze plate mail leg', 'iron plate mail leg', 'steel plate mail leg',
    'mithril plate mail leg', 'adamantite plate mail leg', 'rune plate mail leg',
    // Kite Shields
    'bronze kite', 'iron kite', 'steel kite', 'mithril kite', 'adamantite kite', 'rune kite',
    // Long Swords
    'bronze long', 'iron long', 'steel long', 'mithril long', 'adamantite long', 'rune long',
    // 2H Swords
    'bronze 2-handed', 'iron 2-handed', 'steel 2-handed', 'mithril 2-handed', 'adamantite 2-handed', 'rune 2-handed',
    // Battle Axes
    'bronze battle', 'iron battle', 'steel battle', 'mithril battle', 'adamantite battle', 'rune battle',
    // Dragon items
    'dragon med', 'dragon square', 'dragon long', 'dragon axe', 'dragon sword',
    // Rares
    'party hat', 'halloween mask', 'christmas cracker', 'disk of return', 'bunny', 'easter egg', 'santa', 'scythe'
];

console.log('=== AUTHENTIC ITEM IDS (from @2003scape/rsc-data) ===\n');

searches.forEach(term => {
    const matches = [];
    items.forEach((item, id) => {
        if (item.name && item.name.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ id, name: item.name });
        }
    });
    if (matches.length > 0) {
        console.log(`"${term}":`);
        matches.slice(0, 5).forEach(m => console.log(`  ${m.id}: ${m.name}`));
        if (matches.length > 5) console.log(`  ... and ${matches.length - 5} more`);
    }
});
