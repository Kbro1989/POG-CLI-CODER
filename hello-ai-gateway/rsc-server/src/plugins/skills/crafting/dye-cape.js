// https://classic.runescape.wiki/w/Cape

const { Items } = require('../../../constants/ids');

const BLACK_CAPE_ID = Items.CAPE_209;

// { dyeID: capeID }
const DYE_CAPE_IDS = {
    // red
    [Items.REDDYE]: Items.CAPE,
    // orange
    [Items.ORANGEDYE]: 513, // Orange cape - need to verify constant
    // yellow
    [Items.YELLOWDYE]: 512, // Yellow cape - need to verify constant
    // green
    515: 511, // Green dye -> Green cape
    // blue
    [Items.BLUEDYE]: Items.CAPE_229,
    // purple
    516: 514 // Purple dye -> Purple cape
};

const DYE_IDS = new Set(Object.keys(DYE_CAPE_IDS).map(Number));

const CAPE_IDS = new Set(Object.values(DYE_CAPE_IDS));
CAPE_IDS.add(BLACK_CAPE_ID);

async function onUseWithInventory(player, item, target) {
    let capeID = -1;
    let dyeID = -1;

    if (CAPE_IDS.has(item.id) && DYE_IDS.has(target.id)) {
        capeID = item.id;
        dyeID = target.id;
    } else if (CAPE_IDS.has(target.id) && DYE_IDS.has(item.id)) {
        capeID = target.id;
        dyeID = item.id;
    }

    if (capeID > -1) {
        player.inventory.remove(capeID);
        player.inventory.remove(dyeID);
        player.inventory.add(DYE_CAPE_IDS[dyeID]);
        player.addExperience('crafting', 10);
        player.message('You dye the Cape');
        return true;
    }

    return false;
}

module.exports = { onUseWithInventory };
