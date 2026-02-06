# Quick Reference: Item & NPC ID Guide

**Last Updated:** December 8, 2025 (Post-Reorganization)

---

## Current Database Status

```
Items: 1,254 (IDs 0-1253)
NPCs: 797 (IDs 0-796)
```

---

## Item ID Ranges by Category

### Weapons (IDs 0-50)
- Maces, swords, axes, spears, bows, staves
- **Canonical Range:** 0-50

### Armor & Shields (IDs 2-230)
- Helmets, plate mail, chain mail, leather, robes
- **Examples:** Iron armor (5-7), Steel armor (125-130), Rune armor (390-400)

### Potions (IDs 58-1304)
- **Important:** Potions exist in multiple doses (1, 2, 3, 4-dose)
- **Examples:** Strength Potion (221-224, 1296-1298)
- **Rule:** Different dose = different ID (intentional)

### Food & Cooking (IDs 18-1281)
- Raw and cooked variants
- **Examples:** Raw meat (131), Cooked meat (132)

### Quest Items (IDs 25-1328)
- **Recent Additions:** IDs 1323-1329 (Digsite, Grand Tree, Tourist Trap items)
- Marked as `untradeable: true` and `members: true`

### Materials (IDs 152-1329)
- Ore, bars, logs, leather, cloth, thread
- **Important:**
  - ID 152 = "gold" (raw ore)
  - ID 172 = "gold bar" (smelted)
  - **DO NOT** use duplicate IDs 690-691

### Amulets & Jewelry (IDs 24-1224)
- **Important:** Amulets come in pairs
  - Unstrung (can be found/crafted)
  - Worn (with string)
- **Examples:** Gold Amulet unstrung (296), Gold Amulet worn (301)

### Runes & Magic (IDs 31-1312)
- Fire, Water, Air, Earth runes
- Blood and Soul runes
- **Range:** 31-1312

---

## NPC ID Ranges by Role

### Quest NPCs (IDs 16-788)
- Kings, princes, generals, quest-givers
- **Important:** Use canonical ID only once

### Combat NPCs (IDs 4-796)
- Warriors, dragons, demons, monsters
- **Important:** Different combat stats = different ID (intentional)
- **Examples:**
  - Guard with attack 20 ≠ Guard with attack 30
  - Rat weak ≠ Rat strong

### Traders & Merchants (IDs 12-689)
- Shopkeepers, bartenders, bankers
- **Important:** Same ID across locations (multiple spawn points)
- **Examples:**
  - ID 12 = Bartender (multiple taverns)
  - ID 51 = Shopkeeper (multiple shops)

### Location-Based NPCs (Intentional Duplicates)
These are the SAME NPC object placed in multiple locations:
- **Guards:** IDs 65, 100, 321, 373-376, 385, 503, 524-527, 747, 749
- **Bartenders:** IDs 12, 44, 150, 279, 306, 340, 520, 529
- **Shopkeepers:** IDs 51, 55, 87, 105, 145, 168, 185, 371, 391

---

## ⚠️ REMOVED IDs (DO NOT USE)

### Never Use These Item IDs (Duplicates Removed)
```
690, 691    → Use 152 (gold) and 172 (gold bar) instead
194, 195    → Use 187 (skirt) instead
199         → Use 185 (wizardshat) instead
228         → Use 18 (Cabbage) instead
274, 275    → Use 273 (Goblin Armour) instead
360, 365, 368 → Use 353 (Burnt fish) instead
417, 418    → Use 416 (Map Piece) instead
435-443, 815, 817, 819, 821, 823, 933 → Use 165 (Herb) instead
527         → Use 526 (Half of a key) instead
577-581     → Use 576 (Party Hat) instead
803         → Use 242 (Bronze key) instead
... and more (see COMPLETE_MIGRATION_GUIDE.json for full list)
```

---

## Adding New Items

### Steps to Add a New Item

1. **Find next available ID:**
   ```bash
   node -e "const items = require('./items.json'); console.log(items.length)"
   ```

2. **Create item object:**
   ```javascript
   {
     "name": "My New Item",
     "description": "Item description",
     "sprite": 404,  // Visual sprite ID
     "price": 100,   // Shop value
     "stackable": false,
     "untradeable": false,
     "members": false
   }
   ```

3. **Add to items.json at the end**

4. **Update quest file:**
   ```javascript
   const ITEM_MY_NEW_ITEM = 1254;  // Use next available ID
   ```

5. **Reference in module.exports:**
   ```javascript
   items: [ITEM_MY_NEW_ITEM]
   ```

---

## Adding New NPCs

### Steps to Add a New NPC

1. **Find next available ID:**
   ```bash
   node -e "const npcs = require('./npcs.json'); console.log(npcs.length)"
   ```

2. **Create NPC object:**
   ```javascript
   {
     "name": "My NPC",
     "description": "NPC description",
     "attack": 20,
     "strength": 15,
     "defense": 15,
     "hits": 50,
     "animations": {
       "walk": 1427,
       "stand": 1426,
       "stand_turn_90": 1428,
       "stand_turn_180": 1431,
       "stand_turn_270": 1429,
       "stand_turn_1": 1428,
       "stand_turn_neg1": 1429
     }
   }
   ```

3. **Add to npcs.json at the end**

4. **Use in quest file:**
   ```javascript
   const NPC_MY_NPC = 797;  // Use next available ID
   ```

---

## Important Rules

### ✅ DO

- ✅ Use canonical IDs from the migration guide
- ✅ Check REMOVED IDs list before using an ID
- ✅ Keep backups before modifying items.json
- ✅ Test quest functionality after changes
- ✅ Document why you added a new item/NPC

### ❌ DON'T

- ❌ Use duplicate IDs (690, 691, 194, 195, etc.)
- ❌ Modify existing items without good reason
- ❌ Add duplicate items with same name/properties
- ❌ Ignore the migration guide
- ❌ Skip testing quest files after changes

---

## Useful Commands

### Check Database Integrity
```bash
node -e "const fs=require('fs'); const items=JSON.parse(fs.readFileSync('items.json','utf8')); console.log('Items:', items.length); items.forEach((i,idx)=>{if(!i.name)console.log('ERROR: Item '+idx+' has no name')})"
```

### Find Item ID by Name
```bash
node -e "const items=require('./items.json'); const idx=items.findIndex(i=>i.name.toLowerCase()==='your item name'); console.log(idx)"
```

### Find NPC ID by Name
```bash
node -e "const npcs=require('./npcs.json'); const idx=npcs.findIndex(n=>n.name.toLowerCase()==='your npc name'); console.log(idx)"
```

### List All Items in Range
```bash
node -e "const items=require('./items.json'); items.slice(100,110).forEach((i,idx)=>console.log(100+idx + ': ' + i.name))"
```

---

## Migration Reference Files

For complete details, see:

1. **ID_MIGRATION_GUIDE.json** - All removed IDs and their replacements
2. **COMPLETE_MIGRATION_GUIDE.json** - Detailed with item names
3. **REORGANIZATION_FINAL_REPORT.md** - Complete execution report
4. **ID_DOCUMENTATION.md** - Full category breakdown

---

## Support

If you encounter an ID issue:

1. Check this guide (Quick Reference)
2. Check COMPLETE_MIGRATION_GUIDE.json (detailed mappings)
3. Review REORGANIZATION_FINAL_REPORT.md (what changed)
4. Search quest files for the ID to see where it's used
5. Contact development team if unsure

---

**Remember:** This reorganization removed 76 duplicate items and simplified the database. Always refer to the migration guide when in doubt!
