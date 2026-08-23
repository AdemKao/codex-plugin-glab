#!/usr/bin/env python3
"""Regression validation for ChatGPT MCP connection-bound plugin generation."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts" / "build_chatgpt_variant.py"
PLUGIN_ID = "gitlab-self-hosted"
TEST_CONNECTION_ID = "test_chatgpt_connection_ci_123"
TEST_MCP_URL = "https://gitlab-mcp.example.com/mcp"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"unable to load {path}: {exc}")


def run_builder(flag: str, connection_id: str, output: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(BUILDER),
            flag,
            connection_id,
            "--mcp-url",
            TEST_MCP_URL,
            "--output",
            str(output),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def validate_preferred_flag() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-chatgpt-binding-") as temp:
        output = Path(temp) / "marketplace"
        run = run_builder("--connection-id", TEST_CONNECTION_ID, output)
        if run.returncode != 0:
            fail(f"--connection-id generation failed: {run.stderr.strip()}")

        plugin = output / "plugins" / PLUGIN_ID
        manifest = load(plugin / ".codex-plugin" / "plugin.json")
        app = load(plugin / ".app.json")
        setup = load(plugin / ".chatgpt-setup.json")

        if manifest.get("apps") != "./.app.json" or "mcpServers" in manifest:
            fail("generated ChatGPT plugin must be App/connection-bound only")
        if (plugin / ".mcp.json").exists():
            fail("generated ChatGPT plugin must not contain .mcp.json")
        if app.get("apps", {}).get(PLUGIN_ID, {}).get("id") != TEST_CONNECTION_ID:
            fail("generated .app.json does not contain the MCP connection technical ID")
        if setup.get("connection_id") != TEST_CONNECTION_ID:
            fail("generated setup metadata must record connection_id")
        if setup.get("app_id") != TEST_CONNECTION_ID:
            fail("generated setup metadata must retain the app_id compatibility field")
        if setup.get("requires_existing_mcp_connection") is not True:
            fail("generated setup must require an existing MCP connection")
        if setup.get("requires_mcp_connection_technical_id") is not True:
            fail("generated setup must require the MCP connection technical ID")
        if setup.get("does_not_create_mcp_connection") is not True:
            fail("generated setup must record that it does not create the MCP connection")
        if setup.get("does_not_run_oauth") is not True:
            fail("generated setup must record that it does not run OAuth")
        if setup.get("requires_explicit_chatgpt_app_creation") is not False:
            fail("generated setup must not claim the helper creates a ChatGPT App")


def validate_legacy_alias() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-chatgpt-alias-") as temp:
        output = Path(temp) / "marketplace"
        run = run_builder("--app-id", "legacy_alias_ci_123", output)
        if run.returncode != 0:
            fail(f"legacy --app-id alias failed: {run.stderr.strip()}")
        app = load(output / "plugins" / PLUGIN_ID / ".app.json")
        if app.get("apps", {}).get(PLUGIN_ID, {}).get("id") != "legacy_alias_ci_123":
            fail("legacy --app-id alias generated the wrong binding")


def main() -> None:
    validate_preferred_flag()
    validate_legacy_alias()
    print("ChatGPT MCP connection binding validation passed")


if __name__ == "__main__":
    main()
