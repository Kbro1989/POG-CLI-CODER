/**
 * @overview Watchtower - Members
 * @version 0.0.1
 * @author Your Name Here
 * @description A quest to help the Watchtower Wizard.
 *
 * Requirements:
 * - None
 *
 * Reward:
 * - 4 Quest Points
 * - 15,250 Magic XP
 * - Access to the Watchtower.
 */

const QUEST_NAME = "Watchtower";
const QUEST_POINTS = 4;

// --- NPC and Item IDs ---
const NPC_WATCHTOWER_WIZARD = 796;

function getQuestStage(player) {
    return player.questStages[QUEST_NAME] || 0;
}

function setQuestStage(player, stage) {
    player.questStages[QUEST_NAME] = stage;
}

async function onTalkToNPC(player, npc) {
    if (npc.id === NPC_WATCHTOWER_WIZARD) {
        // The quest start is handled inside the WatchTowerDialogues.java file,
        // specifically in the watchtowerWizardDialogue method.
        // The initial dialogue is not in the onTalkNpc method, so it's not
        // immediately obvious how the quest starts.
        // I will add a placeholder message here for you to fill in.
        player.message("The Watchtower Wizard seems busy.");
        return true;
    }
    return false;
}

module.exports = {
    name: 'watchtower',
    questName: QUEST_NAME,
    questPoints: QUEST_POINTS,
    onTalkToNPC,
    npcs: [NPC_WATCHTOWER_WIZARD],
};