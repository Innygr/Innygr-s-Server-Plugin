# Knife Design

## Design goal

Knives are a custom, lightweight weapon class. Compared with vanilla swords, they should trade reach and per-hit damage for a faster attack cadence.

## Core identity

| Attribute | Knife direction | Relative to swords |
|---|---|---|
| Attack cooldown / cadence | Shorter cooldown; faster repeated attacks | Faster |
| Attack reach | Shorter | Shorter |
| Damage per hit | Lower | Lower |

The intended result is a distinct close-range option, not a direct sword upgrade. Exact values and progression are intentionally undecided until tested in-game.

## Implementation checks

Bedrock may not expose every Java-style weapon attribute as a directly configurable item component. Before implementation, verify the current target version's supported item components and Script API behavior for:

- Custom item registration and usable weapon behavior.
- Attack damage and attack timing.
- Actual hit reach / interaction distance.
- Multiplayer consistency and server authority.

If a property cannot be changed reliably through supported APIs, document the limitation and choose a tested alternative rather than relying on a visual-only or client-only effect.

## Balance and testing

- Compare each knife against the equivalent progression-tier sword.
- Confirm knives have lower damage per hit and shorter effective reach.
- Confirm their faster cadence is consistent in multiplayer.
- Check durability, crafting cost, enchantment compatibility, and repair behavior before finalizing recipes.
- Test against players and mobs in a disposable world before live deployment.

## Current status

Design specification only. No knife items, recipes, stats, or scripts have been implemented yet.
