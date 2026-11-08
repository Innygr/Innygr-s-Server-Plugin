# Enchantment Plan

The first release focuses on utility. These are **server-managed enchantment prototypes**, not entries in Bedrock's native enchantment registry. The pack marks compatible vanilla items with a small lore marker and applies effects from the dedicated server.

## Utility — first priority

| Enchantment | Equipment | Intended effect | Status |
|---|---|---|---|
| Vitality I–III | Chestplate | Passive regeneration; higher levels increase regeneration strength | Prototype implemented |
| Anchor I–III | Boots | Reduce knockback | Planned; API behavior needs verification |
| Aquatic I–III | Helmet | Water Breathing and level-scaled Dolphin's Grace | Prototype implemented |
| Prospector I–III | Pickaxe | Chance for one bonus ore drop | Server-side prototype implemented; needs in-game balance testing |
| Lumberjack I–III | Axe | Help collect connected logs | Planned; safe tree detection and drops need design |
| Angler's Luck I–III | Fishing rod | Improve fishing utility | Planned; fishing event support needs verification |
| Wayfinder | Compass | Navigation assistance | Planned |

## Prototype command

Operators apply a prototype to the matching item held in their main hand or worn in the relevant armor slot:

```text
/innygr:enchant vitality 1
/innygr:enchant vitality 2
/innygr:enchant vitality 3
/innygr:enchant aquatic 1
/innygr:enchant aquatic 2
/innygr:enchant aquatic 3
/innygr:enchant prospector 1
/innygr:enchant prospector 2
/innygr:enchant prospector 3
```

Vitality requires a chestplate, Aquatic requires a helmet, and Prospector requires a pickaxe in the main hand. Reapplying an enchantment replaces that enchantment's previous marker on the item.

## Prospector prototype

- Triggers from the server's player-break-block event.
- Applies only to supported vanilla ore blocks broken with a pickaxe carrying the Prospector marker.
- Bonus chance: 5% / 10% / 15% for levels I / II / III.
- Awards one additional item matching the ore's ordinary non-Silk-Touch drop.
- Silk Touch suppresses the bonus so the enchantment does not override Silk Touch's purpose.
- Fortune remains compatible; the Prospector bonus is a separate, flat chance.
- The bonus is spawned by the server at the mined block. No client script or Resource Pack is used.

## Technical notes

- Vitality and Aquatic effects are checked once per second per online player.
- Prospector uses an event callback rather than a repeating block scan.
- Effects and bonus drops are applied by the dedicated server; no client-side script or Resource Pack is required.
- Lore markers are a prototype storage format. A later iteration may move metadata to item dynamic properties after compatibility testing.
- These prototypes are not yet tested in a disposable world or on The Cat Server. Do not deploy them to the live world until a disposable-world test passes.
- Bedrock does not expose a general-purpose API for registering arbitrary native enchantment types, so the initial system emulates selected effects on vanilla items.

## Later categories

- Additional gameplay effects: design after the utility foundation is stable.
- Rare/legendary enchantments: later progression, with stronger effects and careful balancing.

## Design rules

- Enchant vanilla equipment only in the initial scope.
- Prefer clear, predictable effects over random complexity.
- Avoid excessive particle spam, tick-heavy scans, and unnecessary entity iteration.
- Make levels meaningful and balanced.
- Confirm API support before finalizing an effect.
