#!/usr/bin/env python3
"""Build a ChatGPT app-bound GitLab plugin variant.

The source plugin remains portable and keeps the localhost MCP fallback for
Codex. This script builds a workspace-specific ChatGPT variant after the user or
workspace admin has explicitly created a Custom MCP App in ChatGPT.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from chatgpt_binding import BindingValidationError, validate_remote_mcp_url

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PLUGIN = ROOT / "plugins" / "gitlab"
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-chatgpt"
APP_TEMPLATE = SOURCE_PLUGIN / "app-template" / ".app.json.example"
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


def load_json(path: Path, description: str) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"unable to read {description}: {exc}")


def build(app_id: str, mcp_url: str, output: Path, force: bool) -> None:
    if not SOURCE_PLUGIN.is_dir():
        fail(f"source plugin not found: {SOURCE_PLUGIN}")
    if not APP_TEMPLATE.is_file():
        fail(f"ChatGPT app template not found: {APP_TEMPLATE}")

    try:
        mcp_url = validate_remote_mcp_url(mcp_url)
    except BindingValidationError as exc:
        fail(str(exc))

    output = ensure_safe_output(output)
    if output.exists():
        if not force:
            fail(f"output already exists: {output}; pass --force to replace it")
        shutil.rmtree(output)

    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE_PLUGIN, output)

    app_manifest = load_json(APP_TEMPLATE, "ChatGPT app binding template")
    gitlab_binding = app_manifest.get("apps", {}).get("gitlab")
    if not isinstance(gitlab_binding, dict) or gitlab_binding.get("id") != PLACEHOLDER:
        fail("ChatGPT app binding template does not contain the expected placeholder")
    gitlab_binding["id"] = app_id

    template_dir = output / "app-template"
    if template_dir.exists():
        shutil.rmtree(template_dir)

    (output / ".app.json").write_text(
        json.dumps(app_manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    manifest_path = output / ".codex-plugin" / "plugin.json"
    manifest = load_json(manifest_path, "plugin manifest")
    if manifest.get("name") != "gitlab":
        fail("source plugin manifest name must be 'gitlab'")
    manifest["apps"] = "./.app.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    # The App ID is the actual ChatGPT binding. This setup metadata documents
    # which remote endpoint that workspace App must be configured to use. It is
    # generated under ignored dist/ and never changes the portable source plugin.
    setup = {
        "profile": "chatgpt-remote-mcp",
        "mcp_url": mcp_url,
        "app_id": app_id,
        "requires_explicit_chatgpt_app_creation": True,
        "doctor_command": f"python3 scripts/chatgpt_mcp_doctor.py --mcp-url {mcp_url}",
    }
    (output / ".chatgpt-setup.json").write_text(
        json.dumps(setup, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Built ChatGPT-bound GitLab plugin: {output}")
    print(f"Remote MCP URL: {mcp_url}")
    print("The source plugin and localhost Codex MCP configuration were not modified.")
    print("The ChatGPT Custom MCP App must already exist in the target workspace.")
    print("Do not commit the generated workspace-specific output.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a GitLab plugin variant bound to a ChatGPT workspace Custom MCP App."
    )
    parser.add_argument(
        "--app-id",
        required=True,
        help="ChatGPT app/connector ID created in the target workspace",
    )
    parser.add_argument(
        "--mcp-url",
        required=True,
        help="public HTTPS MCP endpoint configured on that ChatGPT Custom MCP App",
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
    build(validate_app_id(args.app_id), args.mcp_url, args.output, args.force)


if __name__ == "__main__":
    main()
