#!/usr/bin/env python3
"""Build an optional GitLab marketplace that overrides the default remote MCP URL."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from chatgpt_binding import BindingValidationError, validate_remote_mcp_url

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ID = "gitlab-self-hosted"
SOURCE_PLUGIN = ROOT / "plugins" / PLUGIN_ID
SOURCE_MCP = SOURCE_PLUGIN / ".mcp.json"
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-remote-marketplace"
GENERATED_MARKETPLACE_NAME = "ademkao-gitlab-remote"
GENERATED_PLUGIN_RELATIVE = Path("plugins") / PLUGIN_ID
GENERATED_MARKETPLACE_RELATIVE = Path(".agents") / "plugins" / "marketplace.json"
DEFAULT_REMOTE_MCP_URL = "https://gitlab-mcp.blacmarcs.com/mcp"


def fail(message: str) -> "NoReturn":
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


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


def source_is_default_remote_bound() -> dict:
    manifest = load_json(SOURCE_PLUGIN / ".codex-plugin" / "plugin.json", "plugin manifest")
    if manifest.get("name") != PLUGIN_ID:
        fail(f"source plugin manifest name must be '{PLUGIN_ID}'")
    if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
        fail("source plugin must use the direct default MCP binding")
    source_mcp = load_json(SOURCE_MCP, "source MCP binding")
    server = source_mcp.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict) or server.get("type") != "http" or server.get("url") != DEFAULT_REMOTE_MCP_URL:
        fail("source plugin must point at the hosted default MCP endpoint")
    return source_mcp


def generated_readme(mcp_url: str) -> str:
    return f"""# Generated GitLab Self-Hosted Custom Remote Marketplace

The repository root marketplace already connects directly to
`{DEFAULT_REMOTE_MCP_URL}` and requires no generated variant for normal use.

This optional artifact was generated only to override that hosted default with a
different validated public HTTPS MCP endpoint.

- Marketplace: `{GENERATED_MARKETPLACE_NAME}`
- Plugin reference: `{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}`
- Custom remote MCP endpoint: `{mcp_url}`

The client performs the server's normal OAuth discovery and GitLab authorization
flow. No ChatGPT App/connector ID is required for this direct-MCP variant.
"""


def build(mcp_url: str, output: Path, force: bool) -> None:
    if not SOURCE_PLUGIN.is_dir():
        fail(f"source plugin not found: {SOURCE_PLUGIN}")
    source_mcp = source_is_default_remote_bound()

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

    server = source_mcp.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict):
        fail("source MCP binding must define mcpServers.gitlab")
    server["url"] = mcp_url
    write_json(generated_plugin / ".mcp.json", source_mcp)

    helper_dir = generated_plugin / "workspace-binding"
    if helper_dir.exists():
        shutil.rmtree(helper_dir)

    setup = {
        "profile": "custom-remote-mcp",
        "artifact_type": "remote-mcp-marketplace",
        "workspace_specific_source": True,
        "binding_mode": "remote-mcp",
        "plugin_id": PLUGIN_ID,
        "mcp_url": mcp_url,
        "marketplace_name": GENERATED_MARKETPLACE_NAME,
        "plugin_reference": f"{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}",
        "requires_chatgpt_app_binding": False,
        "requires_explicit_oauth": True,
        "source_default_remote_bound": True,
        "endpoint_overridden_explicitly": True,
        "doctor_command": f"python3 scripts/chatgpt_mcp_doctor.py --mcp-url {mcp_url}",
    }
    write_json(generated_plugin / ".chatgpt-setup.json", setup)

    marketplace = {
        "name": GENERATED_MARKETPLACE_NAME,
        "interface": {"displayName": "AdemKao GitLab Self-Hosted Remote Override"},
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
    (output / "README.md").write_text(generated_readme(mcp_url), encoding="utf-8")

    print(f"Built custom remote GitLab Self-Hosted marketplace: {output}")
    print(f"Plugin reference: {PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}")
    print(f"Remote MCP URL: {mcp_url}")
    print(f"Normal root installs already use: {DEFAULT_REMOTE_MCP_URL}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build an optional GitLab marketplace with a custom remote HTTPS MCP endpoint."
    )
    parser.add_argument("--mcp-url", required=True, help="public HTTPS /mcp endpoint")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="marketplace-source output directory (default: dist/gitlab-remote-marketplace)",
    )
    parser.add_argument("--force", action="store_true", help="replace output if it already exists")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build(args.mcp_url, args.output, args.force)


if __name__ == "__main__":
    main()
