const { rollNPCMagicDamage } = require('../../combat');

const { Npcs } = require('../../constants/ids');

const WIZARD_IDS = new Set([
    Npcs.DARK_WIZARD || 57, // 57
    Npcs.DARK_WIZARD_60 || 60, // 60
    Npcs.WIZARD || 81, // 81
    Npcs.WIZARD_314 || 314 // 314
]);

const FIRE_STRIKE = {
    maxHit: 8,
    projectile: 1, // Assuming 1 is a generic spell projectile
    name: 'Fire Strike'
};

async function onNPCCombat(npc, opponent) {
    if (!WIZARD_IDS.has(npc.id)) {
        return false;
    }

    // 20% chance to cast a spell
    if (Math.random() > 0.2) {
        return false;
    }

    const spell = FIRE_STRIKE;

    opponent.message(`@que@The ${npc.definition.name} casts ${spell.name} at you!`);
    npc.sendProjectile(opponent, spell.projectile);

    const damage = rollNPCMagicDamage(npc, opponent, spell.maxHit);

    // Apply damage
    opponent.damage(damage, npc);

    // Return true to block the standard melee attack
    return true;
}

module.exports = { onNPCCombat };
