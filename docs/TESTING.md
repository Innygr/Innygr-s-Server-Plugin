# v0.1.5.3 disposable-world test guide

This guide is for the **v0.1.5.3 testing candidate**. It is not a live-server deployment guide. **Do not install this pack into The Cat Server's live world during testing.**

## 1. Identify the exact candidate

The repository's `VERSION` file must read `v0.1.5.3`. Use the GitHub Actions artifact named `InnygrEnchantments-v0.1.5.3` from the successful workflow run for the candidate commit, or build locally:

```bash
cat VERSION
python3 tools/package_pack.py
cd dist
sha256sum -c InnygrEnchantments-v0.1.5.3.mcpack.sha256
```

Record the full commit SHA and package SHA-256 in [the results template](TEST-RESULTS-TEMPLATE.md). Do not mix a package from one commit with a report for another. The package contains only `manifest.json` and `scripts/main.js`; the checksum is a separate sidecar.

## 2. Prepare an isolated test environment

1. Create a brand-new disposable Creative world with cheats enabled. Do not reuse a survival world.
2. Use the exact intended Bedrock Dedicated Server version: **1.26.63.1**. Record the actual version in the test report.
3. Keep the test world separate from every live world. Back up anything that matters before changing any world configuration.
4. Install the candidate Behavior Pack into this test world only and enable it for that world.
5. Start the world and inspect the content/script log for module, dependency, or startup errors.
6. Confirm the pack is enabled and the custom commands register before proceeding.

Custom command callbacks run in Minecraft's restricted before context, so the plugin queues equipment and companion changes for the next normal script tick. A command first reports that the request is queued; the actual success or failure message then appears in chat.

The manifest declares stable `@minecraft/server` 2.10.0 and manifest version `[0, 1, 5]`. The project build component `.3` is carried by the project version and package filename.

## 3. Command and permission checks

Test with an operator and a normal player. Record the actual response and whether the command is available to the intended permission level.

| ID | Action | Expected result |
|---|---|---|
| CMD-01 | Operator runs `/innygr:companion summon` | One tamed guardian wolf appears |
| CMD-02 | Same player summons again in that dimension | Duplicate summon is refused |
| CMD-03 | Player runs `/innygr:companion dismiss` | Only that player's companion in the current dimension is removed |
| CMD-04 | Normal player runs companion summon/dismiss | Available without operator permission or cheats |
| CMD-05 | Operator applies `/innygr:enchant vitality 1` while wearing a diamond chestplate | Command reports that the request is queued, then chat confirms success |
| CMD-06 | Operator runs `/innygr:enchant vitality 4` | Queued result message rejects the invalid level; the item stays unchanged |
| CMD-07 | Operator wears a diamond helmet and runs `/innygr:endersteel head` | Queued result message confirms the helmet receives Endersteel lore |
| CMD-08 | Operator wears iron boots and runs `/innygr:endersteel feet` | Queued result message rejects the item; armor lore stays unchanged |

## 4. Enchantment checks

Use fresh vanilla items and check both visible lore and actual in-game behavior. The pack reserves two lore lines per marker and refuses an application that would exceed Bedrock's 20-line lore limit; structured `RawMessage` lore entries should remain intact.

| ID | Feature | Test | Expected result |
|---|---|---|---|
| ENC-01 | Marker coexistence | Apply Vitality and Safeguard to one chestplate | Both markers and labels remain |
| ENC-02 | Reapplication | Reapply Vitality at another level | Only Vitality's level changes |
| ENC-03 | Vitality | Wear the marked chestplate | Regeneration is applied |
| ENC-04 | Safeguard | Wear the marked chestplate | Resistance is applied |
| ENC-05 | Aquatic | Wear a marked helmet underwater | Water Breathing and Conduit Power are applied |
| ENC-06 | Springload | Wear marked boots | Jump Boost is applied |
| ENC-07 | Defender | Hold a marked shield in the off-hand | Resistance applies and vanilla shield blocking still works |
| ENC-08 | Water Affinity | Hold a marked nautilus shell in the off-hand underwater | Water-related effects apply |
| ENC-09 | Effect removal | Remove the marked item and wait up to about two seconds | Its custom effect is no longer refreshed; any remaining short effect expires naturally |
| ENC-10 | Shared effect | Equip Safeguard and Defender at different levels | The stronger active Resistance level is not replaced by the weaker one |
| ENC-11 | Vanilla interactions | Test a totem and map in the off-hand without custom gear | Vanilla behavior remains intact |

