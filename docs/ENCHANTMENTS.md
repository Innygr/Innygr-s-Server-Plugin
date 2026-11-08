# Enchantment Plan

These are **server-managed enchantment effects** applied to vanilla items. They are not entries in Bedrock's native enchantment registry. The pack stores hidden lore markers and applies supported effects from the dedicated server.

## Implemented prototypes

| Enchantment | Equipment | Effect | Status |
|---|---|---|---|
| Vitality I–III | Chestplate | Passive regeneration; higher levels increase strength | Implemented |
| Safeguard I–III | Chestplate | Resistance; higher levels increase strength | Implemented; needs in-game balance testing |
| Aquatic I–III | Helmet | Water Breathing and level-scaled Dolphin's Grace | Implemented |
| Springload I–III | Boots | Jump Boost; higher levels increase strength | Implemented; needs in-game balance testing |
| Prospector I–III | Pickaxe | Chance for one bonus ore drop | Implemented; needs in-game balance testing |

Multiple Innygr enchantments can now coexist on one compatible vanilla item. Reapplying an enchantment replaces only that enchantment's level.

## Prototype command

Operators apply a prototype to the matching item held in their main hand or worn in the relevant armor slot:

```text
/innygr:enchant vitality 1
/innygr:enchant safeguard 2
/innygr:enchant aquatic 1
/innygr:enchant springload 2
/innygr:enchant prospector 3
```

Vitality and Safeguard require a chestplate, Aquatic requires a helmet, Springload requires boots, and Prospector requires a pickaxe in the main hand.

## Prospector behavior

- Triggers from the server's player-break-block event.
- Applies only to supported vanilla ore blocks broken with a pickaxe carrying the Prospector marker.
- Bonus chance: 5% / 10% / 15% for levels I / II / III.
- Awards one additional item matching the ore's ordinary non-Silk-Touch drop.
- Silk Touch suppresses the bonus; Fortune remains compatible.
- The bonus is spawned by the server at the mined block.

## Approved candidate catalogue

The next candidates come from the agreed design pool drawing inspiration from **Minecraft Dungeons**, **Minecraft Dungeons II**, and **Diary of an 8-Bit Warrior**. This is a design catalogue, not a claim that every effect is already implemented or that every name is a direct source-game enchantment.

- **Defence and survival:** Defender, Resilience, Potion Barrier, Deflect, Health Synergy, Stone.
- **Movement and exploration:** Surefooted, Explorer, Water Affinity.
- **Utility and combat effects:** Chilling, Snowball, Stealth, Cool Down, Shadowcloak, Sunder.
- **Already represented in the prototype set:** Vitality, Safeguard, Springload.

## Technical notes

- Vitality, Aquatic, Safeguard, and Springload are refreshed once per second per online player.
- Prospector uses an event callback rather than a repeating block scan.
- Effects and bonus drops are applied by the server; no client script or Resource Pack is used.
- Lore markers are the current storage format. A later iteration may move metadata to item dynamic properties after compatibility testing.
- Bedrock does not expose a general-purpose API for registering arbitrary native enchantment types, so the initial system emulates selected effects on vanilla items.
- All prototypes still require testing in a disposable world before live deployment.

## Design rules

- Enchant vanilla equipment only; do not add custom armor or weapons.
- Keep effects modular and individually testable.
- Prefer stable Script APIs and verify event support before implementing event-driven effects.
- Avoid excessive particles, tick-heavy scans, and unnecessary entity iteration.
- Keep levels meaningful and balanced.
