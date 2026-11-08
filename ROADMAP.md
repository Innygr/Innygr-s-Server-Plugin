# Roadmap

## Phase 0 — Foundation
- [x] Create the development branch.
- [x] Establish project scope and development priorities.
- [x] Confirm a stable Script API baseline: `@minecraft/server` 2.10.0.
- [ ] Select and add a license.
- [x] Add the Behavior Pack manifest and script entry point.
- [x] Keep the pack server-side only: no Resource Pack or client-side scripts.

## Phase 1 — Utility foundation
- [x] Implement a small, testable enchantment framework.
- [x] Prototype Vitality (chestplate regeneration).
- [x] Prototype Aquatic (helmet water breathing and swimming utility).
- [ ] Prototype Anchor (knockback reduction).
- [x] Implement Prospector's server-side ore-break bonus prototype.
- [ ] Prototype Lumberjack (tree-collection assistance).
- [ ] Prototype Angler's Luck (fishing utility).
- [ ] Prototype Wayfinder (navigation assistance).
- [ ] Test command registration, lore persistence, ore-drop behavior, and effect behavior on a disposable world.

## Phase 2 — Off-hand utility
- [ ] Audit supported Bedrock off-hand items and equipment-slot behavior.
- [ ] Prototype a compass/navigation utility only if the target server permits the item in the off-hand.
- [ ] Prototype server-side torch/visibility support only if it can work without client assets.
- [ ] Prototype compass/navigation support.
- [ ] Preserve vanilla shield, totem, and map behavior.

## Phase 3 — Additional gameplay
- [ ] Implement the remaining approved candidate enchantments only where supported by the server API.
- [ ] Add selected rare/legendary enchantments.
- [ ] Add configuration and compatibility documentation.

## Phase 4 — Release
- [ ] Test on a disposable world.
- [ ] Test multiplayer behavior and performance.
- [ ] Package a release-ready .mcpack.
- [ ] Deploy to The Cat Server after a verified backup.
