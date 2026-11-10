import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = (ROOT / "scripts" / "main.js").read_text(encoding="utf-8")


class BehaviorPackContractTests(unittest.TestCase):
    def test_project_version_matches_bedrock_manifest_version(self):
        import re

        version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
        match = re.fullmatch(
            r"v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)",
            version,
        )
        self.assertIsNotNone(match)
        expected = [int(part) for part in match.groups()[:3]]
        manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["header"]["version"], expected)
        self.assertEqual(manifest["modules"][0]["version"], expected)

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
        self.assertIn("getVoidboundDestination()", body)
        self.assertIn("system.run(() =>", body)

        destination = SCRIPT.split("function getVoidboundDestination() {", 1)[1]
        destination_body = destination.split(chr(10) + "}", 1)[0]
        self.assertIn('world.getDimension("overworld")', destination_body)
        self.assertIn("getTopmostBlock", destination_body)
        self.assertIn("surface.y + 1", destination_body)
        self.assertIn("surface.isLiquid", destination_body)
        self.assertIn("forceProvidedPositionOnDimensionChange: true", SCRIPT)
        self.assertIn("if (!player.isValid) return", SCRIPT)



    def test_disposable_bds_guide_uses_isolated_world_and_distinct_ports(self):
        guide = (ROOT / "docs" / "DISPOSABLE-BDS-SETUP.md").read_text(encoding="utf-8")
        self.assertIn("worlds/Innygr-Plugin-Test/behavior_packs/", guide)
        self.assertIn("world_behavior_packs.json", guide)
        self.assertIn("level-name=Innygr-Plugin-Test", guide)
        self.assertIn("gamemode=creative", guide)
        self.assertIn("allow-cheats=true", guide)
        self.assertIn("content-log-file-enabled=true", guide)
        self.assertIn("server-port=19134", guide)
        self.assertIn("server-portv6=19135", guide)
        self.assertIn("enable-lan-visibility=false", guide)
        self.assertIn("Do not reuse or bind-mount the live server's world volume.", guide)

    def test_voidbound_requires_matching_diamond_armor_types(self):
        full_set = SCRIPT.split("function hasFullEndersteelSet(equippable)", 1)[1]
        full_set = full_set.split(chr(10) + "}", 1)[0]
        self.assertIn("Object.values(ENDERSTEEL_PIECES)", full_set)
        self.assertIn("item?.typeId === piece.typeId", full_set)
        self.assertIn("hasEndersteel(item)", full_set)

    def test_endersteel_command_is_admin_only(self):
        command = SCRIPT.split('name: "innygr:endersteel"', 1)[1].split("registry.registerEnum", 1)[0]
        self.assertIn("CommandPermissionLevel.Admin", command)
        self.assertIn("applyEndersteel(source, args[0])", command)

    def test_enchantment_markers_are_scoped_per_enchantment(self):
        self.assertIn("function getMarkerLine(enchantment, level)", SCRIPT)
        self.assertIn("const markerPrefix = `${PACK_PREFIX}${enchantment}:`", SCRIPT)
        self.assertIn('if (typeof line === "string" && line.startsWith(markerPrefix))', SCRIPT)
        self.assertIn("lore.push(getMarkerLine(enchantment, level))", SCRIPT)
        self.assertIn("item.getRawLore()", SCRIPT)
        self.assertIn("getLoreEntryText(entry)", SCRIPT)
        self.assertIn("lore.push(entry)", SCRIPT)


    def test_endersteel_marker_reads_raw_lore_text(self):
        self.assertIn("item.getRawLore().some(", SCRIPT)
        self.assertIn("getLoreEntryText(entry) === ENDERSTEEL_MARKER", SCRIPT)

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


class PackArchiveTests(unittest.TestCase):
    def test_builder_creates_minimal_valid_mcpack(self):
        import subprocess
        import sys
        import zipfile
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as temporary:
            output = Path(temporary) / "InnygrEnchantments.mcpack"
            subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "tools" / "package_pack.py"),
                    "--output",
                    str(output),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(
                    set(archive.namelist()),
                    {"manifest.json", "scripts/main.js"},
                )
                self.assertEqual(
                    archive.read("manifest.json"),
                    (ROOT / "manifest.json").read_bytes(),
                )
                self.assertEqual(
                    archive.read("scripts/main.js"),
                    (ROOT / "scripts" / "main.js").read_bytes(),
                )
                self.assertEqual(archive.testzip(), None)

            checksum_path = Path(str(output) + ".sha256")
            checksum, filename = checksum_path.read_text(encoding="utf-8").split()
            import hashlib
            self.assertEqual(filename, output.name)
            self.assertEqual(checksum, hashlib.sha256(output.read_bytes()).hexdigest())
            self.assertFalse(Path(str(output) + ".tmp").exists())
            self.assertFalse(Path(str(checksum_path) + ".tmp").exists())

    def test_builder_output_is_reproducible(self):
        import hashlib
        import subprocess
        import sys
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as temporary:
            outputs = [Path(temporary) / f"build-{index}.mcpack" for index in range(2)]
            for output in outputs:
                subprocess.run(
                    [
                        sys.executable,
                        str(ROOT / "tools" / "package_pack.py"),
                        "--output",
                        str(output),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            digests = [
                hashlib.sha256(output.read_bytes()).hexdigest()
                for output in outputs
            ]
            self.assertEqual(digests[0], digests[1])


class PackOutputSafetyTests(unittest.TestCase):
    def test_builder_refuses_to_overwrite_other_repository_files(self):
        import subprocess
        import sys

        readme_path = ROOT / "README.md"
        original_readme = readme_path.read_bytes()
        checksum_path = Path(str(readme_path) + ".sha256")
        original_checksum = checksum_path.read_bytes() if checksum_path.exists() else None

        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools" / "package_pack.py"),
                "--output",
                str(readme_path),
            ],
            capture_output=True,
            text=True,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be under dist/", result.stderr)
        self.assertEqual(readme_path.read_bytes(), original_readme)
        if original_checksum is None:
            self.assertFalse(checksum_path.exists())
        else:
            self.assertEqual(checksum_path.read_bytes(), original_checksum)


    def test_builder_refuses_to_overwrite_pack_sources(self):
        import subprocess
        import sys

        manifest_path = ROOT / "manifest.json"
        original_manifest = manifest_path.read_bytes()
        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools" / "package_pack.py"),
                "--output",
                str(manifest_path),
            ],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be under dist/", result.stderr)
        self.assertEqual(manifest_path.read_bytes(), original_manifest)

        version_path = ROOT / "VERSION"
        original_version = version_path.read_bytes()
        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools" / "package_pack.py"),
                "--output",
                str(version_path),
            ],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be under dist/", result.stderr)
        self.assertEqual(version_path.read_bytes(), original_version)

        script_path = ROOT / "scripts" / "main.js"
        original_script = script_path.read_bytes()
        result = subprocess.run(
            [
                sys.executable,
                str(ROOT / "tools" / "package_pack.py"),
                "--output",
                str(script_path),
            ],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be under dist/", result.stderr)
        self.assertEqual(script_path.read_bytes(), original_script)
