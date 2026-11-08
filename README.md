# Innygr's Server Plugin

A collection of gameplay additions and server-side utilities for **Minecraft Bedrock Dedicated Server**, beginning with the **InnygrEnchantments** Behavior Pack.

> **Status:** Early planning and scaffolding. Nothing in this repository should be considered a stable release yet.

## Project goals

- Add configurable, balanced utility enchantments to vanilla equipment.
- Introduce custom knives as a lighter, faster alternative to vanilla swords.
- Improve the usefulness of supported off-hand interactions.
- Expand later with additional combat and rare/legendary enchantments.
- Keep one maintained Behavior Pack source that can be enabled in multiple worlds.
- Test changes on a separate world before deploying them to The Cat Server.

## Important Bedrock distinction

This project is not a Java Edition server plugin. Bedrock Behavior Packs are enabled per world. We will maintain one shared pack build and register that same pack with each world that should use it; this gives us a plugin-like workflow without claiming that Bedrock has a globally loaded plugin system.

## Development priorities

1. Utility enchantments
2. Off-hand utility
3. Custom knives and combat additions
4. Legendary enchantments

See [the enchantment plan](docs/ENCHANTMENTS.md), [the knife design](docs/KNIVES.md), [the off-hand plan](docs/OFFHAND.md), and the [roadmap](ROADMAP.md).

## Repository layout

```text
.
├── docs/
│   ├── ENCHANTMENTS.md
│   ├── KNIVES.md
│   └── OFFHAND.md
├── CHANGELOG.md
└── ROADMAP.md
```

The actual Behavior Pack manifest and scripts will be added after the target Bedrock Script API version and supported mechanics are verified.

## Development principles

- Use vanilla equipment as the base for enchantments; custom knives are an explicit addition to the initial scope.
- Keep features modular and individually testable.
- Avoid undocumented or experimental APIs unless clearly isolated and tested.
- Back up worlds before deployment.
- Never deploy an untested development build to the live world.

## Current target

The Cat Server — Minecraft Bedrock Dedicated Server. The server is currently being stabilized, so pack deployment is intentionally on hold.

## License

License selection is pending.
