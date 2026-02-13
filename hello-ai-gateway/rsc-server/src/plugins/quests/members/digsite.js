/**
 * @overview Digsite Quest - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to unearth the secrets of the digsite.
 *
 * Requirements:
 * - None
 *
 * Reward:
 * - 2 Quest Points
 * - 15,300 Mining XP
 * - 2,000 Herblaw XP
 * - 2 Gold Bars
 */

const QUEST_NAME = "Digsite";
const QUEST_POINTS = 2;

// --- NPC and Item IDs ---
const NPC_ARCHAEOLOGICAL_EXPERT = 727;
const ITEM_CRACKED_ROCK_SAMPLE = 1080;
const ITEM_DIGSITE_SCROLL = 1241;
const ITEM_AMMONIUM_NITRATE = 1089;
const ITEM_STONE_TABLET = 1103;
const ITEM_GOLD_BAR = 171;
const ITEM_BROKEN_ARROW = 1094;
const ITEM_BROKEN_STAFF = 1096;
const ITEM_BUTTONS = 1095;
const ITEM_CERAMIC_REMAINS = 1098;
const ITEM_ROCK_SAMPLE = 1049;
const ITEM_VASE = 1097;
const ITEM_BONES = 20;
const ITEM_NEEDLE = 39;

function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_ARCHAEOLOGICAL_EXPERT) {
        const stage = getQuestStage(player);

        if (stage === -1) {
            await npc.say("Hello again", "I am now studying this mysterious altar and its inhabitants", "The markings are strange, but it refers to a god I have never", "heard of before named Zaros. It must be some pagan superstition.", "That was a great find, who knows what other secrets", "Lie buried beneath the surface of our land...");
        } else {
            await player.say("Hello, who are you ?");
            await npc.say("Good day to you", "My name is Terry balando", "I am an expert on digsite finds", "I am employed by the museum in varrock", "To oversee all finds in this digsite", "Anything you find must be reported to me");
            await player.say("Oh, okay if I find anything of interest I will bring it here");
            await npc.say("Very good", "Can I help you at all ?");
            const menu = await player.ask(["I have something I need checking out", "No thanks", "Can you tell me anything about the digsite?"]);
            if (menu === 0) {
                await player.say("I have something I need checking out");
                await npc.say("Okay, give it to me and I'll have a look for you");
            } else if (menu === 1) {
                await player.say("No thanks");
                await npc.say("Good, let me know if you find anything unusual");
            } else if (menu === 2) {
                await player.say("Can you tell me anything about the digsite ?");
                await npc.say("Yes indeed, I am currently studying the lives of the settlers", "During the end of the third age, this used to be a great city", "It's inhabitants were humans, supporters of the god Saradomin", "It's not recorded what happened to the community here", "I suspect nobody has lived here for over a millenium!");
            }
        }
        return true;
    }
    return false;
}

module.exports = {
    name: 'digsite',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    npcs: [NPC_ARCHAEOLOGICAL_EXPERT],
    items: [ITEM_CRACKED_ROCK_SAMPLE, ITEM_DIGSITE_SCROLL, ITEM_AMMONIUM_NITRATE, ITEM_STONE_TABLET, ITEM_GOLD_BAR, ITEM_BROKEN_ARROW, ITEM_BROKEN_STAFF, ITEM_BUTTONS, ITEM_CERAMIC_REMAINS, ITEM_ROCK_SAMPLE, ITEM_VASE, ITEM_BONES, ITEM_NEEDLE],
};