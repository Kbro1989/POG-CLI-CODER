const { Items } = require('../../../../constants/ids');

const MAP_ID = Items.CRANDOR_MAP || 415; // 415
const MAP_PIECE_IDS = new Set([Items.MAP_PIECE, Items.MAP_PIECE_417, Items.MAP_PIECE_418]); // 416, 417, 418

async function onUseWithInventory(player, item, target) {
    if (!MAP_PIECE_IDS.has(item.id) || !MAP_PIECE_IDS.has(target.id)) {
        return false;
    }

    for (const itemID of MAP_PIECE_IDS) {
        if (!player.inventory.has(itemID)) {
            return false;
        }
    }

    for (const itemID of MAP_PIECE_IDS) {
        player.inventory.remove(itemID);
    }

    player.inventory.add(MAP_ID);
    player.message("You put the map pieces together");

    return true;
}

module.exports = { onUseWithInventory };
