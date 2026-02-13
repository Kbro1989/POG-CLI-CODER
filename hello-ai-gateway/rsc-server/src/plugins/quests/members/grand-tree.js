/**
 * @overview The Grand Tree - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to save the Grand Tree.
 *
 * Requirements:
 * - Agility: 25
 *
 * Reward:
 * - 5 Quest Points
 * - 18,400 Attack XP
 * - 7,900 Agility XP
 * - 2,150 Magic XP
 * - Access to the Gnome Stronghold.
 */

const QUEST_NAME = "The Grand Tree";
const QUEST_POINTS = 5;

// --- NPC and Item IDs ---
const NPC_KING_NARNODE_SHAREEN = 541;
const NPC_HAZELMERE = 546;
const NPC_GLOUGH = 547;
const NPC_CHARLIE = 794;
const NPC_SHIPYARD_WORKER_WHITE = 557;
const NPC_SHIPYARD_WORKER_BLACK = 557;
const NPC_SHIPYARD_FOREMAN = 560;
const NPC_FEMI = 563;
const NPC_ANITA = 565;
const ITEM_TREE_GNOME_TRANSLATION = 1251;
const ITEM_BARK_SAMPLE = 919;
const ITEM_GLOUGHS_NOTES = 1252;
const ITEM_PEBBLE_1 = 927;
const ITEM_PEBBLE_2 = 927;
const ITEM_PEBBLE_3 = 927;
const ITEM_PEBBLE_4 = 927;


function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_KING_NARNODE_SHAREEN) {
        const stage = getQuestStage(player);

        if (stage === 0) {
            await player.say("hello there");
            await npc.say("hello traveller, i'm king shareem, welcome", "it's nice to see an outsider");
            await player.say("it seems to be quite a busy settlement");
            await npc.say("for now it is, thankfully");
            player.message("King shareem seems troubled");
            const option = await player.ask(["you seem worried, what's wrong?", "well, i'll be on my way"]);
            if (option === 0) {
                await npc.say("adventurer, can i speak to you in the strictest confidence");
                await player.say("of course narnode");
                await npc.say("not here, follow me");
                player.message("king shareem bends down and places his hands on the stone tile");
                player.message("you here a creak as he turns the tile clockwise");
                player.message("the tile slides away, revealing a small tunnel");
                player.message("you follow king shareem down");
                // TODO: Teleport player to the underground area
                await player.say("so what is this place?");
                await npc.say("these my friend, are the foundations of the stronghold");
                await player.say("they just look like roots");
                await npc.say("not any roots traveller", "these were conjured in the past age by gnome mages", "since then, they have grown into our mighty stronghold");
                await player.say("impressive, but what exactly is the problem?");
                await npc.say("in the last two months our tree guardians have reported...", "...continuing deterioration of the grand trees health", "i've never seen this before, it could mean the end for all of us");
                await player.say("you mean the tree is ill");
                await npc.say("in a magical sense yes", "would you be willing to help us discover the cause of this illness");
                const op = await player.ask(["i'm sorry i don't want to get involved", "i'd be happy to help"]);
                if (op === 0) {
                    await npc.say("i understand traveller", "please keep this to yourself");
                    await player.say("of course");
                    await npc.say("i'll show you the way back up");
                    player.message("you follow king shareem up the ladder");
                    // TODO: Teleport player back up
                } else if (op === 1) {
                    await npc.say("thank guthix for you arrival", "the first task is to find out what's killing my tree");
                    await player.say("have you any ideas?");
                    await npc.say("my top tree guardian, glough, believes it's human sabotage", "i'm not so sure", "the only way to really know, is to talk to Hazelmere");
                    await player.say("who's hazelmere?");
                    await npc.say("a once all powerful mage who created the grand tree", "one of the only survivors of the old age", "take this bark sample to him, he should be able to help", "the mage only talks in the old tongue, you'll need this");
                    await player.say("what is it?");
                    await npc.say("a translation book, translate carefully, his words may save us all", "you'll find his dwellings high upon a towering hill..", "..on a island south of the khazard fight arena");
                    player.message("king shareem gives you a book and a bark sample");
                    player.inventory.add(ITEM_TREE_GNOME_TRANSLATION, 1);
                    player.inventory.add(ITEM_BARK_SAMPLE, 1);
                    await npc.say("i'll show you the way back up");
                    player.message("you follow king shareem up the ladder");
                    // TODO: Teleport player back up
                    setQuestStage(player, 1);
                }
            } else if (option === 1) {
                await npc.say("ok then, enjoy your stay with us", "there's many shops and sights to see");
            }
        }
        return true;
    }
    return false;
}

module.exports = {
    name: 'grand-tree',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    npcs: [NPC_KING_NARNODE_SHAREEN, NPC_HAZELMERE, NPC_GLOUGH, NPC_CHARLIE, NPC_SHIPYARD_WORKER_WHITE, NPC_SHIPYARD_WORKER_BLACK, NPC_SHIPYARD_FOREMAN, NPC_FEMI, NPC_ANITA],
    items: [ITEM_TREE_GNOME_TRANSLATION, ITEM_BARK_SAMPLE, ITEM_GLOUGHS_NOTES, ITEM_PEBBLE_1, ITEM_PEBBLE_2, ITEM_PEBBLE_3, ITEM_PEBBLE_4],
};