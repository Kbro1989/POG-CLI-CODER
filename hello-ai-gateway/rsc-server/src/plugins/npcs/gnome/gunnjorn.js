// Gunnjorn (Gnome Stronghold Agility Course)
const { Npcs } = require('../../../constants/ids');

const GUNNJORN_ID = Npcs.GUNNJORN || 588; // 588

async function onTalkToNPC(player, npc) {
    if (npc.id !== GUNNJORN_ID) return false;
    player.engage(npc);

    await npc.say("Haha welcome to my obstacle course",
        "Have fun, but remember this isn't a child's playground",
        "People have died here", "The best way to train",
        "Is to go round the course in a clockwise direction");

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
