module.exports = (listeners) => {
    listeners.add('canEquip', async (player, item) => {
        // Rune Plate Body
        if (item.id === 401 && !player.quests.isComplete('Dragon Slayer')) {
            player.message('You need to complete the Dragon Slayer quest to wear this.');
            return true; // Blocked
        }

        // Dragon Square Shield
        if (item.id === 1278 && !player.quests.isComplete('Dragon Slayer')) {
            player.message('You need to complete the Dragon Slayer quest to wear this.');
            return true; // Blocked
        }

        // Dragon Chainbody
        if (item.id === 620 && !player.quests.isComplete('Dragon Slayer')) {
            player.message('You need to complete the Dragon Slayer quest to wear this.');
            return true; // Blocked
        }

        // Green D'Hide Body
        if (item.id === 593 && !player.quests.isComplete('Dragon Slayer')) {
            player.message('You need to complete the Dragon Slayer quest to wear this.');
            return true; // Blocked
        }

        // Green D'Hide Body (female?) or alternate ID check if needed.

        return false; // Not blocked
    });
};
