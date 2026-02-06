# RuneScape Classic (2003scape) ID Documentation

Generated: 2025-12-08

## Summary

Your game data contains:
- **1330 Items** (IDs 0-1329)
- **797 NPCs** (IDs 0-796)

## Item ID Ranges by Category

### Weapons (194 items) - IDs 0-1320
- Swords, axes, bows, staves, daggers, halberds, scimitars
- Includes broken variants (arrows, staves)
- Range: 0-1320

### Armor & Clothing (114 items) - IDs 5-1311
- Helmets, chain mail, plate armor, robes, capes
- Multiple color/material variants (leather, steel, iron, etc.)
- Includes special capes: Cape of Guthix (1309), Saradomin (1310), Zamorak (1311)
- Range: 5-1311

### Potions (95 items) - IDs 58-1304
- Basic potions in 1-dose, 2-dose, 3-dose, 4-dose variants
- Includes: Attack, Defense, Strength, Magic, Prayer restoration, Cure poison, etc.
- Range: 58-1304

### Food & Cooking (137 items) - IDs 18-1281
- Meat, fish, bread, cake, vegetables
- Includes raw and cooked variants
- Burnt variants (for failed cooking)
- Range: 18-1281

### Materials & Resources (555 items) - IDs 2-1329
- **Largest category** - includes bars, ore, logs, leather, cloth, etc.
- Building materials, crafting components
- Includes new quest items (1323-1329)
- Range: 2-1329

### Quest Items (97 items) - IDs 25-1328
- Quest-specific items (keys, scrolls, books, certificates)
- Recent additions: Digsite scroll (1315), Glough's notes (1328), Ana in a barrel (1329)
- Range: 25-1328

### Amulets & Jewelry (53 items) - IDs 24-1224
- Amulets (Ghost speak, Accuracy, etc.)
- Necklaces, rings, talismans
- Worn and unstrung variants
- Range: 24-1224

### Herbs & Herblore (14 items) - IDs 181-1284
- Raw and processed herbs
- Limpwurt roots, woad leaves, ashes, etc.
- Range: 181-1284

### Fish & Fishing (16 items) - IDs 125-1077
- Raw and cooked fish
- Fishing bait and equipment
- Range: 125-1077

### Runes & Magic (32 items) - IDs 31-1312
- Elemental runes (Fire, Water, Air, etc.)
- Blood and Soul runes
- Talismans and orbs
- Range: 31-1312

### Tools & Equipment (23 items) - IDs 13-1282
- Pickaxes, hatchets, saws, hammers
- Needles, knives, tinderboxes
- Buckets, pots, cauldrons
- Range: 13-1282

---

## NPC ID Ranges by Category

### Combat NPCs (122 NPCs) - IDs 4-796
- Warriors, knights, paladins
- Monsters: Dragons, demons, giants, trolls, goblins
- High combat stats (attack 20+, strength 15+)
- Includes new NPCs: Watchtower Wizard (796)
- Range: 4-796

### Quest NPCs (82 NPCs) - IDs 16-788
- Kings, princes, generals, captains
- Quest-givers and quest-related NPCs
- Examples: King Lathas, Glough, Koftik
- Range: 16-788

### Civilians (86 NPCs) - IDs 11-785
- Men, women, children, citizens
- Low/no combat stats (attack 0-20)
- Vendors, explorers, guides
- Range: 11-785

### Traders & Merchants (47 NPCs) - IDs 12-689
- Shopkeepers, bartenders, bankers
- Multiple instances in different locations (same stats)
- Examples: Bartenders (IDs 12, 44, 150, 279, 306, 340, 520, 529)
- Range: 12-689

### Monsters & Creatures (55 NPCs) - IDs 2-786
- Animals: Rats, spiders, bears, wolves, chickens, cows
- Provide legitimate combat/hunting targets
- Range: 2-786

### Guards & Protection (49 NPCs) - IDs 65-784
- Guards, watchmen, soldiers, sentinels
- Multiple instances across different cities/regions
- Examples: Guard (IDs 65, 100, 321, 373-376, 385, 503, 524-527, 747, 749)
- Range: 65-784

### Religious (25 NPCs) - IDs 9-665
- Monks, priests, bishops, druids
- Faction-aligned: Saradomin, Zamorak, Armadyl
- Examples: Monk (various IDs), Priest
- Range: 9-665

### Skilled Trainers (13 NPCs) - IDs 37-579
- Masters of various skills (Crafting, Weapons, Magic)
- Examples: Guildmaster (111), Weaponsmaster (37)
- Range: 37-579

### Miscellaneous (318 NPCs) - IDs 0-795
- Unclassified NPCs
- Named unique characters (Bob, Hans, etc.)
- Newly added: Charlie (794), Mosol Rei (795)
- Range: 0-795

---

## Key Guidelines for Adding New Entities

### For New Items:
1. **Identify the category** - weapon, armor, potion, quest item, etc.
2. **Assign ID sequentially** - append to the end (next available ID)
3. **Set appropriate properties:**
   - name: Unique or variant-specific name
   - description: Item use/context
   - spriteId: Graphics ID for rendering
   - price: Shop/drop value (0 for quest items)
   - stackable: true/false
   - untradeable: true for quest items
   - members: true if members-only

### For New NPCs:
1. **Identify the role** - quest NPC, combat NPC, merchant, guard, etc.
2. **Assign ID sequentially** - append to the end (next available ID)
3. **Set appropriate stats:**
   - attack, strength, hits, defense: Combat stats
   - For civilians: attack=0, strength=0, defense=3
   - For merchants: attack=0, strength=0, defense=3
   - For combat NPCs: proportional to difficulty
4. **Add animations:** Standard walk/stand/turn animations
5. **Set hostility:** null (neutral), 'aggressive', or 'retreats'

---

## Location-Based Duplicates (INTENTIONAL)

Your data correctly shows NPCs appearing multiple times with same ID for same location:
- **Koftik** (IDs 626-629, 650, 659): Multiple instances in Underground Pass
- **Bartender** (IDs 12, 44, 150, 279, 306, 340, 520, 529): Different taverns
- **Guard** (IDs 65, 100, 321, etc.): Different cities/fortifications
- **Shopkeeper** (IDs 51, 55, 87, 105, 145, 168, 185, 371, 391): Different shops

This is **authentic RSC behavior** where location spawn points use the same NPC ID config.

---

## Recent Additions (IDs 1323-1329)

| ID   | Name                  | Category          | Quest      |
|------|-----------------------|-------------------|------------|
| 1313-1326 | Various (Digsite items) | Materials/Quest   | Digsite    |
| 1327 | Gnome translation     | Quest Items       | Grand Tree |
| 1328 | Glough's notes        | Quest Items       | Grand Tree |
| 1329 | Ana in a barrel       | Materials/Quest   | Tourist Trap |

**Next available ID: 1330**

---

## References

- Classic Wiki: https://classic.runescape.wiki/
- 2003scape: https://2003scape.com/
- Authentic 2003 item/NPC configuration from RSC client cache
