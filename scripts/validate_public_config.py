#!/usr/bin/env python3
"""Validate that public plugin sources remain endpoint-neutral and configurable."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ID = "gitlab-self-hosted"
PLUGIN = ROOT / "plugins" / PLUGIN_ID
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
REMOTE_EXAMPLE = PLUGIN / "workspace-binding" / ".mcp.remote.json.example"
LOCAL_EXAMPLE = PLUGIN / "workspace-binding" / ".mcp.local.json.example"

PUBLIC_SETUP_FILES = [
    ROOT / "README.md",
    ROOT / "README.zh-TW.md",
    ROOT / "CHANGELOG.md",
    ROOT / "docs" / "chatgpt-app.md",
    ROOT / "docs" / "chatgpt-app.zh-TW.md",
    ROOT / "docs" / "capability-matrix.md",
    ROOT / "docs" / "capability-matrix.zh-TW.md",
    ROOT / "docs" / "roadmap.md",
    ROOT / "docs" / "roadmap.zh-TW.md",
    PLUGIN / "README.md",
    PLUGIN / "README.zh-TW.md",
    PLUGIN / "skills" / "gitlab-setup" / "SKILL.md",
    MANIFEST,
    MARKETPLACE,
    REMOTE_EXAMPLE,
]

URL_RE = re.compile(r"https://[^\s`\])>\"']+/mcp(?:\b|$)")
ALLOWED_PUBLIC_MCP_HOSTS = {
    "gitlab-mcp.example.com",
    "mcp.gitlab.com",
}
EXPECTED_REMOTE_EXAMPLE = "https://gitlab-mcp.example.com/mcp"
EXPECTED_LOCAL_FALLBACK = "http://127.0.0.1:3333/mcp"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"unable to read {path.relative_to(ROOT)}: {exc}")


def validate_source_is_endpoint_neutral() -> None:
    manifest = load_json(MANIFEST)
    if "mcpServers" in manifest or "apps" in manifest:
        fail("public source plugin must not embed an MCP/App binding")
    if (PLUGIN / ".mcp.json").exists() or (PLUGIN / ".app.json").exists():
        fail("public source plugin must not ship an automatically loaded MCP/App binding")

    marketplace = load_json(MARKETPLACE)
    entry = next(
        (item for item in marketplace.get("plugins", []) if item.get("name") == PLUGIN_ID),
        None,
    )
    if not entry:
        fail("root marketplace must publish gitlab-self-hosted")
    if entry.get("policy", {}).get("authentication") != "ON_USE":
        fail("root marketplace must defer authentication until use/setup")


def validate_examples() -> None:
    remote = load_json(REMOTE_EXAMPLE).get("mcpServers", {}).get("gitlab", {})
    if remote.get("url") != EXPECTED_REMOTE_EXAMPLE:
        fail("remote MCP example must use the neutral example.com endpoint")

    local = load_json(LOCAL_EXAMPLE).get("mcpServers", {}).get("gitlab", {})
    if local.get("url") != EXPECTED_LOCAL_FALLBACK:
        fail("localhost fallback changed unexpectedly")


def validate_no_operator_endpoint_leaks() -> None:
    for path in PUBLIC_SETUP_FILES:
        if not path.is_file():
            fail(f"missing public setup file: {path.relative_to(ROOT)}")
        text = path.read_text(encoding="utf-8")
        for raw_url in URL_RE.findall(text):
            parsed = urlparse(raw_url.rstrip(".,;:"))
            if parsed.hostname not in ALLOWED_PUBLIC_MCP_HOSTS:
                fail(
                    "public setup content contains a non-portable MCP endpoint in "
                    f"{path.relative_to(ROOT)}: {raw_url}"
                )


def validate_documented_binding_paths() -> None:
    english = (ROOT / "README.md").read_text(encoding="utf-8")
    chinese = (ROOT / "README.zh-TW.md").read_text(encoding="utf-8")
    setup = (PLUGIN / "skills" / "gitlab-setup" / "SKILL.md").read_text(encoding="utf-8")

    for needle in (
        "registered MCP App",
        "plugin_asdk_app_",
        "build_chatgpt_app.py",
        "remote HTTPS",
        "localhost",
    ):
        if needle not in english:
            fail(f"README.md must document {needle!r}")
    for needle in (
        "Registered MCP App",
        "plugin_asdk_app_",
        "build_chatgpt_app.py",
        "remote HTTPS",
        "localhost",
    ):
        if needle not in chinese:
            fail(f"README.zh-TW.md must document {needle!r}")
    for needle in (
        "maintainer-specific",
        "endpoint-neutral",
        "plugin_asdk_app_",
        "build_chatgpt_app.py",
        "localhost",
    ):
        if needle not in setup:
            fail(f"setup skill must document {needle!r}")


def main() -> None:
    validate_source_is_endpoint_neutral()
    validate_examples()
    validate_no_operator_endpoint_leaks()
    validate_documented_binding_paths()
    print("Public plugin configuration validation passed.")


if __name__ == "__main__":
    main()
