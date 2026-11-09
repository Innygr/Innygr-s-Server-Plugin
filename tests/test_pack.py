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


if __name__ == "__main__":
    unittest.main()
