# Innygr's Server Plugin

A collection of gameplay additions and server-side utilities for **Minecraft Bedrock Dedicated Server**, beginning with the **InnygrEnchantments** Behavior Pack.

> **Status:** Early development. Vitality, Aquatic, and Prospector prototypes are implemented but not yet tested in-game.

## Non-negotiable architecture

**Server-side only.** This project uses a Behavior Pack with server-executed JavaScript. It does not include a Resource Pack, client-side scripts, custom textures, models, animations, or client downloads.

## Project goals

- Add configurable, balanced utility enchantments to vanilla equipment.
- Improve the usefulness of supported off-hand interactions without replacing vanilla behavior.
- Expand later with additional non-weapon gameplay effects and rare/legendary enchantments.
- Keep one maintained Behavior Pack source that can be enabled in multiple worlds.
- Test changes on a separate world before deploying them to The Cat Server.

## Important Bedrock distinction

This project is not a Java Edition server plugin. Bedrock Behavior Packs are enabled per world. We maintain one shared pack build and register that same pack with each world that should use it; this provides a plugin-like workflow without claiming Bedrock has a globally loaded plugin system.

## Current prototypes

- **Vitality I–III:** chestplate-based passive regeneration.
- **Aquatic I–III:** helmet-based Water Breathing and level-scaled Dolphin's Grace.
- **Prospector I–III:** pickaxe-based chance for one bonus ore drop, with Silk Touch respected.

Operators apply a prototype using `/innygr:enchant <vitality|aquatic|prospector> <1-3>` while wearing or holding the matching item.

See [the enchantment plan](docs/ENCHANTMENTS.md), [the off-hand plan](docs/OFFHAND.md), and the [roadmap](ROADMAP.md).

## Repository layout

```text
.
├── docs/
│   ├── ENCHANTMENTS.md
│   └── OFFHAND.md
├── scripts/
│   └── main.js
├── manifest.json
├── CHANGELOG.md
└── ROADMAP.md
```

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

License selection is pending.
