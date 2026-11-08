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
- [x] Implement Defender for vanilla off-hand shields.
- [x] Implement Water Affinity for vanilla off-hand nautilus shells.
- [ ] Implement the remaining approved candidate enchantments where stable API support exists.
- [ ] Test multi-enchantment lore persistence, command registration, effects, and ore drops in a disposable world.

## Phase 2 — Guardian companions
- [x] Add a player command to summon and dismiss an owner-bound vanilla wolf.
- [x] Use the vanilla tameable component so the companion recognizes its summoner.
- [ ] Test owner persistence, following, and defensive behavior in multiplayer.
- [ ] Evaluate whether a future custom-entity approach is warranted for proactive player-targeting behavior.

## Phase 3 — Off-hand validation
- [x] Add off-hand equipment reads using the stable Script API.
- [ ] Verify shield and nautilus-shell compatibility on Bedrock 1.26.63.1.
- [ ] Confirm Defender does not interfere with vanilla shield blocking.
- [ ] Confirm Water Affinity stops refreshing after removing the shell.
- [ ] Preserve vanilla totem and map behavior.

## Phase 4 — Additional gameplay
- [ ] Add selected rare/legendary enchantments after the utility set is stable.
- [ ] Add configuration and compatibility documentation.

## Phase 5 — Release
- [ ] Test on a disposable world.
- [ ] Test multiplayer behavior and performance.
- [ ] Package a release-ready `.mcpack`.
- [ ] Deploy to The Cat Server only after a verified backup.
