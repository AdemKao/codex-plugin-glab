#!/usr/bin/env python3
"""Build an optional ChatGPT marketplace bound to an existing MCP connection.

Normal repository-root installs use the direct hosted MCP binding. This helper is
retained for workspaces that explicitly want an App/connection-bound plugin
instead of the direct MCP binding.
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
PLUGIN_ID = "gitlab-self-hosted"
SOURCE_PLUGIN = ROOT / "plugins" / PLUGIN_ID
SOURCE_MCP = SOURCE_PLUGIN / ".mcp.json"
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-chatgpt-marketplace"
WORKSPACE_BINDING_TEMPLATE = SOURCE_PLUGIN / "workspace-binding" / ".app.json.example"
PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"
CONNECTION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]+$")
GENERATED_MARKETPLACE_NAME = "ademkao-gitlab-chatgpt"
GENERATED_PLUGIN_RELATIVE = Path("plugins") / PLUGIN_ID
GENERATED_MARKETPLACE_RELATIVE = Path(".agents") / "plugins" / "marketplace.json"
DEFAULT_REMOTE_MCP_URL = "https://gitlab-mcp.blacmarcs.com/mcp"


def fail(message: str) -> "NoReturn":
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate_connection_id(value: str) -> str:
    connection_id = value.strip()
    if not connection_id or connection_id == PLACEHOLDER:
        fail("provide the technical ID of an existing ChatGPT MCP App/connection")
    if len(connection_id) > 256:
        fail("ChatGPT MCP connection technical ID is unexpectedly long")
    if not CONNECTION_ID_PATTERN.fullmatch(connection_id):
        fail("ChatGPT MCP connection technical ID contains unsupported characters")
    return connection_id


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


def validate_source_binding() -> None:
    manifest = load_json(SOURCE_PLUGIN / ".codex-plugin" / "plugin.json", "plugin manifest")
    if manifest.get("name") != PLUGIN_ID:
        fail(f"source plugin manifest name must be '{PLUGIN_ID}'")
    if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
        fail("source plugin must use the direct hosted MCP binding")
    mcp = load_json(SOURCE_MCP, "source MCP binding")
    server = mcp.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict) or server.get("type") != "http" or server.get("url") != DEFAULT_REMOTE_MCP_URL:
        fail("source plugin must point at the hosted default MCP endpoint")


def generated_readme(connection_id: str, mcp_url: str) -> str:
    return f"""# Generated GitLab Self-Hosted ChatGPT Marketplace Source

Normal installs should use `{PLUGIN_ID}@ademkao-codex-plugins`, which directly
connects to `{DEFAULT_REMOTE_MCP_URL}` and performs OAuth without a generated
variant.

This optional artifact binds the plugin to one existing ChatGPT MCP
App/connection instead:

- Marketplace: `{GENERATED_MARKETPLACE_NAME}`
- Plugin reference: `{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}`
- Endpoint already configured on the connection: `{mcp_url}`
- Connection technical ID: `{connection_id}`

The generated plugin removes the source direct `mcpServers` binding and source
`.mcp.json`, then uses `apps: \"./.app.json\"`. This helper does not create the
connection, run OAuth, or modify an installed root plugin.
"""


def build(connection_id: str, mcp_url: str, output: Path, force: bool) -> None:
    if not SOURCE_PLUGIN.is_dir():
        fail(f"source plugin not found: {SOURCE_PLUGIN}")
    if not WORKSPACE_BINDING_TEMPLATE.is_file():
        fail(f"workspace binding helper template not found: {WORKSPACE_BINDING_TEMPLATE}")
    validate_source_binding()

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
    gitlab_binding = app_manifest.get("apps", {}).get(PLUGIN_ID)
    if not isinstance(gitlab_binding, dict) or gitlab_binding.get("id") != PLACEHOLDER:
        fail("workspace binding helper template does not contain the expected placeholder")
    gitlab_binding["id"] = connection_id

    helper_dir = generated_plugin / "workspace-binding"
    if helper_dir.exists():
        shutil.rmtree(helper_dir)
    write_json(generated_plugin / ".app.json", app_manifest)

    manifest_path = generated_plugin / ".codex-plugin" / "plugin.json"
    manifest = load_json(manifest_path, "generated plugin manifest")
    if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
        fail("copied source plugin must still contain only the direct MCP binding")
    manifest.pop("mcpServers", None)
    manifest["apps"] = "./.app.json"
    write_json(manifest_path, manifest)

    generated_mcp = generated_plugin / ".mcp.json"
    if generated_mcp.exists():
        generated_mcp.unlink()

    setup = {
        "profile": "chatgpt-mcp-connection-binding",
        "artifact_type": "chatgpt-marketplace",
        "workspace_specific_source": True,
        "binding_mode": "app",
        "plugin_id": PLUGIN_ID,
        "mcp_url": mcp_url,
        "connection_id": connection_id,
        "app_id": connection_id,
        "marketplace_name": GENERATED_MARKETPLACE_NAME,
        "plugin_reference": f"{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}",
        "workspace_binding_helper_only": True,
        "not_openai_managed_app_template": True,
        "requires_existing_workspace_app_or_connector": True,
        "requires_existing_mcp_connection": True,
        "requires_mcp_connection_technical_id": True,
        "requires_explicit_chatgpt_app_creation": False,
        "does_not_create_mcp_connection": True,
        "does_not_run_oauth": True,
        "requires_marketplace_import_or_install": True,
        "does_not_modify_existing_installation": True,
        "source_default_remote_bound": True,
        "source_direct_mcp_removed_for_app_binding": True,
        "endpoint_configured_on_app": True,
        "doctor_command": f"python3 scripts/chatgpt_mcp_doctor.py --mcp-url {mcp_url}",
    }
    write_json(generated_plugin / ".chatgpt-setup.json", setup)

    marketplace = {
        "name": GENERATED_MARKETPLACE_NAME,
        "interface": {"displayName": "AdemKao GitLab Self-Hosted ChatGPT"},
        "plugins": [
            {
                "name": PLUGIN_ID,
                "source": {"source": "local", "path": f"./plugins/{PLUGIN_ID}"},
                "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
                "category": "Developer Tools",
            }
        ],
    }
    write_json(output / GENERATED_MARKETPLACE_RELATIVE, marketplace)
    (output / "README.md").write_text(generated_readme(connection_id, mcp_url), encoding="utf-8")

    print(f"Built ChatGPT MCP-connection-bound marketplace source: {output}")
    print(f"Plugin reference: {PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}")
    print(f"Connection technical ID: {connection_id}")
    print(f"Endpoint expected on that connection: {mcp_url}")
    print(f"Normal root installs remain direct-bound to: {DEFAULT_REMOTE_MCP_URL}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build an optional GitLab ChatGPT marketplace bound to an existing MCP connection."
    )
    parser.add_argument(
        "--connection-id",
        "--app-id",
        dest="connection_id",
        required=True,
        help="technical ID of the existing ChatGPT MCP App/connection; --app-id is a legacy alias",
    )
    parser.add_argument(
        "--mcp-url",
        required=True,
        help="remote HTTPS /mcp endpoint already configured on that connection",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="marketplace-source output directory (default: dist/gitlab-chatgpt-marketplace)",
    )
    parser.add_argument("--force", action="store_true", help="replace output if it already exists")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build(validate_connection_id(args.connection_id), args.mcp_url, args.output, args.force)


if __name__ == "__main__":
    main()
