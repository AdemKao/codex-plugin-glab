#!/usr/bin/env python3
"""Build an optional workspace-bound GitLab plugin variant.

This repository helper binds an already-created ChatGPT workspace app/connector
ID into a copied plugin variant. It is not an OpenAI managed App Template and it
is not required for the primary personal/Codex remote-MCP setup path.

The portable source plugin remains unchanged and keeps the localhost MCP fallback
for local Codex use.
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
WORKSPACE_BINDING_TEMPLATE = SOURCE_PLUGIN / "workspace-binding" / ".app.json.example"
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
    if not WORKSPACE_BINDING_TEMPLATE.is_file():
        fail(f"workspace binding helper template not found: {WORKSPACE_BINDING_TEMPLATE}")

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

    app_manifest = load_json(WORKSPACE_BINDING_TEMPLATE, "workspace binding helper template")
    gitlab_binding = app_manifest.get("apps", {}).get("gitlab")
    if not isinstance(gitlab_binding, dict) or gitlab_binding.get("id") != PLACEHOLDER:
        fail("workspace binding helper template does not contain the expected placeholder")
    gitlab_binding["id"] = app_id

    helper_dir = output / "workspace-binding"
    if helper_dir.exists():
        shutil.rmtree(helper_dir)

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

    # This metadata describes a repository-local helper output. It does not turn
    # this repository into an OpenAI managed App Template and does not replace the
    # platform's own workspace app/template setup and governance flows.
    setup = {
        "profile": "workspace-binding-helper",
        "mcp_url": mcp_url,
        "app_id": app_id,
        "workspace_binding_helper_only": True,
        "not_openai_managed_app_template": True,
        "requires_existing_workspace_app_or_connector": True,
        "requires_explicit_chatgpt_app_creation": True,
        "doctor_command": f"python3 scripts/chatgpt_mcp_doctor.py --mcp-url {mcp_url}",
    }
    (output / ".chatgpt-setup.json").write_text(
        json.dumps(setup, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Built workspace-bound GitLab plugin helper output: {output}")
    print(f"Remote MCP URL: {mcp_url}")
    print("The source plugin and localhost Codex MCP configuration were not modified.")
    print("The target workspace app/connector must already exist.")
    print("This helper is not an OpenAI managed App Template.")
    print("Do not commit the generated workspace-specific output.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build an optional GitLab plugin variant bound to an existing ChatGPT "
            "workspace app/connector. This is a workspace binding helper, not an "
            "OpenAI managed App Template."
        )
    )
    parser.add_argument(
        "--app-id",
        required=True,
        help="existing ChatGPT workspace app/connector ID",
    )
    parser.add_argument(
        "--mcp-url",
        required=True,
        help="remote HTTPS /mcp endpoint associated with that app/connector",
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
