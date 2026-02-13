/**
 * @overview Witch's House - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to help a boy retrieve his ball.
 *
 * Requirements:
 * - None
 *
 * Reward:
 * - 4 Quest Points
 * - 2,425 Hitpoints XP
 */

const QUEST_NAME = "Witch's House";
const QUEST_POINTS = 4;

// --- NPC and Item IDs ---
// TODO: Fill in with the correct IDs from your items.json and npcs.json
const NPC_BOY = 0;
const ITEM_BALL = 0;

function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_BOY) {
        const stage = getQuestStage(player);

        if (stage === 0) {
            await player.say("Hello young man");
            player.message("The boy sobs");
            const first = await player.ask(["What's the matter?", "Well if you're not going to answer, I'll go"]);
            if (first === 0) {
                await npc.say("I've kicked my ball over that wall, into that garden", "The old lady who lives there is scary", "She's locked the ball in her wooden shed", "Can you get my ball back for me please");
                const second = await player.ask(["Ok, I'll see what I can do", "Get it back yourself"]);
                if (second === 0) {
                    await player.say("Ok I'll see what I can do");
                    await npc.say("Thankyou");
                    setQuestStage(player, 1);
                } else {
                    await player.say("Get it back yourself");
                }
            } else {
                player.message("The boy sniffs slightly");
            }
        } else if (stage >= 1) {
            if (player.inventory.has(ITEM_BALL)) {
                await player.say("Hi I have got your ball back", "It was harder than I thought it would be");
                await npc.say("Thankyou very much");
                player.inventory.remove(ITEM_BALL, 1);
                player.sendQuestComplete(QUEST_NAME);
                setQuestStage(player, -1);
            } else {
                await npc.say("Have you got my ball back yet?");
                await player.say("Not yet");
                await npc.say("Well it's in the shed in that garden");
            }
        } else { // Quest Complete
             await npc.say("Thankyou for getting my ball back");
        }
        return true;
    }
    return false;
}

async function onUseItemOnObject(player, item, object) {
    // TODO: Implement item on object logic
    return false;
}

module.exports = {
    name: 'witchs-house',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    onUseItemOnObject,
    npcs: [NPC_BOY],
    items: [ITEM_BALL],
};
