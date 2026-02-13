// https://classic.runescape.wiki/w/Goblin_Armour
const { Items } = require('../../../../constants/ids');

const ARMOUR_ID = Items.GOBLIN_ARMOUR || 273; // 273
const BLUE_ARMOUR_ID = Items.GOBLIN_ARMOUR || 273; // 273
const BLUE_DYE_ID = Items.BLUE_DYE || 272; // 272
const ORANGE_ARMOUR_ID = Items.GOBLIN_ARMOUR || 273; // 273
const ORANGE_DYE_ID = Items.ORANGE_DYE || 282; // 282

async function onUseWithInventory(player, item, target) {
    if (
        (item.id === ARMOUR_ID && target.id === BLUE_DYE_ID) ||
        (item.id === BLUE_DYE_ID && target.id === ARMOUR_ID)
    ) {
        player.inventory.remove(ARMOUR_ID);
        player.inventory.remove(BLUE_DYE_ID);
        player.inventory.add(BLUE_ARMOUR_ID);
        player.message('You dye the goblin armor');
        return true;
    } else if (
        (item.id === ARMOUR_ID && target.id === ORANGE_DYE_ID) ||
        (item.id === ORANGE_DYE_ID && target.id === ARMOUR_ID)
    ) {
        player.inventory.remove(ARMOUR_ID);
        player.inventory.remove(ORANGE_DYE_ID);
        player.inventory.add(ORANGE_ARMOUR_ID);
        player.message('You dye the goblin armor');
        return true;
    }

    return false;
}

module.exports = { onUseWithInventory };
