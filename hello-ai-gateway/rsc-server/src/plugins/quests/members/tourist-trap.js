/**
 * @overview Tourist Trap - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to rescue a damsel in distress.
 *
 * Requirements:
 * - Fletching: 10
 * - Smithing: 20
 *
 * Reward:
 * - 2 Quest Points
 * - 4,650 Agility XP
 * - 4,650 Thieving XP
 * - Ability to smith darts.
 */

const QUEST_NAME = "Tourist Trap";
const QUEST_POINTS = 2;

// --- NPC and Item IDs ---
const NPC_IRENA = 538;
const ITEM_ANA_IN_A_BARREL = 973;
const ITEM_WROUGHT_IRON_KEY = 1097;
const ITEM_COINS = 10;

function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_IRENA) {
        const stage = getQuestStage(player);

        if (stage === 0) {
            player.message("Irena seems to be very upset and cries as you start to approach her.");
            await npc.say("Boo hoo, oh dear, my only daughter....");
            const menu = await player.ask(["What's the matter?", "Cheer up, it might never happen."]);

            if (menu === 0) {
                await npc.say("Oh dear...my daughter, Ana, has gone missing in the desert.", "I fear that she is lost, or perhaps...*sob* even worse.");
                const matterMenu = await player.ask(["When did she go into the desert?", "What did she go into the desert for?", "Is there a reward if I get her back?"]);
                // TODO: Implement these conversation branches
            } else if (menu === 1) {
                await npc.say("It may already have happened you thoughtless oaf!", "My daughter, Ana, could be dead or dying in the desert!!!");
                const newMenu = await player.ask(["When did she go into the desert?", "What did she go into the desert for?", "Is there a reward if I get her back?"]);
                // TODO: Implement these conversation branches
            }
        }
        return true;
    }
    return false;
}

module.exports = {
    name: 'tourist-trap',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    npcs: [NPC_IRENA],
    items: [ITEM_ANA_IN_A_BARREL, ITEM_WROUGHT_IRON_KEY, ITEM_COINS],
};