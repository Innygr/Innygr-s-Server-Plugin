# Roadmap

## Phase 0 — Foundation
- [x] Create the development branch.
- [x] Establish project scope and development priorities.
- [x] Confirm a stable Script API baseline: `@minecraft/server` 2.10.0.
- [ ] Select and add a license.
- [x] Add the Behavior Pack manifest and script entry point.
- [x] Keep the pack server-side only: no Resource Pack or client-side scripts.

## Phase 1 — Utility enchantments
- [x] Implement the enchantment marker and effect framework.
- [x] Prototype Vitality (chestplate regeneration).
- [x] Prototype Safeguard (chestplate Resistance).
- [x] Prototype Aquatic (helmet water breathing and swimming utility).
- [x] Prototype Springload (boots Jump Boost).
- [x] Implement Prospector's server-side ore-break bonus.
- [ ] Implement the remaining approved candidate enchantments where stable API support exists.
- [ ] Test multi-enchantment lore persistence, command registration, effects, and ore drops in a disposable world.

## Phase 2 — Off-hand utility
- [ ] Audit supported Bedrock off-hand items and equipment-slot behavior on 1.26.63.1.
- [ ] Prototype compass/navigation utility only if the target server permits a compass in the off-hand.
- [ ] Investigate server-side visibility support without client assets.
- [ ] Preserve vanilla shield, totem, and map behavior.

## Phase 3 — Additional gameplay
- [ ] Add selected rare/legendary enchantments after the utility set is stable.
- [ ] Add configuration and compatibility documentation.

## Phase 4 — Release
- [ ] Test on a disposable world.
- [ ] Test multiplayer behavior and performance.
- [ ] Package a release-ready `.mcpack`.
- [ ] Deploy to The Cat Server only after a verified backup.
