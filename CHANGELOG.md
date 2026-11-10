# Changelog

## Unreleased

### Added
- Initial server-only Behavior Pack manifest using stable `@minecraft/server` 2.10.0.
- Operator command `/innygr:enchant` for applying utility prototypes to compatible vanilla equipment.
- Vitality I–III chestplate regeneration prototype.
- Safeguard I–III chestplate Resistance prototype.
- Aquatic I–III helmet Water Breathing and Conduit Power prototype.
- Springload I–III boots Jump Boost prototype.
- Defender I–III off-hand shield Resistance prototype.
- Water Affinity I–III off-hand nautilus shell Conduit Power prototype.
- Multiple custom enchantments can coexist on a single compatible vanilla item.
- Prospector I–III pickaxe prototype with a server-side chance for one bonus ore drop.
- Silk Touch compatibility check for Prospector.
- One-second server-side effect refresh loop and event-driven mining bonus handling.
- `/innygr:companion summon` and `/innygr:companion dismiss` for one owner-bound vanilla wolf per dimension.
- Guardian companions use vanilla taming, following, and owner-defence behavior.
- Endersteel upgrade markers for each piece of equipped vanilla diamond armor.
- Voidbound full-set bonus: void damage returns a fully equipped player to the Overworld's default spawn.
- Operator command `/innygr:endersteel <head|chest|legs|feet>` to upgrade the matching worn armor piece.
- Endersteel documentation and roadmap tracking.
- Static regression tests for manifest structure, server-only packaging, enchantment behavior, Endersteel, and companion ownership rules.
- Mocked runtime coverage for Endersteel upgrade validation and Voidbound full-set and invalid-player handling.

### Notes
- Endersteel currently uses marked diamond armor and does not change vanilla armor stats, durability, or appearance.
- No Resource Pack, client-side scripts, custom textures, or client downloads are included.
- Prototype behavior has not yet been tested in a disposable world or on The Cat Server.
- Voidbound and all other prototypes require testing in a disposable world before live deployment.
- No live server deployment or restart was performed.
