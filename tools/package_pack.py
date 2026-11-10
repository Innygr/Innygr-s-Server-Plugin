#!/usr/bin/env python3
"""Build a deterministic, server-side-only Bedrock .mcpack archive."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
PACK_FILES = (Path("manifest.json"), Path("scripts/main.js"))
FIXED_TIMESTAMP = (2020, 1, 1, 0, 0, 0)


def build_pack(output_path: Path) -> Path:
    """Validate the pack inputs and write a reproducible .mcpack archive."""
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    modules = manifest.get("modules", [])
    if len(modules) != 1 or modules[0].get("type") != "script":
        raise ValueError("Expected exactly one server script module.")
    if modules[0].get("entry") != "scripts/main.js":
        raise ValueError("The script entry point must be scripts/main.js.")
    if not (ROOT / "scripts/main.js").is_file():
        raise FileNotFoundError("Missing scripts/main.js.")

    output_path = output_path.resolve()
    protected_paths = {(ROOT / relative_path).resolve() for relative_path in PACK_FILES}
    if output_path in protected_paths:
        raise ValueError("Output path must not overwrite a pack source file.")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output_path, "w") as archive:
        for relative_path in PACK_FILES:
            info = ZipInfo(relative_path.as_posix(), date_time=FIXED_TIMESTAMP)
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(
                info, (ROOT / relative_path).read_bytes(), compress_type=ZIP_DEFLATED
            )
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "dist" / "InnygrEnchantments.mcpack",
        help="Output archive path (default: dist/InnygrEnchantments.mcpack).",
    )
    output = build_pack(parser.parse_args().output)
    print(f"Built {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
