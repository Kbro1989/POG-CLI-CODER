// :: commands

const NPC = require('../model/npc');
const items = require('@2003scape/rsc-data/config/items');
const quests = require('@2003scape/rsc-data/quests');
const regions = require('@2003scape/rsc-data/regions');
const { handleClanCommand, handleClanChat } = require('../clan-system');
const { handleBankPinCommand } = require('../bank-pin');
const { handlePartyCommand, handlePartyChat } = require('../party-system');
const { handleBarCrawlCommand } = require('../plugins/minigames/bar-crawl');
const { handleMageArenaCommand } = require('../plugins/minigames/mage-arena');

async function command({ player }, { command, args }) {
    /*if (!player.isAdministrator()) {
        return;
    }*/

    const { world } = player;

    // Handle clan commands
    if (command === 'clan') {
        handleClanCommand(player, command, args);
        return;
    }
    if (command === 'c' || command === 'clanchat') {
        handleClanChat(player, args);
        return;
    }
    if (command === 'bankpin') {
        handleBankPinCommand(player, command, args);
        return;
    }
    if (command === 'party') {
        handlePartyCommand(player, command, args);
        return;
    }
    if (command === 'p' || command === 'partychat') {
        handlePartyChat(player, args);
        return;
    }
    if (command === 'barcrawl') {
        handleBarCrawlCommand(player, args);
        return;
    }
    if (command === 'magearena') {
        handleMageArenaCommand(player, args);
        return;
    }

    switch (command) {
        case 'setqp':
            if (!args[0] || Number.isNaN(+args[0])) {
                player.message('invalid argument');
                break;
            }

            player.questPoints = +args[0];
            break;
        case 'kick': {
            if (!args[0]) {
                player.message('invalid player');
                break;
            }

            const playerKicked = world.getPlayerByUsername(args[0]);

            if (!playerKicked) {
                player.message('no such player: ' + args[0]);
                break;
            }

            await playerKicked.logout();
            player.message('kicked player: ' + args[0]);
            break;
        }
        case 'appearance':
            player.sendAppearance();
            break;
        case 'step': {
            const deltaX = +args[0];
            const deltaY = +args[1];

            player.message(player.canWalk(deltaX, deltaY).toString());
            player.walkTo(deltaX, deltaY);
            break;
        }
        case 'npc': {
            const npc = new NPC(world, {
                id: +args[0],
                x: player.x,
                y: player.y,
                minX: player.x - 4,
                maxX: player.x + 4,
                minY: player.y - 4,
                maxY: player.y + 4
            });

            delete npc.respawn;

            world.addEntity('npcs', npc);
            break;
        }
        case 'face':
            player.faceDirection(+args[0], +args[1]);
            break;
        case 'item':
            player.inventory.add(+args[0], +args[1] || 1);
            break;
        case 'sound':
            player.sendSound(args[0]);
            break;
        case 'bubble':
            player.sendBubble(+args[0]);
            break;
        case 'addexp':
            player.addExperience(args[0], +args[1] * 4, false);
            break;
        case 'clearentities':
            player.localEntities.clear();
            break;
        case 'coords':
            player.message(
                `${player.x}, ${player.y}, facing=${player.direction}`
            );
            break;
        case 'teleport':
            if (Number.isNaN(+args[0])) {
                const { spawnX, spawnY } = regions[args[0]];

                if (spawnX && spawnY) {
                    player.teleport(spawnX, spawnY, true);
                }

                break;
            }

            player.teleport(+args[0], +args[1], true);
            break;
        case 'ask': {
            const choice = await player.ask(
                ['hey?', 'sup?', 'more', 'test', 'again'],
                true
            );

            player.message('you chose ', choice);
            break;
        }
        case 'say':
            await player.say(...args);
            break;
        case 'dmg':
            player.damage(+args[0]);
            break;
        case 'shop':
            player.openShop(args[0]);
            break;
        case 'give': {
            const other = world.getPlayerByUsername(args[0]);

            if (other) {
                other.inventory.add(+args[1], +args[2] || 1);
                other.message(`${player.username} gave you an item`);
                player.message(`gave ${args[0]} item ${args[1]}`);
            } else {
                player.message(`unable to find player ${args[0]}`);
            }
            break;
        }
        case 'bank':
            player.bank.open();
            break;
        case 'fatigue':
            player.fatigue = 75000;
            player.sendFatigue();
            break;
        case 'chaseobj':
            await player.chase(world.gameObjects.getByID(+args[0]), false);
            break;
        case 'gotoentity': {
            const entities = world[args[0]];
            const entity = entities.getByID(+args[1]);

            if (entity) {
                player.teleport(entity.x, entity.y, true);
            }

            break;
        }
        case 'setquest': {
            let questID;

            if (Number.isNaN(+args[0])) {
                questID = quests
                    .map((name) => name.toLowerCase())
                    .indexOf(args[0].toLowerCase());
            } else {
                questID = +args[0];
            }

            if (questID > -1) {
                player.questStages[quests[questID]] = +args[1];
            }

            break;
        }
        case 'setcache':
            player.cache[args[0]] = JSON.parse(args[1]);
            break;
        case 'droprandom': {
            for (let i = 0; i < +args[0]; i += 1) {
                const randomID = Math.floor(Math.random() * 1290);
                const item = items[randomID];

                if (item.members) {
                    continue;
                }

                if (item.stackable) {
                    world.addPlayerDrop(player, {
                        id: randomID,
                        amount: Math.floor(Math.random() * 10000)
                    });
                } else {
                    world.addPlayerDrop(player, { id: randomID });
                }
            }
            break;
        }
        case 'goto': {
            const otherPlayer = world.getPlayerByUsername(args[0]);
            player.teleport(otherPlayer.x, otherPlayer.y);
            break;
        }
        case 'clearinventory': {
            player.inventory.items = [];
            player.inventory.sendAll();
            break;
        }
        case 'npcchase': {
            const npc = Array.from(player.localEntities.known.npcs).find(
                (npc) => {
                    return npc.id === +args[0];
                }
            );

            if (npc) {
                await npc.attack(player);
            }

            break;
        }
        case 'npccoords':
            player.message(world.npcs.getAtPoint(+args[0], +args[1]).length);
            break;
        // === NEW COMMANDS ===
        case 'online': {
            const playerCount = world.players.size;
            player.message(`Players online: ${playerCount}`);
            break;
        }
        case 'summon': {
            if (!args[0]) {
                player.message('Usage: ::summon <username>');
                break;
            }
            const targetPlayer = world.getPlayerByUsername(args[0]);
            if (targetPlayer) {
                targetPlayer.teleport(player.x, player.y, true);
                player.message(`Summoned ${args[0]} to your location`);
                targetPlayer.message(`You have been summoned by ${player.username}`);
            } else {
                player.message(`Player not found: ${args[0]}`);
            }
            break;
        }
        case 'set': {
            if (!args[0] || !args[1]) {
                player.message('Usage: ::set <skill> <level>');
                break;
            }
            const skillNames = ['attack', 'defense', 'strength', 'hits', 'ranged',
                'prayer', 'magic', 'cooking', 'woodcutting', 'fletching',
                'fishing', 'firemaking', 'crafting', 'smithing', 'mining',
                'herblaw', 'agility', 'thieving'];
            const skillIndex = skillNames.indexOf(args[0].toLowerCase());
            if (skillIndex === -1) {
                player.message(`Unknown skill: ${args[0]}`);
                break;
            }
            const level = Math.min(99, Math.max(1, +args[1]));
            const skillName = Object.keys(player.skills)[skillIndex];
            player.skills[skillName].current = level;
            player.skills[skillName].base = level;
            player.sendStats();
            player.message(`Set ${args[0]} to level ${level}`);
            break;
        }
        case 'commands':
        case 'help': {
            try {
                const mainChoice = await player.ask([
                    'Spawn Items >>',
                    'Teleport >>',
                    '::set <skill> <lvl>',
                    '::heal - Restore HP',
                    '::save - Save char',
                    '[Close]'
                ]);

                if (mainChoice === 0) {
                    const catChoice = await player.ask([
                        'Consumables >>',
                        'Armour >>',
                        'Weapons >>',
                        'Rares >>',
                        'Skilling >>',
                        'Magic >>',
                        '[Back]'
                    ]);

                    let itemsToShow = [];

                    if (catChoice === 0) {
                        const consumeChoice = await player.ask(['Food >>', 'Potions >>', 'Drinks >>', '[Back]']);
                        if (consumeChoice === 0) {
                            itemsToShow = [
                                { id: 373, name: 'Lobster' }, { id: 370, name: 'Swordfish' },
                                { id: 546, name: 'Shark' }, { id: 326, name: 'Meat Pizza' }
                            ];
                        } else if (consumeChoice === 1) {
                            itemsToShow = [
                                { id: 221, name: 'Strength Potion (4)' }, { id: 474, name: 'Attack Potion (3)' },
                                { id: 480, name: 'Defense Potion (3)' }, { id: 486, name: 'Super Attack Potion (3)' },
                                { id: 483, name: 'Prayer Potion (3)' }, { id: 492, name: 'Super Strength (3)' }
                            ];
                        } else if (consumeChoice === 2) {
                            itemsToShow = [
                                { id: 193, name: 'Beer' }, { id: 142, name: 'Wine' },
                                { id: 598, name: 'Grog' }, { id: 829, name: 'Dragon Bitter' }
                            ];
                        }
                    } else if (catChoice === 1) {
                        const armorChoice = await player.ask(['Helmets >>', 'Bodies >>', 'Legs >>', 'Shields >>', 'Gloves/Other >>', '[Back]']);
                        if (armorChoice === 0) {
                            itemsToShow = [
                                { id: 107, name: 'Bronze Medium Helmet' }, { id: 108, name: 'Steel Medium Helmet' },
                                { id: 113, name: 'Adamantite Helmet' }, { id: 114, name: 'Rune Medium Helmet' },
                                { id: 795, name: 'Dragon Medium Helmet' }
                            ];
                        } else if (armorChoice === 1) {
                            itemsToShow = [
                                { id: 117, name: 'Bronze Plate Mail Body' }, { id: 118, name: 'Steel Plate Mail Body' },
                                { id: 116, name: 'Adamantite Chain Mail Body' }, { id: 401, name: 'Rune Plate Mail Body' }
                            ];
                        } else if (armorChoice === 2) {
                            itemsToShow = [
                                { id: 206, name: 'Bronze Plate Mail Legs' }, { id: 121, name: 'Steel Plate Mail Legs' },
                                { id: 123, name: 'Adamantite Plate Mail Legs' }, { id: 402, name: 'Rune Plate Mail Legs' }
                            ];
                        } else if (armorChoice === 3) {
                            itemsToShow = [
                                { id: 4, name: 'Wooden Shield' }, { id: 129, name: 'Steel Kite Shield' },
                                { id: 131, name: 'Adamantite Kite Shield' }, { id: 404, name: 'Rune Kite Shield' },
                                { id: 1278, name: 'Dragon Square Shield' }
                            ];
                        } else if (armorChoice === 4) {
                            itemsToShow = [
                                { id: 137, name: 'Iron Chainbody' }, { id: 138, name: 'Steel Chainbody' },
                                { id: 140, name: 'Mithril Chainbody' }, { id: 141, name: 'Adamantite Chainbody' }
                            ];
                        }
                    } else if (catChoice === 2) {
                        const weaponChoice = await player.ask(['Swords >>', '2H Swords >>', 'Battleaxes >>', 'Bows >>', 'Staffs >>', 'God Items >>', '[Back]']);
                        if (weaponChoice === 0) {
                            itemsToShow = [
                                { id: 70, name: 'Bronze Long Sword' }, { id: 72, name: 'Steel Long Sword' },
                                { id: 74, name: 'Adamantite Long Sword' }, { id: 75, name: 'Rune long sword' },
                                { id: 593, name: 'Dragon Sword' }
                            ];
                        } else if (weaponChoice === 1) {
                            itemsToShow = [
                                { id: 76, name: 'Bronze 2-handed Sword' }, { id: 78, name: 'Steel 2-handed Sword' },
                                { id: 80, name: 'Adamantite 2-handed Sword' }, { id: 81, name: 'rune 2-handed Sword' }
                            ];
                        } else if (weaponChoice === 2) {
                            itemsToShow = [
                                { id: 205, name: 'bronze battle Axe' }, { id: 90, name: 'Steel battle Axe' },
                                { id: 92, name: 'Adamantite battle Axe' }, { id: 93, name: 'Rune battle Axe' },
                                { id: 594, name: 'Dragon axe' }
                            ];
                        } else if (weaponChoice === 3) {
                            itemsToShow = [
                                { id: 189, name: 'Shortbow' }, { id: 188, name: 'Longbow' },
                                { id: 655, name: 'Yew Shortbow' }, { id: 654, name: 'Yew Longbow' },
                                { id: 657, name: 'Magic Shortbow' }, { id: 656, name: 'Magic Longbow' }
                            ];
                        } else if (weaponChoice === 4) {
                            itemsToShow = [
                                { id: 100, name: 'Oak Staff' }, { id: 101, name: 'Willow Staff' },
                                { id: 102, name: 'Teak Staff' }, { id: 103, name: 'Yew Staff' },
                                { id: 1000, name: 'Staff of Iban' }
                            ];
                        } else if (weaponChoice === 5) {
                            // God items - paired staff + cape sets (Wilderness Mage Arena rewards)
                            const godChoice = await player.ask([
                                'Staff + Cape of Guthix (Magic +25)',
                                'Staff + Cape of Saradomin (Magic +25)',
                                'Staff + Cape of Zamorak (Magic +25)',
                                '[Back]'
                            ]);
                            if (godChoice === 0) {
                                // Staff of Guthix + Cape of Guthix
                                player.inventory.add(1306, 1);
                                player.inventory.add(1309, 1);
                                await player.message(`Given: Staff of Guthix + Cape of Guthix`);
                            } else if (godChoice === 1) {
                                // Staff of Saradomin + Cape of Saradomin
                                player.inventory.add(1307, 1);
                                player.inventory.add(1310, 1);
                                await player.message(`Given: Staff of Saradomin + Cape of Saradomin`);
                            } else if (godChoice === 2) {
                                // Staff of Zamorak + Cape of Zamorak
                                player.inventory.add(1308, 1);
                                player.inventory.add(1311, 1);
                                await player.message(`Given: Staff of Zamorak + Cape of Zamorak`);
                            }
                        }
                    } else if (catChoice === 3) {
                        const rareChoice = await player.ask(['Partyhats >>', 'H\'ween Masks >>', 'Seasonal >>', '[Back]']);
                        if (rareChoice === 0) {
                            itemsToShow = [
                                { id: 576, name: 'Party Hat' }, { id: 577, name: 'Party Hat' },
                                { id: 578, name: 'Party Hat' }, { id: 579, name: 'Party Hat' },
                                { id: 580, name: 'Party Hat' }, { id: 581, name: 'Party Hat' }
                            ];
                        } else if (rareChoice === 1) {
                            itemsToShow = [
                                { id: 831, name: 'halloween mask' }, { id: 832, name: 'halloween mask' },
                                { id: 828, name: 'halloween mask' }
                            ];
                        } else if (rareChoice === 2) {
                            itemsToShow = [
                                { id: 575, name: 'Christmas cracker' }, { id: 387, name: 'Disk of Returning' },
                                { id: 1289, name: 'Scythe' }, { id: 1156, name: 'Bunny Ears' },
                                { id: 677, name: 'Easter Egg' }, { id: 971, name: 'Santa\'s hat' }
                            ];
                        }
                    } else if (catChoice === 4) {
                        const skillChoice = await player.ask(['Ores & Bars >>', 'Logs >>', 'Fish >>', 'Herbs >>', '[Back]']);
                        if (skillChoice === 0) {
                            itemsToShow = [
                                { id: 150, name: 'Copper Ore' }, { id: 155, name: 'Coal' },
                                { id: 409, name: 'Runite Ore' }, { id: 408, name: 'Runite Bar' }
                            ];
                        } else if (skillChoice === 1) {
                            itemsToShow = [
                                { id: 14, name: 'Logs' }, { id: 633, name: 'Willow Logs' },
                                { id: 635, name: 'Yew Logs' }, { id: 636, name: 'Magic Logs' }
                            ];
                        } else if (skillChoice === 2) {
                            itemsToShow = [
                                { id: 373, name: 'Lobster' }, { id: 370, name: 'Swordfish' },
                                { id: 546, name: 'Shark' }, { id: 355, name: 'Raw Shark' }
                            ];
                        } else if (skillChoice === 3) {
                            itemsToShow = [
                                { id: 251, name: 'Guam Leaf' }, { id: 253, name: 'Marrentill' },
                                { id: 255, name: 'Tarromin' }, { id: 257, name: 'Harralander' }
                            ];
                        }
                    } else if (catChoice === 5) {
                        const runeChoice = await player.ask(['Rune Sets >>', 'Air Runes >>', 'Death Runes >>', 'Special Runes >>', '[Back]']);
                        if (runeChoice === 0) {
                            itemsToShow = [
                                { id: 33, name: 'Air-Rune', amount: 1000 }, { id: 31, name: 'Fire-Rune', amount: 1000 },
                                { id: 32, name: 'Water-Rune', amount: 1000 }, { id: 34, name: 'Earth-Rune', amount: 1000 }
                            ];
                        } else if (runeChoice === 1) {
                            itemsToShow = [
                                { id: 33, name: 'Air-Rune', amount: 1000 },
                                { id: 33, name: 'Air-Rune', amount: 5000 }
                            ];
                        } else if (runeChoice === 2) {
                            itemsToShow = [
                                { id: 38, name: 'Death-Rune', amount: 500 },
                                { id: 38, name: 'Death-Rune', amount: 1000 }
                            ];
                        } else if (runeChoice === 3) {
                            itemsToShow = [
                                { id: 619, name: 'Blood-Rune', amount: 500 },
                                { id: 825, name: 'Soul-Rune', amount: 500 },
                                { id: 40, name: 'Nature-Rune', amount: 1000 },
                                { id: 46, name: 'Cosmic-Rune', amount: 500 }
                            ];
                        }
                    }

                    if (itemsToShow.length > 0) {
                        const itemNames = itemsToShow.map(i => i.name + (i.amount && i.amount > 1 ? ' (x' + i.amount + ')' : ''));
                        itemNames.push('[Back]');
                        const itemChoice = await player.ask(itemNames);
                        if (itemChoice < itemsToShow.length) {
                            const item = itemsToShow[itemChoice];
                            player.inventory.add(item.id, item.amount || 1);
                            player.message(`Added ${item.amount || 1}x ${item.name}`);
                        }
                    }
                } else if (mainChoice === 1) {
                    // Teleport submenu
                    const teleChoice = await player.ask(['Locations >>', 'NPCs >>', '[Back]']);

                    if (teleChoice === 0) {
                        // Locations by zone
                        const zones = {
                            'Misthalin': [
                                { name: 'Lumbridge', x: 120, y: 648 },
                                { name: 'Varrock', x: 122, y: 509 },
                                { name: 'Draynor', x: 214, y: 632 },
                                { name: 'Al Kharid', x: 89, y: 693 }
                            ],
                            'Asgarnia': [
                                { name: 'Falador', x: 304, y: 542 },
                                { name: 'Port Sarim', x: 268, y: 625 },
                                { name: 'Barbarian Village', x: 233, y: 513 },
                                { name: 'Ice Mountain', x: 305, y: 489 }
                            ],
                            'Kandarin': [
                                { name: 'Ardougne', x: 549, y: 589 },
                                { name: 'Catherby', x: 440, y: 501 },
                                { name: 'Seers Village', x: 501, y: 457 },
                                { name: 'Yanille', x: 587, y: 761 }
                            ],
                            'Wilderness': [
                                { name: 'Edgeville', x: 217, y: 449 },
                                { name: 'Wild (Lvl 1)', x: 217, y: 430 },
                                { name: 'Wild (Lvl 20)', x: 270, y: 341 },
                                { name: 'Wild (Lvl 40)', x: 270, y: 261 },
                                { name: 'Mage Arena', x: 447, y: 176 }
                            ],
                            'Islands': [
                                { name: 'Tutorial Isle', x: 217, y: 740 },
                                { name: 'Karamja', x: 360, y: 696 },
                                { name: 'Crandor', x: 397, y: 649 }
                            ]
                        };
                        const zoneNames = Object.keys(zones);
                        zoneNames.push('[Back]');
                        const zoneChoice = await player.ask(zoneNames);
                        if (zoneChoice < zoneNames.length - 1) {
                            const locs = zones[zoneNames[zoneChoice]];
                            const locNames = locs.map(l => l.name);
                            locNames.push('[Back]');
                            const locChoice = await player.ask(locNames);
                            if (locChoice < locs.length) {
                                const loc = locs[locChoice];
                                player.teleport(loc.x, loc.y, true);
                                player.message(`Teleported to ${loc.name}`);
                            }
                        }
                    } else if (teleChoice === 1) {
                        // NPCs by category
                        const npcCategories = {
                            'Shops': [
                                { name: 'General Store (Lumb)', x: 132, y: 640 },
                                { name: 'Sword Shop (Varrock)', x: 145, y: 513 },
                                { name: 'Staff Shop (Varrock)', x: 101, y: 523 },
                                { name: 'Rune Shop (Varrock)', x: 88, y: 503 },
                                { name: 'Platebody Shop (Fally)', x: 316, y: 540 }
                            ],
                            'Quest NPCs': [
                                { name: 'Duke Horacio', x: 130, y: 640 },
                                { name: 'Cook (Lumb Castle)', x: 135, y: 651 },
                                { name: 'Gypsy (Varrock)', x: 113, y: 519 },
                                { name: 'Oziach (Edgeville)', x: 247, y: 431 },
                                { name: 'King Roald', x: 122, y: 509 }
                            ],
                            'Trainers': [
                                { name: 'Combat Tutor (Lumb)', x: 120, y: 648 },
                                { name: 'Magic Tutor (Lumb)', x: 121, y: 649 },
                                { name: 'Fishing Tutor', x: 268, y: 647 }
                            ],
                            'Banks': [
                                { name: 'Lumbridge Bank', x: 126, y: 633 },
                                { name: 'Varrock West', x: 98, y: 509 },
                                { name: 'Varrock East', x: 163, y: 492 },
                                { name: 'Falador West', x: 328, y: 549 },
                                { name: 'Falador East', x: 282, y: 570 }
                            ],
                            'Stuck/Rescue': [
                                { name: 'Crystal Chest (Taverly)', x: 372, y: 440 },
                                { name: 'Hero Guild Dragon', x: 372, y: 441 },
                                { name: 'Taverly Dungeon Chest', x: 376, y: 3344 },
                                { name: 'Black Knight Fortress', x: 271, y: 438 },
                                { name: 'Melzar Maze', x: 338, y: 622 },
                                { name: 'Temple of Ikov', x: 561, y: 3525 },
                                { name: 'Brimhaven Dungeon', x: 467, y: 3707 },
                                { name: 'Wilderness Lever', x: 292, y: 185 }
                            ]
                        };
                        const catNames = Object.keys(npcCategories);
                        catNames.push('[Back]');
                        const catChoice = await player.ask(catNames);
                        if (catChoice < catNames.length - 1) {
                            const npcs = npcCategories[catNames[catChoice]];
                            const npcNames = npcs.map(n => n.name);
                            npcNames.push('[Back]');
                            const npcChoice = await player.ask(npcNames);
                            if (npcChoice < npcs.length) {
                                const npc = npcs[npcChoice];
                                player.teleport(npc.x, npc.y, true);
                                player.message(`Teleported to ${npc.name}`);
                            }
                        }
                    }
                } else if (mainChoice === 3) {
                    player.skills.hits.current = player.skills.hits.base;
                    player.sendStats();
                    player.message('You have been healed');
                } else if (mainChoice === 4) {
                    await player.save();
                    player.message('Player data saved');
                }
            } catch (e) { }
            break;
        }
        case 'gang': {
            if (player.cache.phoenixGang) {
                player.message('You are a member of the Phoenix Gang');
            } else if (player.cache.blackArmGang) {
                player.message('You are a member of the Black Arm Gang');
            } else {
                player.message('You are not in a gang yet');
            }
            break;
        }
        case 'heal': {
            player.skills.hits.current = player.skills.hits.base;
            player.sendStats();
            player.message('You have been healed');
            break;
        }
        case 'kill': {
            if (!args[0]) {
                player.message('Usage: ::kill <username>');
                break;
            }
            const victim = world.getPlayerByUsername(args[0]);
            if (victim) {
                victim.damage(victim.skills.hits.current);
                player.message(`Killed ${args[0]}`);
            } else {
                player.message(`Player not found: ${args[0]}`);
            }
            break;
        }
        case 'broadcast': {
            if (!args.length) {
                player.message('Usage: ::broadcast <message>');
                break;
            }
            const broadcastMsg = args.join(' ');
            for (const p of world.players.values()) {
                p.message(`[BROADCAST] ${broadcastMsg}`);
            }
            break;
        }
        case 'save': {
            await player.save();
            player.message('Player data saved');
            break;
        }
        case 'fullstats': {
            // Set all skills to 99
            const skillNames = ['attack', 'defense', 'strength', 'hits', 'ranged', 'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing', 'mining', 'herblaw', 'agility', 'thieving'];
            const levelToExperience = (level) => {
                let xp = 0;
                for (let i = 1; i < level; i++) {
                    xp += Math.floor(i + 300 * Math.pow(2, i / 7));
                }
                return Math.floor(xp / 4);
            };
            for (const skillName of skillNames) {
                player.skills[skillName].current = 99;
                player.skills[skillName].base = 99;
                player.skills[skillName].experience = levelToExperience(99);
            }
            player.sendStats();
            player.message('All stats set to 99!');
            break;
        }
        case 'inv': {
            const catChoice = await player.ask([
                'Full Setup >>',
                'Combat Gear >>',
                'Ranged Gear >>',
                'Magic Gear >>',
                'Skilling Items >>',
                '[Close]'
            ]);

            if (catChoice === 0) {
                // Full combat setup
                player.inventory.add(81, 1); // Rune 2H
                player.inventory.add(114, 1); // Rune med
                player.inventory.add(401, 1); // Rune plate
                player.inventory.add(402, 1); // Rune legs
                player.inventory.add(1278, 1); // Dragon shield
                player.inventory.add(373, 5); // Lobsters
                player.inventory.add(230, 2); // Super restore
                player.message('Full combat setup spawned!');
            } else if (catChoice === 1) {
                // Combat setup
                player.inventory.add(81, 1);
                player.inventory.add(114, 1);
                player.inventory.add(401, 1);
                player.inventory.add(402, 1);
                player.inventory.add(404, 1);
                player.message('Combat gear spawned!');
            } else if (catChoice === 2) {
                // Ranged setup
                player.inventory.add(656, 1); // Magic longbow
                player.inventory.add(657, 1); // Magic shortbow
                player.inventory.add(655, 1); // Yew shortbow
                player.inventory.add(654, 1); // Yew longbow
                player.message('Ranged gear spawned!');
            } else if (catChoice === 3) {
                // Magic setup - with god item choice
                const godChoice = await player.ask([
                    'Staff of Guthix + Cape (Magic +25)',
                    'Staff of Saradomin + Cape (Magic +25)',
                    'Staff of Zamorak + Cape (Magic +25)',
                    'Regular Staff Setup',
                    '[Back]'
                ]);

                if (godChoice === 0) {
                    // Guthix god items
                    player.inventory.add(1306, 1); // Staff of Guthix
                    player.inventory.add(1309, 1); // Cape of Guthix
                    player.inventory.add(33, 1000); // Air runes
                    player.inventory.add(32, 1000); // Water runes
                    player.inventory.add(31, 1000); // Fire runes
                    player.inventory.add(34, 1000); // Earth runes
                    player.message('God Magic gear (Guthix) spawned! Magic +25 bonus from cape!');
                } else if (godChoice === 1) {
                    // Saradomin god items
                    player.inventory.add(1307, 1); // Staff of Saradomin
                    player.inventory.add(1310, 1); // Cape of Saradomin
                    player.inventory.add(33, 1000); // Air runes
                    player.inventory.add(32, 1000); // Water runes
                    player.inventory.add(31, 1000); // Fire runes
                    player.inventory.add(34, 1000); // Earth runes
                    player.message('God Magic gear (Saradomin) spawned! Magic +25 bonus from cape!');
                } else if (godChoice === 2) {
                    // Zamorak god items
                    player.inventory.add(1308, 1); // Staff of Zamorak
                    player.inventory.add(1311, 1); // Cape of Zamorak
                    player.inventory.add(33, 1000); // Air runes
                    player.inventory.add(32, 1000); // Water runes
                    player.inventory.add(31, 1000); // Fire runes
                    player.inventory.add(34, 1000); // Earth runes
                    player.message('God Magic gear (Zamorak) spawned! Magic +25 bonus from cape!');
                } else if (godChoice === 3) {
                    // Regular staff setup
                    player.inventory.add(1308, 1); // Staff of Zamorak
                    player.inventory.add(33, 1000); // Air runes
                    player.inventory.add(32, 1000); // Water runes
                    player.inventory.add(31, 1000); // Fire runes
                    player.inventory.add(34, 1000); // Earth runes
                    player.message('Magic gear spawned!');
                }
            } else if (catChoice === 4) {
                // Skilling
                player.inventory.add(14, 100); // Logs
                player.inventory.add(150, 50); // Copper ore
                player.inventory.add(251, 50); // Guam leaf
                player.inventory.add(373, 10); // Lobsters
                player.message('Skilling items spawned!');
            }
            break;
        }
        case 'qol': {
            const qolChoice = await player.ask([
                'Teleport',
                'Restore HP/Prayer',
                'Full Inventory Setup',
                'Quick Skills Menu',
                '[Close]'
            ]);
            if (qolChoice === 0) {
                player.message('Use ::teleport or ::commands for teleport options');
            } else if (qolChoice === 1) {
                player.skills.hits.current = player.skills.hits.base;
                player.skills.prayer.current = player.skills.prayer.base;
                player.sendStats();
                player.message('HP and Prayer restored!');
            } else if (qolChoice === 2) {
                player.message('Use ::inv to spawn full inventory setups');
            } else if (qolChoice === 3) {
                player.message('Use ::set <skill> <level> to set individual skills');
            }
            break;
        }
    }


}
module.exports = { command };
