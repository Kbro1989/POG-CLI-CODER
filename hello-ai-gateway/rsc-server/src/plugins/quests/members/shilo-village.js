/**
 * @overview Shilo Village - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to cleanse Shilo Village of the undead.
 *
 * Requirements:
 * - None
 *
 * Reward:
 * - 2 Quest Points
 * - 2,825 Crafting XP
 * - Access to Shilo Village
 */

const QUEST_NAME = "Shilo Village";
const QUEST_POINTS = 2;

// --- NPC and Item IDs ---
const NPC_MOSOL_REI = 795;

function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_MOSOL_REI) {
        const stage = getQuestStage(player);

        if (stage === 0) {
            player.message("Mosol seems to be looking around very cautiously.");
            player.message("He jumps a little when you approach and talk to him.");
            await npc.say("Run! Run for your life!", "Save yourself!", "I'll keep them back as long as I can...");
            const menu = await player.ask(["Why do I need to run?", "Yeah..Ok, I'm running!", "Who are you?"]);
            if (menu === 0) {
                await npc.say("Your very life is in danger!", "Rashiliyia has returned and we are all doomed!");
                const menu3 = await player.ask(["Rashiliyia? Who is she?", "What danger is there around here?"]);
                if (menu3 === 0) {
                    await npc.say("Rashiliyia? She is the Queen of the dead!", "She has returned and has bought a plague of undead with her.", "They now occupy our village and we have them trapped.", "We warn people like yourself to stay away!");
                    const menu4 = await player.ask(["What can we do?", "Uh, it sounds nasty, just the kind of thing I want to avoid!"]);
                    if (menu4 === 0) {
                        await npc.say("We are doing all that we can just to keep the undead at bay!", "The village is covered in a deadly green mist.", "If you go into the village, a terrible sickness will befall you.", "And the undead creatures are even stonger beyond the gates.", "My guess is that it has something to do with the legend of Rashiliyia.", "But you would need to speak to the Witch Doctor in the Tai Bwo Wannai village.", "To get more details about that.", "I really have to go now and fight these undead!");
                        setQuestStage(player, 1);
                    } else if (menu4 === 1) {
                        player.message("Mosol casts a disaproving glance at you");
                        await npc.say("Quite right, bwana, please make all haste!", "Before your spine turns to water as we speak.");
                    }
                } else if (menu3 === 1) {
                    await npc.say("Can you not see Bwana?", "This whole area is infested with the Living dead.");
                }
            } else if (menu === 1) {
                await npc.say("God speed to you my friend!");
            } else if (menu === 2) {
                await npc.say("I am Mosol Rei, a jungle warrior. ", "I used to live in this village.", "But it is too dangerous for you to stay around here!");
                const menu2 = await player.ask(["Mosol Rei, that's a nice name.", "What danger is there around here?"]);
                if (menu2 === 0) {
                    player.message("Mosol looks at you and shakes his head in bewilderment.");
                    await npc.say("Thanks! But you really should leave!");
                } else if (menu2 === 1) {
                    await npc.say("Can you not see Bwana?", "This whole area is infested with the Living dead.");
                }
            }
        }
        return true;
    }
    return false;
}

module.exports = {
    name: 'shilo-village',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    npcs: [NPC_MOSOL_REI],
};