#!/usr/bin/env python3
"""Repository validation for codex-plugin-glab."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "gitlab"
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MCP = PLUGIN / ".mcp.json"
APP_TEMPLATE = PLUGIN / "app-template" / ".app.json.example"
BUILDER = ROOT / "scripts" / "build_chatgpt_variant.py"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
APP_PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"

REQUIRED_DOC_PAIRS = [
    (ROOT / "README.md", ROOT / "README.zh-TW.md"),
    (ROOT / "CONTRIBUTING.md", ROOT / "CONTRIBUTING.zh-TW.md"),
    (ROOT / "SUPPORT.md", ROOT / "SUPPORT.zh-TW.md"),
    (ROOT / "docs" / "README.md", ROOT / "docs" / "README.zh-TW.md"),
    (ROOT / "docs" / "architecture.md", ROOT / "docs" / "architecture.zh-TW.md"),
    (ROOT / "docs" / "authentication.md", ROOT / "docs" / "authentication.zh-TW.md"),
    (ROOT / "docs" / "self-managed.md", ROOT / "docs" / "self-managed.zh-TW.md"),
    (ROOT / "docs" / "chatgpt-app.md", ROOT / "docs" / "chatgpt-app.zh-TW.md"),
    (ROOT / "docs" / "capability-matrix.md", ROOT / "docs" / "capability-matrix.zh-TW.md"),
    (ROOT / "docs" / "roadmap.md", ROOT / "docs" / "roadmap.zh-TW.md"),
]

REQUIRED_COMMUNITY_FILES = [
    ROOT / "LICENSE",
    ROOT / "CHANGELOG.md",
    ROOT / "CODE_OF_CONDUCT.md",
    ROOT / "CONTRIBUTING.md",
    ROOT / "SECURITY.md",
    ROOT / "SUPPORT.md",
    ROOT / ".github" / "pull_request_template.md",
    ROOT / ".github" / "ISSUE_TEMPLATE" / "bug_report.yml",
    ROOT / ".github" / "ISSUE_TEMPLATE" / "feature_request.yml",
    ROOT / ".github" / "ISSUE_TEMPLATE" / "config.yml",
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


def load_json_external(path: Path) -> dict:
    if not path.is_file():
        fail(f"generated file missing: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid generated JSON in {path}: {exc}")


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
    if "apps" in data:
        fail("portable source manifest must not contain a workspace-specific apps binding")

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


def validate_app_template() -> None:
    template = load_json(APP_TEMPLATE)
    app_id = template.get("apps", {}).get("gitlab", {}).get("id")
    if app_id != APP_PLACEHOLDER:
        fail("app template must contain the documented GitLab app/connector placeholder")
    if not BUILDER.is_file():
        fail("missing scripts/build_chatgpt_variant.py")


def validate_generated_variant() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-") as temp_dir:
        output = Path(temp_dir) / "gitlab-chatgpt"
        result = subprocess.run(
            [
                sys.executable,
                str(BUILDER),
                "--app-id",
                "test_connector_ci_123",
                "--output",
                str(output),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            fail(f"ChatGPT variant builder failed: {result.stderr.strip()}")

        generated_app = load_json_external(output / ".app.json")
        generated_manifest = load_json_external(output / ".codex-plugin" / "plugin.json")
        if generated_app.get("apps", {}).get("gitlab", {}).get("id") != "test_connector_ci_123":
            fail("generated .app.json does not contain requested app ID")
        if generated_manifest.get("apps") != "./.app.json":
            fail("generated plugin manifest does not bind ./.app.json")
        if (output / "app-template").exists():
            fail("generated plugin should not include the source app-template directory")


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


def validate_community_files() -> None:
    for path in REQUIRED_COMMUNITY_FILES:
        if not path.is_file():
            fail(f"missing community file: {path.relative_to(ROOT)}")


def validate_docs() -> None:
    for english, zh_tw in REQUIRED_DOC_PAIRS:
        if not english.is_file():
            fail(f"missing English doc: {english.relative_to(ROOT)}")
        if not zh_tw.is_file():
            fail(f"missing Traditional Chinese doc: {zh_tw.relative_to(ROOT)}")

    scaffold_marker = "[" + "TODO:"
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".md", ".json", ".py", ".yml", ".yaml"}:
            text = path.read_text(encoding="utf-8", errors="replace")
            if scaffold_marker in text:
                fail(f"leftover scaffold placeholder in {path.relative_to(ROOT)}")


def main() -> None:
    validate_manifest()
    validate_mcp()
    validate_app_template()
    validate_generated_variant()
    validate_marketplace()
    validate_skills()
    validate_community_files()
    validate_docs()
    print("codex-plugin-glab validation passed")


if __name__ == "__main__":
    main()
