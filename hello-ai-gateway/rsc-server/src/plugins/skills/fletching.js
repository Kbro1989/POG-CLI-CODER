const { bows, arrows, darts } = require('@2003scape/rsc-data/skills/fletching');
const { Items } = require('../../constants/ids');

const KNIFE_ID = Items.KNIFE;
const BOWSTRING_ID = Items.BOW_STRING;
const FEATHER_ID = Items.FEATHER;

// Log IDs that can be made into bows
const BOW_LOG_IDS = new Set(Object.keys(bows).map(Number));

// Arrow shaft headless IDs -> finished arrow mapping
const ARROW_HEADS = new Set(Object.keys(arrows).map(Number));

// Dart tip IDs
const DART_TIPS = new Set(Object.keys(darts).map(Number));

// Build reverse mapping: unstrung bow ID -> log ID and bow type
const UNSTRUNG_TO_LOG = {};
const BOWSTRING_ITEMS = {};

for (const [logId, bowTypes] of Object.entries(bows)) {
    for (const bowType of bowTypes) {
        UNSTRUNG_TO_LOG[bowType.unstrung] = {
            logId: Number(logId),
            ...bowType
        };
        BOWSTRING_ITEMS[bowType.unstrung] = bowType.strung;
    }
}

const UNSTRUNG_BOW_IDS = new Set(Object.keys(UNSTRUNG_TO_LOG).map(Number));
const ARROW_SHAFT_ID = Items.ARROW_SHAFTS;
const HEADLESS_ARROW_ID = Items.HEADLESS_ARROWS;

// === Bow Making (Step 1: Knife + Log) ===
async function cutBow(player, log) {
    const bowData = bows[log.id];

    if (!bowData || bowData.length === 0) {
        return false;
    }

    // Show menu for shortbow/longbow + Arrow Shafts (only for normal logs)
    const options = bowData.map((bow, index) => {
        return `${index === 0 ? 'Shortbow' : 'Longbow'} (level ${bow.level})`;
    });

    if (log.id === 14) { // Normal Log
        options.push('Arrow Shafts');
    }

    const choice = await player.ask(options, true);

    if (choice === -1) {
        return true;
    }

    // Normal log handling with Arrow Shafts option
    if (log.id === 14 && choice === options.length - 1) {
        // Make Arrow Shafts
        const fletchingLevel = player.skills.fletching.current;
        if (fletchingLevel < 1) {
            player.message('You need a fletching level of 1 to make arrow shafts');
            return true;
        }
        // How many?
        const amountMenu = await player.ask(['Make 10 Shafts', 'Make All Shafts'], true);
        if (amountMenu === -1) return true;

        const amount = amountMenu === 0 ? 1 : player.inventory.count(log.id);
        let made = 0;

        // Loop for batch creation (authentic delay or instant? Usually instant or fast loop)
        // We do instant for UX or loop with delay. Let's do simple loop.
        for (let i = 0; i < amount; i++) {
            if (player.inventory.remove(log.id, 1)) {
                player.inventory.add(ARROW_SHAFT_ID, 10);
                player.addExperience('fletching', 5); // 5 XP per log (0.5 per shaft equivalent?)
                made++;
            } else {
                break;
            }
        }
        if (made > 0) player.message(`@que@You carefully cut the wood into ${made * 10} arrow shafts`);
        return true;
    }

    const selectedBow = bowData[choice];
    const fletchingLevel = player.skills.fletching.current;

    if (fletchingLevel < selectedBow.level) {
        player.message(
            `@que@You need a fletching level of ${selectedBow.level} to make this bow`
        );
        return true;
    }

    // Remove log, create unstrung bow
    const removed = player.inventory.remove(log.id, 1);

    if (!removed) {
        return true;
    }

    player.inventory.add(selectedBow.unstrung, 1);
    player.addExperience('fletching', selectedBow.experience);
    player.message('@que@You carefully cut the wood into shape');

    return true;
}

