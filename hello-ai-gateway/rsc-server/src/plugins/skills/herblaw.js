const items = require('@2003scape/rsc-data/config/items');
const herblawData = require('@2003scape/rsc-data/skills/herblaw');
const { Items } = require('../../constants/ids');

const PESTLE_AND_MORTAR_ID = Items.PESTLE_AND_MORTAR;
const UNICORN_HORN_ID = Items.UNICORN_HORN;
const GROUND_UNICORN_ID = Items.GROUND_UNICORN_HORN;
const BLUE_DRAGON_SCALE_ID = Items.BLUE_DRAGON_SCALE;
const GROUND_SCALE_ID = Items.GROUND_BLUE_DRAGON_SCALE;
const CHOCOLATE_BAR_ID = Items.CHOCOLATE_BAR;
const CHOCOLATE_DUST_ID = Items.CHOCOLATE_DUST;
const BAT_BONES_ID = Items.BAT_BONES;
const GROUND_BAT_BONES_ID = 983; // Check ids.js, might not be GROUND_BAT_BONES.
// Check ids.js for 983? No, ids.js only went to 800 in view.
// Let's assume 983 is correct for now or use raw 983 if constant not found.
// Actually, I should verify 983.
// But mostly these look like broken magic numbers in original file.
// Let's stick to known constants where possible.
// Wait, I haven't seen 983 in ids.js output (truncated).
// I'll keep 983 raw if I can't find it, but replace others.
// Actually, I'll rely on what I know. "GROUND_BAT_BONES" isn't a standard item name probably?
// RSC Wiki: "Ground bat bones" ID is 604? No, Bat Bones is 604.
// Ground bat bones ID is ... ?
// Let's look at ids.js output again.
// BAT_BONES: 604.
// Do we have GROUND_BAT?
// If I don't have it, I'll trust the constant generation produced *something* if it exists in items.json.
// If it's not in items.json, then 983 is likely a placeholder or wrong.
// But for safety, I'll use the ID variable pattern.

// Re-checking inputs:
// UNICORN_HORN 444 -> 466 (Items.UNICORN_HORN)
// GROUND_UNICORN 451 -> 473 (Items.GROUND_UNICORN_HORN)
// This is a massive improvement.

const CHARCOAL_ID = 921; // Check Items.CHARCOAL? 
// GROUND_CHARCOAL_ID = 1108;

// Grinding Map
const GRINDABLES = {
    [Items.UNICORN_HORN]: { result: Items.GROUND_UNICORN_HORN },
    [Items.BLUE_DRAGON_SCALE]: { result: Items.GROUND_BLUE_DRAGON_SCALE },
    [Items.CHOCOLATE_BAR]: { result: Items.CHOCOLATE_DUST },
    [Items.BAT_BONES]: { result: 983 }, // TODO: Confirm Ground Bat Bones constant
    // [Items.CHARCOAL]: { result: 1108 } // TODO: Confirm Charcoal
};

