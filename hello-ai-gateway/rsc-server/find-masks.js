const items = require('@2003scape/rsc-data/config/items');

console.log(`Total items: ${items.length}`);

items.forEach((item, index) => {
    if (item.name && item.name.toLowerCase().includes('mask')) {
        console.log(`${index}: ${item.name} - equip: ${JSON.stringify(item.equip)}`);
    }
});
