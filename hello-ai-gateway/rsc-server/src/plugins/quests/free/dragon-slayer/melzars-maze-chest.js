const { Items, Objects } = require('../../../../constants/ids');

const CLOSED_CHEST_ID = Objects.CLOSED_CHEST_229 || 229; // 229
const OPEN_CHEST_ID = Objects.OPEN_CHEST || 18; // 18
const SECOND_MAP_PIECE_ID = Items.MAP_PIECE; // 416

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id === OPEN_CHEST_ID) {
        if (
            player.cache.melzarsChestMapPiece &&
            !player.inventory.has(SECOND_MAP_PIECE_ID)
        ) {
            delete player.cache.melzarsChestMapPiece;
            player.inventory.add(SECOND_MAP_PIECE_ID);
            player.message('You find a piece of map in the chest');
        } else {
            player.message('You find nothing in the chest');
        }

        return true;
    } else if (gameObject.id === CLOSED_CHEST_ID) {
        const { world } = player;

        world.replaceEntity('gameObjects', gameObject, OPEN_CHEST_ID);
        player.message('You open the chest');

        return true;
    }

    return false;
}

async function onGameObjectCommandTwo(player, gameObject) {
    if (gameObject.id !== OPEN_CHEST_ID) {
        return false;
    }

    const { world } = player;

    world.replaceEntity('gameObjects', gameObject, CLOSED_CHEST_ID);
    player.message('You close the chest');

    return true;
}

module.exports = { onGameObjectCommandOne, onGameObjectCommandTwo };
