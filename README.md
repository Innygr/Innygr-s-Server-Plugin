# Innygr's Server Plugin

A collection of gameplay additions and server-side utilities for **Minecraft Bedrock Dedicated Server**, beginning with the **InnygrEnchantments** Behavior Pack.

> **Status:** Early development. Utility enchantment prototypes and the Endersteel/Voidbound prototype are implemented but not yet tested in-game.

## Non-negotiable architecture

**Server-side only.** This project uses a Behavior Pack with server-executed JavaScript. It does not include a Resource Pack, client-side scripts, custom textures, models, animations, or client downloads.

## Project goals

- Add configurable, balanced utility enchantments to vanilla equipment.
- Add an End-themed armor progression with a distinctive full-set bonus.
- Improve the usefulness of supported off-hand interactions without replacing vanilla behavior.
- Keep one maintained Behavior Pack source that can be enabled in multiple worlds.
- Test changes on a separate world before deploying them to The Cat Server.

## Important Bedrock distinction

This project is not a Java Edition server plugin. Bedrock Behavior Packs are enabled per world. We maintain one shared pack build and register that same pack with each world that should use it; this provides a plugin-like workflow without claiming Bedrock has a globally loaded plugin system.

Because this pack is server-side-only, Endersteel currently uses marked vanilla diamond armor as its base. The prototype adds its set bonus but **does not yet change vanilla armor attributes, durability, or appearance**. Those require a custom item/asset approach beyond the current pack scope.

## Endersteel

Endersteel is the End's equipment tier, intended as the counterpart to Netherite. Operators can upgrade each worn diamond armor piece with:

```text
/innygr:endersteel head
/innygr:endersteel chest
/innygr:endersteel legs
/innygr:endersteel feet
```

Wearing all four marked pieces activates **Voidbound**: the pack cancels incoming void damage before it is applied, then returns the player to the Overworld's default spawn on the next script tick. The bonus is all-or-nothing; removing any Endersteel armor piece disables it.

## Guardian companions

Players can summon one owner-bound vanilla wolf per dimension with `/innygr:companion summon` and dismiss it with `/innygr:companion dismiss`. The wolf is tamed to its summoner, so it recognizes that player as its owner and uses vanilla follow/defence behavior. It can defend its owner when threatened; the current server-only implementation does not force it to attack every other player on sight.

## Current prototypes

- **Vitality I–III:** chestplate-based passive regeneration.
- **Safeguard I–III:** chestplate-based Resistance.
- **Aquatic I–III:** helmet-based Water Breathing and level-scaled Conduit Power.
- **Springload I–III:** boots-based Jump Boost.
- **Defender I–III:** off-hand shield-based Resistance while preserving normal shield blocking.
- **Water Affinity I–III:** off-hand nautilus shell-based Conduit Power for underwater breathing, visibility, and mining utility.
- **Prospector I–III:** pickaxe-based chance for one bonus ore drop, with Silk Touch respected.

Multiple custom enchantments can coexist on one compatible vanilla item.

Operators apply a prototype using `/innygr:enchant <vitality|safeguard|aquatic|springload|defender|water_affinity|prospector> <1-3>` while wearing or holding the matching item.

See [the enchantment plan](docs/ENCHANTMENTS.md), [the off-hand plan](docs/OFFHAND.md), and the [roadmap](ROADMAP.md).

## Repository layout

```text
.
├── docs/
│   ├── ENCHANTMENTS.md
│   └── OFFHAND.md
├── scripts/
│   └── main.js
├── tests/
│   ├── runtime.test.mjs
│   └── test_pack.py
├── manifest.json
├── CHANGELOG.md
└── ROADMAP.md
```

## Automated checks

Run the checks locally:

```bash
node --input-type=module --check < scripts/main.js
node --test tests/runtime.test.mjs
python3 -m unittest discover -s tests -v
```

GitHub Actions runs all three checks on pushes and pull requests. The Node runtime suite evaluates the actual script with a small mocked Bedrock Script API surface and exercises command registration, enchantment application, effect refresh safeguards, Prospector drops and Silk Touch handling, guardian companion ownership/summon/dismiss edge cases, Endersteel upgrade validation, and Voidbound full-set/invalid-player event flow. Python tests continue to check pack structure and implementation contracts.

**Passing CI is not a substitute for in-game testing.** The mock harness cannot prove real Bedrock command registration, item lore persistence, entity behavior, or cross-dimension teleporting. Those still need verification in a disposable Bedrock world.

## Development principles

- Use vanilla equipment as the base for utility enchantments.
- Keep features modular and individually testable.
- Prefer stable Script APIs.
- Avoid undocumented or experimental APIs unless clearly isolated and tested.
- Back up worlds before deployment.
- Never deploy an untested development build to the live world.

## Current target

The Cat Server — Minecraft Bedrock Dedicated Server 1.26.63.1. Pack deployment is on hold until the server is stable and a disposable test world is available.

## License

Released under the MIT License; see [LICENSE](LICENSE).
