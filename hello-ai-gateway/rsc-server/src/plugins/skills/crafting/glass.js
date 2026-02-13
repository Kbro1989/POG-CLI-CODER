const items = require('@2003scape/rsc-data/config/items');
const { glassblowing } = require('@2003scape/rsc-data/skills/crafting');
const { rollSkillSuccess } = require('../../../rolls');
const { Items, Objects } = require('../../../constants/ids');

const FURNACE_ID = Objects.FURNACE; // 118
const SODA_ASH_ID = Items.SODA_ASH; // 624
const SAND_ID = Items.SAND; // 625
const MOLTEN_GLASS_ID = Items.MOLTEN_GLASS; // 623
const GLASSBLOWING_PIPE_ID = Items.GLASSBLOWING_PIPE; // 621
const BUCKET_ID = Items.BUCKET; // 21

const GLASS_MAKING_XP = 20; // Authentic RSC XP for making Molten Glass.

async function makeMoltenGlass(player) {
    const hasAsh = player.inventory.has(SODA_ASH_ID);
    const hasSand = player.inventory.has(SAND_ID);

    if (!hasAsh) {
        player.message('You need some soda ash to make glass');
        return;
    }
    if (!hasSand) {
        player.message('You need a bucket of sand to make glass');
        return;
    }

    player.message('@que@You put the soda ash and sand in the furnace');

    await player.world.sleepTicks(2);

    player.message('@que@It melts and produces a lump of molten glass');
    player.inventory.remove(SODA_ASH_ID);
    player.inventory.remove(SAND_ID);
    player.inventory.add(MOLTEN_GLASS_ID);
    player.inventory.add(BUCKET_ID); // Empty bucket returned
    player.addExperience('crafting', GLASS_MAKING_XP);
}

async function blowGlass(player, pipe, glass) {
    player.message('What would you like to make?');

    const options = glassblowing.sort((a, b) => a.level - b.level);

    const choiceLabels = options.map(opt => {
        if (opt.alias) return opt.alias;
        return items[opt.id].name;
    });

    const choice = await player.ask(choiceLabels, false);

    if (choice > -1) {
        const selection = options[choice];

        if (player.skills.crafting.current < selection.level) {
            player.message(`You need a crafting level of ${selection.level} to make this`);
            return;
        }

        player.sendBubble(GLASSBLOWING_PIPE_ID);
        player.message('@que@You blow into the pipe');
        await player.world.sleepTicks(2);

        player.inventory.remove(MOLTEN_GLASS_ID);
        player.inventory.add(selection.id);
        player.addExperience('crafting', selection.experience);
        player.message(`@que@You make a ${items[selection.id].name}`);
    }
}

module.exports = {
    onUseWithGameObject: async (player, gameObject, item) => {
        if (gameObject.id === FURNACE_ID) {
            if (item.id === SODA_ASH_ID || item.id === SAND_ID) {
                await makeMoltenGlass(player);
                return true;
            }
        }
        return false;
    },
    onUseWithInventory: async (player, item1, item2) => {
        const isPipe = (i) => i.id === GLASSBLOWING_PIPE_ID;
        const isGlass = (i) => i.id === MOLTEN_GLASS_ID;

        if ((isPipe(item1) && isGlass(item2)) || (isPipe(item2) && isGlass(item1))) {
            await blowGlass(player, isPipe(item1) ? item1 : item2, isGlass(item1) ? item1 : item2);
            return true;
        }
        return false;
    }
};
