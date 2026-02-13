// https://classic.runescape.wiki/w/Dye

const { Items } = require('../../constants/ids');

const DYE_MIX_IDS = [
    // red + blue = purple
    { dye: Items.REDDYE, withDye: Items.BLUEDYE, result: 516 },
    // blue + yellow = green
    { dye: Items.BLUEDYE, withDye: Items.YELLOWDYE, result: 515 },
    // red + yellow = orange
    { dye: Items.REDDYE, withDye: Items.YELLOWDYE, result: Items.ORANGEDYE }
];

async function onUseWithInventory(player, item, target) {
    for (const { dye, withDye, result } of DYE_MIX_IDS) {
        if (
            (item.id === dye && target.id === withDye) ||
            (item.id === withDye && target.id === dye)
        ) {
            player.inventory.remove(dye);
            player.inventory.remove(withDye);
            player.inventory.add(result);
            player.message('You mix the dyes');
            return true;
        }
    }

    return false;
}

module.exports = { onUseWithInventory };
