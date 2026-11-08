# Enchantment Plan

The first release focuses on utility. These are **server-managed enchantment prototypes**, not entries in Bedrock's native enchantment registry. The pack marks compatible vanilla armor with a small lore marker and applies the effect from the dedicated server.

## Utility — first priority

| Enchantment | Equipment | Intended effect | Status |
|---|---|---|---|
| Vitality I–III | Chestplate | Passive regeneration; higher levels increase regeneration strength | Prototype implemented |
| Anchor I–III | Boots | Reduce knockback | Planned; API behavior needs verification |
| Aquatic I–III | Helmet | Water Breathing and level-scaled Dolphin's Grace | Prototype implemented |
| Prospector I–III | Pickaxe | Chance for bonus mining drops | Planned; block-drop interception needs verification |
| Lumberjack I–III | Axe | Help collect connected logs | Planned; safe tree detection and drops need design |
| Angler's Luck I–III | Fishing rod | Improve fishing utility | Planned; fishing event support needs verification |
| Wayfinder | Compass | Navigation assistance | Planned |

## Prototype command

Operators can apply a prototype enchantment to the matching armor currently equipped:

```text
/innygr:enchant vitality 1
/innygr:enchant vitality 2
/innygr:enchant vitality 3
/innygr:enchant aquatic 1
/innygr:enchant aquatic 2
/innygr:enchant aquatic 3
```

Vitality requires a chestplate. Aquatic requires a helmet. The command is operator-only. Reapplying an enchantment replaces that enchantment's previous level on the item.

## Technical notes

- The script checks equipped armor once per second.
- Effects are applied by the dedicated server; no client-side script or Resource Pack is required.
- Lore markers are a prototype storage format. A later iteration may move metadata to item dynamic properties after compatibility testing.
- These prototypes are not yet tested on The Cat Server. Do not deploy them to the live world until a disposable-world test passes.
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
