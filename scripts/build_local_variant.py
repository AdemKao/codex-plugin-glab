#!/usr/bin/env python3
"""Build an explicit localhost-bound GitLab plugin marketplace for development."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ID = "gitlab-self-hosted"
SOURCE_PLUGIN = ROOT / "plugins" / PLUGIN_ID
SOURCE_MCP = SOURCE_PLUGIN / ".mcp.json"
LOCAL_MCP_TEMPLATE = SOURCE_PLUGIN / "workspace-binding" / ".mcp.local.json.example"
DEFAULT_OUTPUT = ROOT / "dist" / "gitlab-local-marketplace"
GENERATED_MARKETPLACE_NAME = "ademkao-gitlab-local"
GENERATED_PLUGIN_RELATIVE = Path("plugins") / PLUGIN_ID
GENERATED_MARKETPLACE_RELATIVE = Path(".agents") / "plugins" / "marketplace.json"
DEFAULT_REMOTE_MCP_URL = "https://gitlab-mcp.blacmarcs.com/mcp"
LOCAL_MCP_URL = "http://127.0.0.1:3333/mcp"


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


def source_is_default_remote_bound() -> None:
    manifest = load_json(SOURCE_PLUGIN / ".codex-plugin" / "plugin.json", "plugin manifest")
    if manifest.get("name") != PLUGIN_ID:
        fail(f"source plugin manifest name must be '{PLUGIN_ID}'")
    if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
        fail("source plugin must use the direct default MCP binding")
    source_mcp = load_json(SOURCE_MCP, "source MCP binding")
    server = source_mcp.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict) or server.get("url") != DEFAULT_REMOTE_MCP_URL:
        fail("source plugin must point at the hosted default MCP endpoint")


def build(output: Path, force: bool) -> None:
    if not SOURCE_PLUGIN.is_dir():
        fail(f"source plugin not found: {SOURCE_PLUGIN}")
    if not LOCAL_MCP_TEMPLATE.is_file():
        fail(f"local MCP template not found: {LOCAL_MCP_TEMPLATE}")
    source_is_default_remote_bound()

    output = ensure_safe_output(output)
    if output.exists():
        if not force:
            fail(f"output already exists: {output}; pass --force to replace it")
        shutil.rmtree(output)

    generated_plugin = output / GENERATED_PLUGIN_RELATIVE
    generated_plugin.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE_PLUGIN, generated_plugin)

    local_mcp = load_json(LOCAL_MCP_TEMPLATE, "local MCP template")
    server = local_mcp.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict) or server.get("type") != "http" or server.get("url") != LOCAL_MCP_URL:
        fail("local MCP template must define the expected localhost endpoint")
    write_json(generated_plugin / ".mcp.json", local_mcp)

    helper_dir = generated_plugin / "workspace-binding"
    if helper_dir.exists():
        shutil.rmtree(helper_dir)

    setup = {
        "profile": "local-mcp",
        "artifact_type": "local-mcp-marketplace",
        "workspace_specific_source": True,
        "binding_mode": "local-mcp",
        "plugin_id": PLUGIN_ID,
        "mcp_url": LOCAL_MCP_URL,
        "marketplace_name": GENERATED_MARKETPLACE_NAME,
        "plugin_reference": f"{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}",
        "source_default_remote_bound": True,
        "endpoint_overridden_locally": True,
        "requires_local_mcp_server": True,
    }
    write_json(generated_plugin / ".chatgpt-setup.json", setup)

    marketplace = {
        "name": GENERATED_MARKETPLACE_NAME,
        "interface": {"displayName": "AdemKao GitLab Self-Hosted Local"},
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
    (output / "README.md").write_text(
        f"""# Generated GitLab Self-Hosted Local Marketplace

This development-only marketplace overrides the repository root plugin's hosted
MCP endpoint with `{LOCAL_MCP_URL}`.

- Marketplace: `{GENERATED_MARKETPLACE_NAME}`
- Plugin reference: `{PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}`
- Root/default endpoint: `{DEFAULT_REMOTE_MCP_URL}`
- Local override: `{LOCAL_MCP_URL}`

Use the repository root marketplace for normal ChatGPT/Codex installation. Use
this generated variant only when you intentionally run the MCP server on the
same development machine.
""",
        encoding="utf-8",
    )

    print(f"Built local GitLab Self-Hosted marketplace: {output}")
    print(f"Plugin reference: {PLUGIN_ID}@{GENERATED_MARKETPLACE_NAME}")
    print(f"MCP URL: {LOCAL_MCP_URL}")
    print(f"Root marketplace remains bound to: {DEFAULT_REMOTE_MCP_URL}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a localhost-bound GitLab Self-Hosted marketplace for development."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="marketplace-source output directory (default: dist/gitlab-local-marketplace)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace the output directory if it already exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build(args.output, args.force)


if __name__ == "__main__":
    main()
