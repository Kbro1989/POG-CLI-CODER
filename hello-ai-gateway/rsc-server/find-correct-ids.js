// Find correct IDs in @2003scape/rsc-data for mismatched items
const items = require('@2003scape/rsc-data/config/items');

const searchTerms = [
    'lobster', 'swordfish', 'shark', 'meat pizza',
    'beer', 'wine', 'grog', 'dragon bitter',
    'bronze med', 'steel med', 'addy med', 'rune med',
    'bronze plate', 'steel plate', 'addy plate', 'adamant plate',
    'addy legs', 'adamant legs', 'dragon legs',
    'steel kite', 'addy kite', 'adamant kite',
    'steel sword', 'addy sword', 'adamant sword',
    'steel 2h', 'addy 2h', 'adamant 2h',
    'bronze axe', 'bronze battle', 'steel axe', 'steel battle', 'addy axe', 'addy battle',
    'shortbow', 'longbow',
    'red phat', 'yellow phat', 'blue phat', 'green phat', 'purple phat', 'white phat',
    'red mask', 'green mask', 'blue mask',
    'disk of return',
    'bunny ears',
    'santa hat',
    'coal',
    'air rune', 'chaos rune', 'death rune', 'blood rune'
];

console.log('=== CORRECT IDS FROM @2003scape/rsc-data ===\n');

searchTerms.forEach(term => {
    const matches = [];
    items.forEach((item, index) => {
        if (item.name && item.name.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ id: index, name: item.name });
        }
    });
    if (matches.length > 0) {
        console.log(`"${term}":`);
        matches.forEach(m => console.log(`  ${m.id}: ${m.name}`));
    } else {
        console.log(`"${term}": NOT FOUND`);
    }
});
