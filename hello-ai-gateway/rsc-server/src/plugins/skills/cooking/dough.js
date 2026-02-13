// https://classic.runescape.wiki/w/Dough

const Item = require('../../../model/item');
const items = require('@2003scape/rsc-data/config/items');
const { doughs } = require('@2003scape/rsc-data/skills/cooking');
const { Items } = require('../../../constants/ids');

const FLOUR_ID = Items.FLOUR_136;
const POT_ID = Items.POT;

// bucket and jug (Water bucket = 50, Water jug = 141)
const WATER_IDS = new Set([Items.WATER, Items.WATER_141]);

async function onUseWithInventory(player, item, target) {
    if (
        (item.id !== FLOUR_ID || !WATER_IDS.has(target.id)) &&
        (!WATER_IDS.has(item.id) || target.id !== FLOUR_ID)
    ) {
        return false;
    }

    const { world } = player;

    player.message('What would you like to make?');

    const choices = doughs
        .filter(({ id }) => (!world.members ? !items[id].members : true))
        .map(({ alias }) => alias);

    const choice = await player.ask(choices, false);
    const { id } = doughs[choice];

    const waterID = target.id === FLOUR_ID ? item.id : target.id;

    player.inventory.remove(waterID);
    player.inventory.remove(FLOUR_ID);
    player.inventory.add(Item.getEmptyWater(waterID));
    player.inventory.add(POT_ID);
    player.inventory.add(id);

    player.message(
        '@que@You mix the water and flour to make some ' +
        items[id].name.toLowerCase()
    );

    return true;
}

module.exports = { onUseWithInventory };
