// https://classic.runescape.wiki/w/Firemaking

// https://oldschool.runescape.wiki/w/Fire#cite_note-1
// > Mod Ash: "[How long do fires last roughly (or precisely if you wish to be
// > so kind)?] 60-119 secs randomly."

const GameObject = require('../../model/game-object');
const GroundItem = require('../../model/ground-item');
const { rollSkillSuccess, calcProductionSuccessfulLegacy } = require('../../rolls');
const { Items, Objects } = require('../../constants/ids');

const ASHES_ID = Items.ASHES;
const FIRE_ID = 97; // Objects.FIRE? If verified. 97 is standard fire.
const TINDERBOX_ID = Items.TINDERBOX;
const LOGS_ID = 14; // 2003scape authentic
const { logs } = require('@2003scape/rsc-data/skills/firemaking');

// 25% at level 1, 100% at level 60
const ROLL = [64, 392];

async function onUseWithGroundItem(player, item, groundItem) {
    // Check if item is a valid log
    if (item.id !== TINDERBOX_ID || !logs[groundItem.id]) {
        return false;
    }

    const { world } = player;
    const { x, y } = groundItem;

    const indoors = !!world.landscape.getTileAtGameCoords(x, y).getTileDef().indoors;

    if (indoors || world.gameObjects.getAtPoint(x, y).length) {
        player.message("@que@You can't light a fire here");
        return true;
    }

    const logDef = logs[groundItem.id];
    const level = player.skills.firemaking.current;

    if (level < logDef.level) {
        player.message(`@que@You need a firemaking level of ${logDef.level} to light these logs`);
        return true;
    }

    player.sendBubble(TINDERBOX_ID);
    player.message('@que@You attempt to light the logs');
    await world.sleepTicks(2);

    // Authentic Success: OpenRSC uses specific formulas but calcProductionSuccessfulLegacy 
    // with req=1 (for normal) and cap=60 works well. 
    // We scale the cap slightly for harder logs to ensure higher levels help.
    const fireSuccess = calcProductionSuccessfulLegacy(logDef.level, level, true, logDef.level + 40);

    if (fireSuccess) {
        world.removeEntity('groundItems', groundItem);

        player.message('@que@The fire catches and the logs begin to burn');

        const fire = new GameObject({
            id: FIRE_ID,
            x,
            y,
            spawnTick: world.tickCounter
        });

        world.addEntity('gameObjects', fire);

        world.setTickTimeout(() => {
            world.removeEntity('gameObjects', fire);
            world.addEntity('groundItems', new GroundItem({ id: ASHES_ID, x, y }));
        }, 100);

        player.sendStats();
        // Custom formula for XP
        player.addExperience('firemaking', logDef.xp * 2.5);
    } else {
        player.message('@que@You fail to light the logs');
    }

    return true;
}

async function onUseWithInventory(player, item, targetItem) {
    const isTinderboxOnLogs = (item.id === TINDERBOX_ID && logs[targetItem.id]) || (logs[item.id] && targetItem.id === TINDERBOX_ID);

    if (!isTinderboxOnLogs) {
        return false;
    }

    player.message('@que@You should put the logs on the ground to light them.');

    return true;
}

module.exports = { onUseWithGroundItem, onUseWithInventory };