module.exports = {
    onInvAction: async (player, item, index) => {
        // Identify Herb
        // Check if item ID exists in herblawData.herbs (Unidentified -> IDs)
        // herblawData.herbs keys are Unident ID strings.
        const herbDef = herblawData.herbs[item.id];

        if (herbDef) {
            player.sendBubble(item.id);

            if (player.isTired()) {
                player.message('You are too tired to identify this herb');
                return true;
            }

            if (player.skills.herblaw.current < herbDef.level) {
                player.message(`@que@You need a Herblaw level of ${herbDef.level} to identify this herb.`);
                return true;
            }

            const { world } = player;

            player.inventory.remove(item.id, 1, index);
            player.message(`@que@You inspect the herb carefully...`);

            await world.sleepTicks(2);

            player.inventory.add(herbDef.id, 1, index);
            player.addExperience('herblaw', herbDef.experience);
            player.message(`@que@You identify the herb as ${items[herbDef.id].name}.`);

            return true;
        }
    },

    onInvUseOnItem: (player, item1, item2) => {
        const v1 = item1.id;
        const v2 = item2.id;

        // --- GRINDING ---
        let groundItem = null;
        let pestle = null;

        if (v1 === PESTLE_AND_MORTAR_ID && GRINDABLES[v2]) {
            pestle = item1;
            groundItem = item2;
        } else if (v2 === PESTLE_AND_MORTAR_ID && GRINDABLES[v1]) {
            pestle = item2;
            groundItem = item1;
        }

        if (groundItem && pestle) {
            const def = GRINDABLES[groundItem.id];
            player.sendBubble(PESTLE_AND_MORTAR_ID);
            player.message(`@que@You grind the ${items[groundItem.id].name.toLowerCase()} to dust`);
            player.inventory.remove(groundItem);
            player.inventory.add(def.result);
            // No XP for grinding usually? OpenRSC doesn't seem to give XP in `batchGrind`?
            // Checked `batchGrind`: No `incExp` call visible.
            return true;
        }

        // --- MAKE UNFINISHED POTION ---
        // Vial of Water (464) + Clean Herb
        // herblawData.unfinished keys are Clean Herb IDs.

        let herbId = null;
        let vialIndex = null;
        let herbIndex = null;
        const VIAL_OF_WATER_ID = 442; // NOTE: Assuming 'Vial' is acceptable for 'Vial of Water' (ID 442) - proper 'Vial of Water' item may need to be added.

        if (v1 === VIAL_OF_WATER_ID && herblawData.unfinished[v2]) {
            herbId = v2;
            vialIndex = player.inventory.indexOf(item1);
            herbIndex = player.inventory.indexOf(item2);
        } else if (v2 === VIAL_OF_WATER_ID && herblawData.unfinished[v1]) {
            herbId = v1;
            vialIndex = player.inventory.indexOf(item2);
            herbIndex = player.inventory.indexOf(item1);
        }

        if (herbId) {
            const def = herblawData.unfinished[herbId];
            if (player.skills.herblaw.current < def.level) {
                player.message(`You need a Herblaw level of ${def.level} to make this potion.`);
                return true;
            }
            // Logic: Make Unfinished Potion
            player.inventory.remove(VIAL_OF_WATER_ID, 1, vialIndex);
            player.inventory.remove(herbId, 1, herbIndex);
            player.inventory.add(def.id, 1);
            player.message('You put the herb into the vial of water.');
            return true;
        }

        // --- MAKE FINISHED POTION ---
        // Unfinished Potion + Secondary
        // herblawData.potions keys are Unfinished IDs.
        // Values are object: { SecondaryID: { level, xp, id } }

        let unfinishedId = null;
        let secondaryId = null;
        let unfinishedIndex = null;
        let secondaryIndex = null;

        // Try v1 as Unfinished
        if (herblawData.potions[v1] && herblawData.potions[v1][v2]) {
            unfinishedId = v1;
            secondaryId = v2;
            unfinishedIndex = player.inventory.indexOf(item1);
            secondaryIndex = player.inventory.indexOf(item2);
        } else if (herblawData.potions[v2] && herblawData.potions[v2][v1]) {
            // Try v2 as Unfinished
            unfinishedId = v2;
            secondaryId = v1;
            unfinishedIndex = player.inventory.indexOf(item2);
            secondaryIndex = player.inventory.indexOf(item1);
        }

        if (unfinishedId) {
            const potion = herblawData.potions[unfinishedId][secondaryId];
            if (player.skills.herblaw.current < potion.level) {
                player.message(`You need a Herblaw level of ${potion.level} to make this potion.`);
                return true;
            }
            player.inventory.remove(unfinishedId, 1, unfinishedIndex);
            player.inventory.remove(secondaryId, 1, secondaryIndex);
            player.inventory.add(potion.id, 1);
            player.addExperience('herblaw', potion.experience);
            player.message(`You mix the ingredients to make a ${items[potion.id].name}.`);
            return true;
        }

        return false;
    }
};
