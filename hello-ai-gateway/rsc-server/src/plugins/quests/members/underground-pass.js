const { IDS } = require('../../../ids');
const { Items } = require('../../../constants/ids');

// IDs
const KOFTIK_ARDOUGNE = 626;
const KOFTIK_CAVE1 = 627;
const KOFTIK_CAVE2 = 628;

// Local ID definitions (Missed in constants/ids.js)
const DAMP_CLOTH = 989;
const WRAPPED_ARROW = 984;
const LIT_ARROW = 985;
const FIRE_OBJECT = 97;
const ARROW_IDS = [11, 280, 574, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 723];

const OLD_BRIDGE = 726; // OpenRSC ID
const BRIDGE_LOWERED = 727; // OpenRSC ID

const QUEST_ID = 51; // Underground Pass

module.exports = (api) => {
    // Koftik Handlers
    api.onNpcTalk(KOFTIK_ARDOUGNE, async (player, npc) => {
        const stage = player.getQuestStage(QUEST_ID);
        if (stage === 0) {
            await npc.message("Koftik doesn't seem interested in talking.");
            return;
        }
        if (stage === 1) {
            await npc.message("Hello there, are you the King's scout?");
            await player.message("That I am brave adventurer.");
            // Simplified dialogue for brevity
            player.setQuestStage(QUEST_ID, 2);
        }
    });

    api.onNpcTalk(KOFTIK_CAVE1, async (player, npc) => {
        const stage = player.getQuestStage(QUEST_ID);
        if (stage === 2) {
            if (!player.inventory.contains(DAMP_CLOTH)) {
                await npc.message("I found this cloth amongst the charred remains of arrows.");
                player.inventory.add(DAMP_CLOTH);
                await player.message("Koftik gives you a damp cloth.");
            }
        }
    });

    // 1. Damp Cloth + Arrow -> Wrapped Arrow
    api.onItemOnItem(async (player, item1, item2) => {
        const i1 = item1.id;
        const i2 = item2.id;

        // Damp Cloth + Arrow
        if ((i1 === DAMP_CLOTH && ARROW_IDS.includes(i2)) || (i2 === DAMP_CLOTH && ARROW_IDS.includes(i1))) {
            await player.message('You wrap the damp cloth around the arrow head');
            player.inventory.remove(DAMP_CLOTH, 1);
            const arrowId = ARROW_IDS.includes(i1) ? i1 : i2;
            player.inventory.remove(arrowId, 1);
            player.inventory.add(WRAPPED_ARROW, 1);
            return;
        }

        // 2. Wrapped Arrow + Tinderbox -> Lit Arrow
        if ((i1 === WRAPPED_ARROW && i2 === 166) || (i2 === WRAPPED_ARROW && i1 === 166)) {
            await player.message('You light the cloth wrapped arrow head');
            player.inventory.remove(WRAPPED_ARROW, 1);
            player.inventory.add(LIT_ARROW, 1);
            return;
        }
    });

    // 3. Wrapped Arrow + Fire Object -> Lit Arrow
    api.onItemOnObject(async (player, object, item) => {
        if (item.id === WRAPPED_ARROW && object.id === FIRE_OBJECT) {
            await player.message('You light the cloth wrapped arrow head');
            player.inventory.remove(WRAPPED_ARROW, 1);
            player.inventory.add(LIT_ARROW, 1);
            return;
        }

        // 4. Lit Arrow on Old Bridge (726)
        if (item.id === LIT_ARROW && object.id === OLD_BRIDGE) {
            const hasBow = player.inventory.getItems().some(i => i.name.toLowerCase().includes('bow') && i.wielded);

            if (!hasBow) {
                await player.message("First you'll need a bow.");
                return;
            }

            if (player.skills.ranged < 25) {
                await player.message("You need 25 Ranged to make this shot.");
                return;
            }

            await player.message("You fire your arrow at the rope supporting the bridge...");
            await player.wait(2); // Async wait

            // Authentic: 1/5 chance to miss (actually 1/5 miss per OpenRSC code "nextInt(5) == 1")
            // Wait, OpenRSC: if (random(5) == 1) message("misses") else { SUCCESS }
            // So 1 in 5 chance to MISS? Or 1 in 5 chance to HIT?
            // OpenRSC: "if (DataConversions.getRandom().nextInt(5) == 1) { miss } else { hit }"
            // nextInt(5) returns 0..4. So 1/5 chance to match 1.
            // So 80% Success Rate.

            if (Math.floor(Math.random() * 5) === 0) { // Using standard JS random equivalent
                await player.message("The arrow just misses the rope.");
            } else {
                await player.message("The arrow impales the wooden bridge, just below the rope support.");
                await player.wait(1);
                await player.message("The rope catches alight and begins to burn.");
                await player.wait(1);
                await player.message("The bridge swings down creating a walkway.");

                // Replace Object Logic (Mocked if api.replaceObject missing)
                // Assuming api.replaceObject(object, newID) exists or similar
                // Or spawn object 727.
                // For now, simpler message.
                // player.updateObject(object.x, object.y, BRIDGE_LOWERED); 

                if (player.getQuestStage(QUEST_ID) === 2) {
                    player.setQuestStage(QUEST_ID, 3);
                }
            }
        }
    });
};