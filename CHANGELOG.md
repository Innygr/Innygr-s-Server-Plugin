# Changelog

## v0.1.5.3 — testing candidate

### Added
- Restrict package-builder output inside the repository to `dist/` and atomically replace the SHA-256 sidecar.
- Add a regression test proving a mistyped output path cannot overwrite README or other repository source files.
- Deferred equipment and companion command mutations through `system.run`, as required by Minecraft's restricted custom-command callback context.
- Runtime tests enforce restricted-context write bans for item lore, equipment, and companion entities.
- Lore updates use `ItemStack.getRawLore()` to preserve structured `RawMessage` entries, and refuse to exceed Minecraft's 20-line lore limit for enchantments and Endersteel.
- Runtime coverage verifies RawMessage marker reads, queued companion duplicate prevention, and cleanup after tameable-component, taming, or name-tag failures.
- Disposable BDS instructions now specify Creative mode, cheats/content logging, and non-default IPv4/IPv6 ports to avoid the usual server ports.
- A documentation regression test keeps the disposable setup world-scoped and separated from the live server volume.
- Voidbound resolves Bedrock's automatic world-spawn height using the Overworld's topmost block, preserves the provided destination across dimension changes, and fails open when no usable surface is available.
- Corrected Entity.isValid handling to use the stable boolean property; the runtime harness now models the official API shape.
- Regression tests cover automatic spawn height, missing terrain, and liquid spawn surfaces.
- Runtime tests verifying command state changes occur on the scheduled tick and report their eventual result in chat.
- Four-part project version file and versioned package names.
- Bedrock manifest version synchronization with the first three project-version components.
- SHA-256 sidecar generation and verification in CI.
- A disposable-world test-results template, explicit candidate test matrix, and per-world Bedrock Dedicated Server setup recipe.
- One consolidated version-named commit per development increment.

### Validation
- CI runs JavaScript syntax checks, 30 mocked runtime cases, Python regression tests, versioned package construction, and checksum verification.
- In-game testing, Bedrock server compatibility, multiplayer behavior, and performance remain unverified.

### Not included
- No live-world installation, server deployment, or restart.

### Existing prototype features
- Runtime regressions for enchantment reapplication, shared-effect priority, refresh timing, and natural effect expiry after gear removal.
- Prospector threshold tests for all three levels, plus deepslate and Nether ore mapping coverage.
- Package-builder protection and regression tests preventing output paths from overwriting source files.
- Deterministic `.mcpack` packaging containing only the manifest and server script.
- GitHub Actions artifact upload for the built pack (14-day retention).
- Disposable-world testing guide covering commands, enchantments, Endersteel, companions, and the deployment gate.
- Regression tests for archive contents and reproducible package output.
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
- Removing enchanted gear stops effect refresh; any remaining short-duration effect expires naturally rather than being forcibly cleared.
- Prototype behavior has not yet been tested in a disposable world or on The Cat Server.
- Voidbound and all other prototypes require testing in a disposable world before live deployment.
- No live server deployment or restart was performed.
