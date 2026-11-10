import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (ROOT / "scripts" / "main.js").read_text(encoding="utf-8")


class BehaviorPackContractTests(unittest.TestCase):
    def test_manifest_uses_server_script_module(self):
        manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(len(manifest["modules"]), 1)
        self.assertEqual(manifest["modules"][0]["type"], "script")
        self.assertEqual(manifest["modules"][0]["entry"], "scripts/main.js")
        self.assertEqual(
            manifest["dependencies"][0]["module_name"], "@minecraft/server"
        )
        self.assertEqual(manifest["dependencies"][0]["version"], "2.10.0")

    def test_pack_has_no_client_resource_assets(self):
        self.assertFalse((ROOT / "textures").exists())
        self.assertFalse((ROOT / "resource_pack").exists())

    def test_endersteel_covers_all_four_diamond_armor_slots(self):
        for piece, item_id in {
            "head": "minecraft:diamond_helmet",
            "chest": "minecraft:diamond_chestplate",
            "legs": "minecraft:diamond_leggings",
            "feet": "minecraft:diamond_boots",
        }.items():
            with self.subTest(piece=piece):
                self.assertRegex(
                    SCRIPT,
                    rf"{piece}:\s*\{{\s*slot:\s*EquipmentSlot\.",
                )
                self.assertIn(item_id, SCRIPT)

    def test_voidbound_cancels_void_damage_before_scheduling_return(self):
        self.assertIn("world.beforeEvents.entityHurt.subscribe(handleVoidbound)", SCRIPT)
        handler = re.search(
            r"function handleVoidbound\(event\) \{(?P<body>[\s\S]*?)\n\}",
            SCRIPT,
        )
        self.assertIsNotNone(handler)
        body = handler.group("body")
        self.assertIn('event.damageSource?.cause !== "void"', body)
        self.assertIn("hasFullEndersteelSet(equippable)", body)
        self.assertIn("event.cancel = true", body)
        self.assertIn("system.run(() =>", body)
        self.assertIn('world.getDimension("overworld")', body)

    def test_endersteel_command_is_admin_only(self):
        command = SCRIPT.split('name: "innygr:endersteel"', 1)[1].split("registry.registerEnum", 1)[0]
        self.assertIn("CommandPermissionLevel.Admin", command)
        self.assertIn("applyEndersteel(source, args[0])", command)

    def test_enchantment_markers_are_scoped_per_enchantment(self):
        self.assertIn("function getMarkerLine(enchantment, level)", SCRIPT)
        self.assertIn("const markerPrefix = `${PACK_PREFIX}${enchantment}:`", SCRIPT)
        self.assertIn("if (line.startsWith(markerPrefix))", SCRIPT)
        self.assertIn("lore.push(getMarkerLine(enchantment, level))", SCRIPT)

    def test_enchantment_levels_are_validated_before_application(self):
        self.assertIn(
            "!Number.isInteger(level) || level < 1 || level > definition.maxLevel",
            SCRIPT,
        )
        self.assertIn("ROMAN_LEVELS[level]", SCRIPT)

    def test_effect_refresh_does_not_overwrite_stronger_effect(self):
        self.assertIn("existing.amplifier > amplifier", SCRIPT)
        self.assertIn("existing.duration > 25", SCRIPT)

    def test_prospector_respects_silk_touch_and_level_chances(self):
        self.assertIn("const PROSPECTOR_CHANCES = [0, 0.05, 0.10, 0.15]", SCRIPT)
        self.assertIn('enchantable?.hasEnchantment("silk_touch")', SCRIPT)
        self.assertIn("Math.random() >= PROSPECTOR_CHANCES[level]", SCRIPT)

    def test_companion_command_is_available_to_players(self):
        command = SCRIPT.split('name: "innygr:companion"', 1)[1].split(
            'registry.registerEnum("innygr:endersteel_piece"', 1
        )[0]
        self.assertIn("permissionLevel: CommandPermissionLevel.Any", command)
        self.assertIn("cheatsRequired: false", command)

    def test_companion_is_owner_bound_and_dimension_scoped(self):
        self.assertIn('.getEntities({ type: "minecraft:wolf" })', SCRIPT)
        self.assertIn("tameable?.tamedToPlayerId === player.id", SCRIPT)
        self.assertIn("player.dimension", SCRIPT)
        self.assertIn("tameable?.tame(player)", SCRIPT)

    def test_companion_prevents_duplicates_and_dismisses_owned_wolves(self):
        self.assertIn('if (args[0] === "dismiss")', SCRIPT)
        self.assertIn("for (const wolf of ownedWolves)", SCRIPT)
        self.assertIn("wolf.remove()", SCRIPT)
        self.assertIn("if (ownedWolves.length > 0)", SCRIPT)
        self.assertIn("already have a guardian companion in this dimension", SCRIPT)


if __name__ == "__main__":
    unittest.main()
