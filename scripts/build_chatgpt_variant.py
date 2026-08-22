#!/usr/bin/env python3
"""Build a ChatGPT app-bound GitLab plugin variant.

The source plugin remains portable and MCP-backed. This script copies it to an
ignored output directory, adds a workspace-specific `.app.json`, and patches the
copied plugin manifest to reference that app binding.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PLUGIN = ROOT / "plugins" / "gitlab"
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-chatgpt"
PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"
APP_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]+$")


def fail(message: str) -> "NoReturn":
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate_app_id(value: str) -> str:
    app_id = value.strip()
    if not app_id or app_id == PLACEHOLDER:
        fail("provide a real ChatGPT workspace app/connector ID")
    if len(app_id) > 256:
        fail("app/connector ID is unexpectedly long")
    if not APP_ID_PATTERN.fullmatch(app_id):
        fail("app/connector ID contains unsupported characters")
    return app_id


def ensure_safe_output(output: Path) -> Path:
    resolved = output.expanduser().resolve()
    source = SOURCE_PLUGIN.resolve()
    if resolved == source or source in resolved.parents:
        fail("output must not be inside the source plugin directory")
    if resolved == ROOT.resolve():
        fail("output must not replace the repository root")
    return resolved


def load_manifest(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"unable to read plugin manifest: {exc}")
    if data.get("name") != "gitlab":
        fail("source plugin manifest name must be 'gitlab'")
    return data


def build(app_id: str, output: Path, force: bool) -> None:
    if not SOURCE_PLUGIN.is_dir():
        fail(f"source plugin not found: {SOURCE_PLUGIN}")

    output = ensure_safe_output(output)
    if output.exists():
        if not force:
            fail(f"output already exists: {output}; pass --force to replace it")
        shutil.rmtree(output)

    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE_PLUGIN, output)

    # The template exists only to document the portable source shape. A built
    # variant contains the actual binding and does not need the source template.
    template_dir = output / "app-template"
    if template_dir.exists():
        shutil.rmtree(template_dir)

    app_manifest = {
        "apps": {
            "gitlab": {
                "id": app_id,
            }
        }
    }
    (output / ".app.json").write_text(
        json.dumps(app_manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    manifest_path = output / ".codex-plugin" / "plugin.json"
    manifest = load_manifest(manifest_path)
    manifest["apps"] = "./.app.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Built ChatGPT-bound GitLab plugin: {output}")
    print("The source plugin was not modified.")
    print("Do not commit the generated workspace-specific output.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a GitLab plugin variant bound to a ChatGPT workspace app."
    )
    parser.add_argument(
        "--app-id",
        required=True,
        help="ChatGPT app/connector ID available in the target workspace",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="output directory (default: dist/gitlab-chatgpt)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace the output directory if it already exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build(validate_app_id(args.app_id), args.output, args.force)


if __name__ == "__main__":
    main()
