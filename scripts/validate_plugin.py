#!/usr/bin/env python3
"""Lightweight repository validation for codex-plugin-glab."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "gitlab"
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MCP = PLUGIN / ".mcp.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"

REQUIRED_DOC_PAIRS = [
    (ROOT / "README.md", ROOT / "README.zh-TW.md"),
    (ROOT / "CONTRIBUTING.md", ROOT / "CONTRIBUTING.zh-TW.md"),
    (ROOT / "docs" / "architecture.md", ROOT / "docs" / "architecture.zh-TW.md"),
    (ROOT / "docs" / "authentication.md", ROOT / "docs" / "authentication.zh-TW.md"),
    (ROOT / "docs" / "self-managed.md", ROOT / "docs" / "self-managed.zh-TW.md"),
    (ROOT / "docs" / "roadmap.md", ROOT / "docs" / "roadmap.zh-TW.md"),
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    if not path.is_file():
        fail(f"missing {path.relative_to(ROOT)}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")


def validate_manifest() -> None:
    data = load_json(MANIFEST)
    if data.get("name") != "gitlab":
        fail("plugin name must be 'gitlab'")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(data.get("version", ""))):
        fail("plugin version must be strict semver X.Y.Z")
    if not data.get("description"):
        fail("plugin description is required")
    if not data.get("author", {}).get("name"):
        fail("author.name is required")
    if data.get("skills") != "./skills/":
        fail("skills path must be ./skills/")
    if data.get("mcpServers") != "./.mcp.json":
        fail("mcpServers must point to ./.mcp.json")

    interface = data.get("interface") or {}
    for key in (
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "defaultPrompt",
        "brandColor",
    ):
        if key not in interface or interface[key] in (None, "", []):
            fail(f"interface.{key} is required")

    prompts = interface["defaultPrompt"]
    if not isinstance(prompts, list) or len(prompts) > 3:
        fail("interface.defaultPrompt must be a list with at most 3 entries")
    if any(len(str(prompt)) > 128 for prompt in prompts):
        fail("interface.defaultPrompt entries must be <= 128 characters")

    for key in ("websiteURL", "privacyPolicyURL", "termsOfServiceURL"):
        value = interface.get(key)
        if value and not str(value).startswith("https://"):
            fail(f"interface.{key} must use https://")


def validate_mcp() -> None:
    data = load_json(MCP)
    server = data.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict):
        fail(".mcp.json must define mcpServers.gitlab")
    if server.get("type") != "http":
        fail("default GitLab MCP transport must be http")
    if server.get("url") != "https://gitlab.com/api/v4/mcp":
        fail("default GitLab MCP URL must be https://gitlab.com/api/v4/mcp")


def validate_marketplace() -> None:
    data = load_json(MARKETPLACE)
    plugins = data.get("plugins")
    if not isinstance(plugins, list):
        fail("marketplace plugins must be a list")
    entry = next((item for item in plugins if item.get("name") == "gitlab"), None)
    if not entry:
        fail("marketplace must include gitlab")
    if entry.get("source", {}).get("path") != "./plugins/gitlab":
        fail("gitlab marketplace path must be ./plugins/gitlab")
    policy = entry.get("policy", {})
    if policy.get("installation") != "AVAILABLE":
        fail("marketplace installation policy must be AVAILABLE")
    if policy.get("authentication") not in {"ON_INSTALL", "ON_USE"}:
        fail("marketplace authentication policy is invalid")


def validate_skills() -> None:
    skills_dir = PLUGIN / "skills"
    skill_files = sorted(skills_dir.glob("*/SKILL.md"))
    if len(skill_files) < 4:
        fail("expected at least four GitLab workflow skills")
    for path in skill_files:
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            fail(f"missing YAML frontmatter in {path.relative_to(ROOT)}")
        if "\nname:" not in text or "\ndescription:" not in text:
            fail(f"skill frontmatter missing name/description in {path.relative_to(ROOT)}")


def validate_docs() -> None:
    for english, zh_tw in REQUIRED_DOC_PAIRS:
        if not english.is_file():
            fail(f"missing English doc: {english.relative_to(ROOT)}")
        if not zh_tw.is_file():
            fail(f"missing Traditional Chinese doc: {zh_tw.relative_to(ROOT)}")

    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".md", ".json", ".py", ".yml", ".yaml"}:
            text = path.read_text(encoding="utf-8", errors="replace")
            if "[TODO:" in text:
                fail(f"leftover scaffold TODO in {path.relative_to(ROOT)}")


def main() -> None:
    validate_manifest()
    validate_mcp()
    validate_marketplace()
    validate_skills()
    validate_docs()
    print("codex-plugin-glab validation passed")


if __name__ == "__main__":
    main()
