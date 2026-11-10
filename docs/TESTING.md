# Disposable-world testing guide

This guide validates a development build without risking an existing survival world. **Do not install this pack into The Cat Server's live world during this test.**

## 1. Build the test package

From the repository root:

```bash
python3 tools/package_pack.py
```

The builder creates `dist/InnygrEnchantments.mcpack`. The archive intentionally contains only `manifest.json` and `scripts/main.js`; it excludes tests, documentation, source-control metadata, and client assets. Fixed ZIP timestamps make identical source inputs produce identical archive bytes.

## 2. Create an isolated test world

1. Back up any world you care about before changing its pack configuration.
2. Create a brand-new Creative test world with cheats enabled.
3. Use the same Bedrock Dedicated Server version intended for eventual deployment.
4. Keep this world separate from all live worlds.
5. Import the `.mcpack` into a local Bedrock test environment, or copy the pack into that test world's behavior-pack directory and enable it in that world's pack configuration.
6. Start the test world and inspect the content log for script module or dependency errors.

The manifest declares stable `@minecraft/server` 2.10.0. If the target runtime does not satisfy that dependency, stop and resolve compatibility before testing gameplay.

## 3. Command and permission checks

Run these as an operator:

| Check | Action | Expected result |
|---|---|---|
| Companion registration | `/innygr:companion summon` | One tamed guardian wolf appears |
| Duplicate prevention | Summon again in the same dimension | Second summon is refused |
| Dismissal | `/innygr:companion dismiss` | Only your owned companion is removed |
| Enchantment command | Wear a diamond chestplate; `/innygr:enchant vitality 1` | Command reports success |
| Invalid enchantment | `/innygr:enchant vitality 4` | Command rejects the level |
| Endersteel command | Wear a diamond helmet; `/innygr:endersteel head` | Helmet receives Endersteel lore |
| Invalid Endersteel slot | Wear iron boots; `/innygr:endersteel feet` | Command rejects the item |

## 4. Enchantment checks

Use fresh vanilla items and check both lore and behavior.

| Feature | Test | Expected result |
|---|---|---|
| Marker coexistence | Apply Vitality and Safeguard to one chestplate | Both markers remain |
| Reapplication | Reapply Vitality at a different level | Only Vitality's level changes |
| Vitality | Wear the marked chestplate | Regeneration is applied |
| Safeguard | Wear the marked chestplate | Resistance is applied |
| Aquatic | Wear a marked helmet underwater | Water Breathing and Conduit Power are applied |
| Springload | Wear marked boots | Jump Boost is applied |
| Defender | Hold a marked shield in the off-hand | Resistance applies; vanilla blocking still works |
| Water Affinity | Hold a marked nautilus shell underwater | Water-related effects apply |
| Effect removal | Remove the marked item and wait for refresh/expiry | Its custom effect is no longer refreshed |
| Prospector | Mine supported ore with a marked pickaxe | Bonus drop follows its 5% / 10% / 15% level chance |
| Silk Touch | Mine supported ore with a marked Silk Touch pickaxe | No Prospector bonus drop |

Prospector is randomized; repeat trials and do not treat one mining result as proof of its probability.

## 5. Endersteel / Voidbound checks

1. Upgrade each worn diamond armor piece with the matching `/innygr:endersteel` subcommand.
2. Confirm the visible Endersteel lore appears on all four pieces.
3. Remove one piece and confirm the set is incomplete.
4. In the isolated Creative test world, use a controlled setup to enter the void with the full set.
5. Confirm void damage is cancelled and the player returns to the Overworld default spawn.
6. Test without the full set only in this disposable world, with a reliable reset path.

Never perform void tests in a valuable world. Mock tests cannot establish real event timing or cross-dimension teleport compatibility.

## 6. Companion multiplayer checks

With at least two test players:

- Each player can summon their own companion.
- One player cannot dismiss another player's companion.
- Check owner association after dimension changes, respecting the documented per-dimension behavior.
- Observe vanilla following and defensive behavior; do not assume proactive hostility toward every player.

## 7. Record results

For every check, record the Bedrock version, whether the world was freshly created, pass/fail/blocked, exact chat or content-log errors, and whether the behavior was repeated successfully.

A feature is not in-game verified until its result is recorded against the target Bedrock runtime. Passing GitHub Actions validates syntax, mocked behavior, pack structure, and archive construction—not live game behavior.

## 8. Deployment gate

Do not deploy to The Cat Server until all required disposable-world checks pass, multiplayer and basic performance checks are complete, a verified backup exists, the exact tested package is identified by commit and checksum, and deployment is explicitly approved by the server owner.