// === Bow Making (Step 2: Bowstring + Unstrung Bow) ===
async function stringBow(player, bowstring, unstrungBow) {
    const bowData = UNSTRUNG_TO_LOG[unstrungBow.id];

    if (!bowData) {
        return false;
    }

    const fletchingLevel = player.skills.fletching.current;

    if (fletchingLevel < bowData.level) {
        player.message(
            `@que@You need a fletching level of ${bowData.level} to string this bow`
        );
        return true;
    }

    // Remove bowstring and unstrung bow
    if (!player.inventory.remove(bowstring.id, 1)) {
        return true;
    }

    if (!player.inventory.remove(unstrungBow.id, 1)) {
        player.inventory.add(bowstring.id, 1); // Restore bowstring
        return true;
    }

    player.inventory.add(bowData.strung, 1);
    player.addExperience('fletching', bowData.experience);
    player.message('@que@You add a string to the bow');

    return true;
}

// === Arrow Making (Step 2: Shaft + Feather) ===
async function makeHeadlessArrows(player, shaft, feather) {
    // Check levels (1)
    // Make 10 or All
    const amountMenu = await player.ask(['Make 10 Headless Arrows', 'Make All Headless Arrows'], true);
    if (amountMenu === -1) return true;

    // 1 Shaft + 1 Feather = 1 Headless Arrow
    // Wait, 1 Shaft? or 10 Shafts?
    // Unfinished items usually 1:1.
    // RSC: 1 Shaft + 1 Feather = 1 Headless Arrow.
    // But we usually make them in batches of 10?
    // Logic: Min(shafts, feathers, desired).

    const maxPossible = Math.min(player.inventory.count(shaft.id), player.inventory.count(feather.id));
    const desired = amountMenu === 0 ? 10 : maxPossible;
    const actual = Math.min(maxPossible, desired);

    if (actual <= 0) {
        player.message('You need arrow shafts and feathers to make headless arrows');
        return true;
    }

    for (let i = 0; i < actual; i++) {
        player.inventory.remove(shaft.id, 1);
        player.inventory.remove(feather.id, 1);
        player.inventory.add(HEADLESS_ARROW_ID, 1);
        player.addExperience('fletching', 1);
    }
    player.message(`@que@You attach feathers to ${actual} arrow shafts`);
    return true;
}

async function onUseWithInventory(player, item, targetItem) {
    // Knife on Logs
    if (item.id === KNIFE_ID && BOW_LOG_IDS.has(targetItem.id)) {
        return await cutBow(player, targetItem);
    }
    if (targetItem.id === KNIFE_ID && BOW_LOG_IDS.has(item.id)) {
        return await cutBow(player, item);
    }

    // Bowstring on Unstrung Bow
    if (item.id === BOWSTRING_ID && UNSTRUNG_BOW_IDS.has(targetItem.id)) {
        return await stringBow(player, item, targetItem);
    }
    if (targetItem.id === BOWSTRING_ID && UNSTRUNG_BOW_IDS.has(item.id)) {
        return await stringBow(player, targetItem, item);
    }

    // Feather on Arrow Shaft
    if (item.id === FEATHER_ID && targetItem.id === ARROW_SHAFT_ID) {
        return await makeHeadlessArrows(player, targetItem, item);
    }
    if (targetItem.id === FEATHER_ID && item.id === ARROW_SHAFT_ID) {
        return await makeHeadlessArrows(player, item, targetItem);
    }

    // Arrowhead on Headless Arrow
    if (ARROW_HEADS.has(item.id) && targetItem.id === HEADLESS_ARROW_ID) {
        return await makeArrow(player, targetItem, item);
    }
    if (ARROW_HEADS.has(targetItem.id) && item.id === HEADLESS_ARROW_ID) {
        return await makeArrow(player, item, targetItem);
    }

    return false;
}

module.exports = { onUseWithInventory };
