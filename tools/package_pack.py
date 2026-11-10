#!/usr/bin/env python3
"""Build a deterministic, versioned, server-side-only Bedrock .mcpack archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "VERSION"
PACK_FILES = (Path("manifest.json"), Path("scripts/main.js"))
FIXED_TIMESTAMP = (2020, 1, 1, 0, 0, 0)
VERSION_PATTERN = re.compile(
    r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$"
)


def read_project_version() -> tuple[str, tuple[int, int, int, int]]:
    """Read and validate the four-part project version."""
    version = VERSION_FILE.read_text(encoding="utf-8").strip()
    match = VERSION_PATTERN.fullmatch(version)
    if not match:
        raise ValueError(
            "VERSION must use vMAJOR.MINOR.PATCH.BUILD, for example v0.1.5.3."
        )
    return version, tuple(int(part) for part in match.groups())


def default_output_path() -> Path:
    """Return the versioned default package destination."""
    version, _ = read_project_version()
    return ROOT / "dist" / f"InnygrEnchantments-{version}.mcpack"


def build_pack(output_path: Path) -> Path:
    """Validate pack inputs, write a reproducible archive, and create its checksum."""
    version, version_parts = read_project_version()
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    modules = manifest.get("modules", [])
    if len(modules) != 1 or modules[0].get("type") != "script":
        raise ValueError("Expected exactly one server script module.")
    if modules[0].get("language") != "javascript":
        raise ValueError("The server script module must use JavaScript.")
    if modules[0].get("entry") != "scripts/main.js":
        raise ValueError("The script entry point must be scripts/main.js.")
    if not (ROOT / "scripts/main.js").is_file():
        raise FileNotFoundError("Missing scripts/main.js.")

    expected_manifest_version = list(version_parts[:3])
    if manifest.get("header", {}).get("version") != expected_manifest_version:
        raise ValueError(
            "manifest header version must match the first three components of VERSION."
        )
    if modules[0].get("version") != expected_manifest_version:
        raise ValueError(
            "manifest script-module version must match the first three components of VERSION."
        )

    output_path = output_path.resolve()
    checksum_path = output_path.with_name(output_path.name + ".sha256")
    repository_root = ROOT.resolve()
    generated_root = (ROOT / "dist").resolve()

    # A caller-supplied --output can be anywhere outside the repository, or
    # under dist/. Reject every other in-repository path, not only the pack
    # source files, so a typo cannot overwrite documentation or tests.
    for candidate in (output_path, checksum_path.resolve()):
        try:
            candidate.relative_to(repository_root)
            is_inside_repository = True
        except ValueError:
            is_inside_repository = False

        if is_inside_repository:
            try:
                candidate.relative_to(generated_root)
                is_generated_output = True
            except ValueError:
                is_generated_output = False

            if not is_generated_output:
                raise ValueError(
                    "Output and checksum paths inside the repository must be under dist/."
                )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_name(output_path.name + ".tmp")
    checksum_temporary_path = checksum_path.with_name(checksum_path.name + ".tmp")
    try:
        with ZipFile(temporary_path, "w") as archive:
            for relative_path in PACK_FILES:
                info = ZipInfo(relative_path.as_posix(), date_time=FIXED_TIMESTAMP)
                info.compress_type = ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(
                    info, (ROOT / relative_path).read_bytes(), compress_type=ZIP_DEFLATED
                )
        temporary_path.replace(output_path)

        digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
        checksum_temporary_path.write_text(
            f"{digest}  {output_path.name}\n", encoding="utf-8"
        )
        checksum_temporary_path.replace(checksum_path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        checksum_temporary_path.unlink(missing_ok=True)
        raise

    print(f"Built {version}: {output_path} ({output_path.stat().st_size} bytes)")
    print(f"SHA-256: {digest}")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output archive path (default: dist/InnygrEnchantments-<VERSION>.mcpack).",
    )
    args = parser.parse_args()
    build_pack(args.output if args.output is not None else default_output_path())


if __name__ == "__main__":
    main()
