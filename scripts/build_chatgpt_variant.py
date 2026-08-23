#!/usr/bin/env python3
"""Build an installable workspace-bound GitLab ChatGPT marketplace artifact.

This repository helper binds an already-created ChatGPT workspace app/connector
ID into a copied plugin variant. It is not an OpenAI managed App Template.

The portable source plugin remains unchanged and keeps the localhost MCP fallback
for local Codex use. The generated ChatGPT marketplace contains an App-bound
plugin copy with the localhost MCP dependency removed.
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
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-chatgpt-marketplace"
WORKSPACE_BINDING_TEMPLATE = SOURCE_PLUGIN / "workspace-binding" / ".app.json.example"
PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"
APP_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]+$")
GENERATED_MARKETPLACE_NAME = "ademkao-gitlab-chatgpt"
GENERATED_PLUGIN_RELATIVE = Path("plugins") / "gitlab"
GENERATED_MARKETPLACE_RELATIVE = Path(".agents") / "plugins" / "marketplace.json"


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


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


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

    generated_plugin = output / GENERATED_PLUGIN_RELATIVE
    generated_plugin.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE_PLUGIN, generated_plugin)

    app_manifest = load_json(WORKSPACE_BINDING_TEMPLATE, "workspace binding helper template")
    gitlab_binding = app_manifest.get("apps", {}).get("gitlab")
    if not isinstance(gitlab_binding, dict) or gitlab_binding.get("id") != PLACEHOLDER:
        fail("workspace binding helper template does not contain the expected placeholder")
    gitlab_binding["id"] = app_id

    helper_dir = generated_plugin / "workspace-binding"
    if helper_dir.exists():
        shutil.rmtree(helper_dir)

    write_json(generated_plugin / ".app.json", app_manifest)

    manifest_path = generated_plugin / ".codex-plugin" / "plugin.json"
    manifest = load_json(manifest_path, "plugin manifest")
    if manifest.get("name") != "gitlab":
        fail("source plugin manifest name must be 'gitlab'")
    manifest["apps"] = "./.app.json"
    # A ChatGPT-bound plugin must not keep the portable source plugin's localhost
    # MCP dependency. A separately-added remote MCP server is not an implicit
    # replacement for that dependency; the generated variant uses the connected
    # App/connector as its tool binding instead.
    manifest.pop("mcpServers", None)
    write_json(manifest_path, manifest)

    generated_mcp = generated_plugin / ".mcp.json"
    if generated_mcp.exists():
        generated_mcp.unlink()

    setup = {
        "profile": "workspace-binding-helper",
        "artifact_type": "chatgpt-marketplace",
        "binding_mode": "app",
        "mcp_url": mcp_url,
        "app_id": app_id,
        "marketplace_name": GENERATED_MARKETPLACE_NAME,
        "plugin_reference": f"gitlab@{GENERATED_MARKETPLACE_NAME}",
        "workspace_binding_helper_only": True,
        "not_openai_managed_app_template": True,
        "requires_existing_workspace_app_or_connector": True,
        "requires_explicit_chatgpt_app_creation": True,
        "source_local_mcp_removed": True,
        "doctor_command": f"python3 scripts/chatgpt_mcp_doctor.py --mcp-url {mcp_url}",
    }
    write_json(generated_plugin / ".chatgpt-setup.json", setup)

    marketplace = {
        "name": GENERATED_MARKETPLACE_NAME,
        "interface": {"displayName": "AdemKao GitLab ChatGPT"},
        "plugins": [
            {
                "name": "gitlab",
                "source": {"source": "local", "path": "./plugins/gitlab"},
                "policy": {
                    "installation": "AVAILABLE",
                    "authentication": "ON_INSTALL",
                },
                "category": "Developer Tools",
            }
        ],
    }
    write_json(output / GENERATED_MARKETPLACE_RELATIVE, marketplace)

    print(f"Built ChatGPT GitLab marketplace artifact: {output}")
    print(f"Plugin reference: gitlab@{GENERATED_MARKETPLACE_NAME}")
    print(f"Remote MCP URL: {mcp_url}")
    print("The portable repository marketplace and localhost Codex MCP configuration were not modified.")
    print("The generated marketplace selects an App-bound plugin with no packaged localhost MCP dependency.")
    print("The target workspace app/connector must already exist and point to the remote MCP server.")
    print("This helper is not an OpenAI managed App Template.")
    print("Do not commit the generated workspace-specific output to the public source repository.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build an installable GitLab ChatGPT marketplace artifact bound to an "
            "existing workspace app/connector. This is a workspace binding helper, "
            "not an OpenAI managed App Template."
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
        help="marketplace output directory (default: dist/gitlab-chatgpt-marketplace)",
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