## 5. Prospector checks

Test each level on supported ores, including stone/deepslate variants and Nether ores. Test both normal and Silk Touch pickaxes.

| ID | Test | Expected result |
|---|---|---|
| PRO-01 | Mine supported ore with Prospector I | Bonus drop occurs at the configured 5% chance |
| PRO-02 | Mine supported ore with Prospector II | Bonus drop occurs at the configured 10% chance |
| PRO-03 | Mine supported ore with Prospector III | Bonus drop occurs at the configured 15% chance |
| PRO-04 | Mine with Silk Touch | No Prospector bonus is added |
| PRO-05 | Mine an unsupported block or use a non-pickaxe | No bonus is added |

Prospector is randomized. Collect a reasonable number of trials for each level and record the sample size and bonus count; do not expect a small sample to equal the configured percentage exactly.

## 6. Endersteel / Voidbound checks

Only do these checks in the disposable world, with a reliable reset path.

1. Upgrade each worn diamond armor piece with the matching `/innygr:endersteel` subcommand.
2. Confirm Endersteel lore appears on all four matching diamond armor pieces and survives unequip/re-equip. A copied marker on a non-diamond armor item must not count toward the set.
3. Remove one piece and confirm the set is incomplete.
4. With the full set, use a controlled test setup to enter the void.
5. Confirm void damage is cancelled and the player returns to the Overworld's default spawn surface, at the selected coordinates rather than an engine-selected dimension spawn. When the world spawn uses Bedrock's automatic-height sentinel, the script resolves the topmost block before cancelling damage; if it cannot resolve a usable non-liquid surface, normal void damage is allowed.
6. Repeat without a full set only if the test world can be reset safely.
7. Check the content log for event or teleport errors.

Mock tests cover the automatic-height sentinel, a missing spawn surface, and a liquid surface. They cannot establish real event timing, chunk availability, survival behavior, or cross-dimension teleport compatibility.

## 7. Companion multiplayer checks

Use at least two test players:

- Each player can summon their own companion.
- One player cannot dismiss another player's companion.
- A player can summon one companion in each dimension; dismissal is scoped to the current dimension.
- Check owner association after dimension changes.
- Observe vanilla following and defensive behavior. Do not assume proactive hostility toward every player.

## 8. Basic stability / performance

- Leave at least two players online with the pack active for 10–15 minutes.
- Exercise normal movement, inventory changes, dimension travel, mining, and equipment swaps.
- Check server and content logs for repeated errors.
- Check that players without custom items are unaffected.
- Record any noticeable tick/performance changes and the number of online players.

## 9. Record results

Use [TEST-RESULTS-TEMPLATE.md](TEST-RESULTS-TEMPLATE.md). Mark every test **PASS**, **FAIL**, **BLOCKED**, or **NOT RUN**; include exact errors and reproduction steps. A feature is not in-game verified until its result is recorded against the target runtime.

Passing GitHub Actions validates syntax, mocked behavior, manifest/version consistency, package structure, and checksum generation—not live game behavior.

## 10. Deployment gate

Do not deploy to The Cat Server until all required disposable-world checks pass, multiplayer and basic performance checks are complete, a verified backup exists, the exact tested package is identified by commit and checksum, and deployment is explicitly approved by the server owner.
