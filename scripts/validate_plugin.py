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
PLUGIN_ID = "gitlab-self-hosted"
PLUGIN = ROOT / "plugins" / PLUGIN_ID
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MCP = PLUGIN / ".mcp.json"
APP_TEMPLATE = PLUGIN / "workspace-binding" / ".app.json.example"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
BUILDER = ROOT / "scripts" / "build_chatgpt_variant.py"
MCP_PACKAGE = ROOT / "packages" / "mcp-server" / "package.json"
VERSION_FILE = ROOT / "VERSION"
PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"
GENERATED_MARKETPLACE = "ademkao-gitlab-chatgpt"
TEST_MCP_URL = "https://gitlab-mcp.example.com/mcp"

DOC_PAIRS = [
    ("README.md", "README.zh-TW.md"),
    ("docs/chatgpt-app.md", "docs/chatgpt-app.zh-TW.md"),
    ("docs/architecture.md", "docs/architecture.zh-TW.md"),
    ("docs/authentication.md", "docs/authentication.zh-TW.md"),
    ("docs/self-managed.md", "docs/self-managed.zh-TW.md"),
    ("docs/capability-matrix.md", "docs/capability-matrix.zh-TW.md"),
    ("docs/roadmap.md", "docs/roadmap.zh-TW.md"),
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path) -> dict:
    if not path.is_file():
        fail(f"missing {path.relative_to(ROOT)}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")


def version() -> str:
    value = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", value):
        fail("VERSION must be strict semver X.Y.Z")
    return value


def validate_source_package() -> None:
    if (ROOT / "plugins" / "gitlab").exists():
        fail("plugins/gitlab must not exist; the generic id collides with curated GitLab")

    manifest = load(MANIFEST)
    if PLUGIN.name != PLUGIN_ID or manifest.get("name") != PLUGIN_ID:
        fail("plugin folder and plugin.json.name must both be gitlab-self-hosted")
    if manifest.get("version") != version():
        fail("plugin version must match VERSION")
    if manifest.get("skills") != "./skills/" or manifest.get("mcpServers") != "./.mcp.json":
        fail("portable plugin must keep the standard skills and localhost MCP paths")
    if "apps" in manifest:
        fail("portable source plugin must not contain a workspace-specific apps binding")

    interface = manifest.get("interface", {})
    for key in ("displayName", "shortDescription", "longDescription", "developerName", "category", "capabilities", "defaultPrompt", "brandColor"):
        if interface.get(key) in (None, "", []):
            fail(f"interface.{key} is required")

    mcp = load(MCP).get("mcpServers", {}).get("gitlab", {})
    if mcp.get("type") != "http" or mcp.get("url") != "http://127.0.0.1:3333/mcp":
        fail("portable localhost MCP fallback changed unexpectedly")

    apps = load(APP_TEMPLATE).get("apps", {})
    if set(apps) != {PLUGIN_ID} or apps[PLUGIN_ID].get("id") != PLACEHOLDER:
        fail("workspace binding template must use the namespaced app key and placeholder")


def validate_marketplace() -> None:
    data = load(MARKETPLACE)
    plugins = data.get("plugins")
    if not isinstance(plugins, list):
        fail("marketplace plugins must be a list")
    if any(item.get("name") == "gitlab" for item in plugins):
        fail("root marketplace must not publish the generic gitlab id")
    entry = next((item for item in plugins if item.get("name") == PLUGIN_ID), None)
    if not entry:
        fail("root marketplace must publish gitlab-self-hosted")
    if entry.get("source", {}).get("path") != f"./plugins/{PLUGIN_ID}":
        fail("marketplace source path must match the plugin id/folder")
    if entry.get("policy", {}).get("installation") != "AVAILABLE":
        fail("marketplace installation policy must be AVAILABLE")
    if entry.get("policy", {}).get("authentication") not in {"ON_INSTALL", "ON_USE"}:
        fail("marketplace authentication policy is invalid")


def validate_release_metadata() -> None:
    expected = version()
    if load(MCP_PACKAGE).get("version") != expected:
        fail("MCP package version must match VERSION")
    server_text = (ROOT / "packages" / "mcp-server" / "src" / "server.ts").read_text(encoding="utf-8")
    if f'const VERSION = "{expected}";' not in server_text:
        fail("MCP runtime version must match VERSION")


def validate_generated_marketplace() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-") as temp:
        output = Path(temp) / "marketplace"
        run = subprocess.run(
            [sys.executable, str(BUILDER), "--app-id", "test_connector_ci_123", "--mcp-url", TEST_MCP_URL, "--output", str(output)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if run.returncode != 0:
            fail(f"ChatGPT marketplace builder failed: {run.stderr.strip()}")

        plugin = output / "plugins" / PLUGIN_ID
        generated_manifest = load(plugin / ".codex-plugin" / "plugin.json")
        generated_app = load(plugin / ".app.json")
        generated_setup = load(plugin / ".chatgpt-setup.json")
        generated_marketplace = load(output / ".agents" / "plugins" / "marketplace.json")

        entry = generated_marketplace.get("plugins", [{}])[0]
        expected_ref = f"{PLUGIN_ID}@{GENERATED_MARKETPLACE}"
        if generated_marketplace.get("name") != GENERATED_MARKETPLACE:
            fail("generated marketplace has the wrong catalog name")
        if entry.get("name") != PLUGIN_ID or entry.get("source", {}).get("path") != f"./plugins/{PLUGIN_ID}":
            fail("generated marketplace identity/path is not namespaced")
        if generated_manifest.get("name") != PLUGIN_ID or generated_manifest.get("apps") != "./.app.json":
            fail("generated plugin manifest has the wrong identity/App binding")
        if "mcpServers" in generated_manifest or (plugin / ".mcp.json").exists():
            fail("generated App-bound plugin must not retain localhost MCP binding")
        if generated_app.get("apps", {}).get(PLUGIN_ID, {}).get("id") != "test_connector_ci_123":
            fail("generated .app.json has the wrong app binding")
        if generated_setup.get("plugin_id") != PLUGIN_ID or generated_setup.get("plugin_reference") != expected_ref:
            fail("generated setup metadata has the wrong plugin identity/reference")
        for flag in ("requires_existing_workspace_app_or_connector", "requires_marketplace_import_or_install", "does_not_modify_existing_installation", "source_local_mcp_removed"):
            if generated_setup.get(flag) is not True:
                fail(f"generated setup must set {flag}=true")
        if (output / "plugins" / "gitlab").exists():
            fail("generated output must not recreate the generic gitlab package")

    for bad_url in (
        "http://gitlab-mcp.example.com/mcp",
        "https://localhost/mcp",
        "https://127.0.0.1/mcp",
        "https://10.0.0.8/mcp",
        "https://169.254.10.1/mcp",
        "https://gitlab-mcp.example.com/not-mcp",
    ):
        with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-reject-") as temp:
            run = subprocess.run(
                [sys.executable, str(BUILDER), "--app-id", "bad_ci", "--mcp-url", bad_url, "--output", str(Path(temp) / "out")],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            if run.returncode == 0:
                fail(f"builder accepted unsafe MCP URL: {bad_url}")


def validate_skills_and_docs() -> None:
    skill_files = sorted((PLUGIN / "skills").glob("*/SKILL.md"))
    if len(skill_files) < 4:
        fail("expected at least four GitLab workflow skills")
    for path in skill_files:
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n") or "\nname:" not in text or "\ndescription:" not in text:
            fail(f"invalid skill frontmatter in {path.relative_to(ROOT)}")
    for english, zh_tw in DOC_PAIRS:
        if not (ROOT / english).is_file() or not (ROOT / zh_tw).is_file():
            fail(f"missing bilingual documentation pair: {english} / {zh_tw}")
    for required in ("LICENSE", "CHANGELOG.md", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "SECURITY.md", "SUPPORT.md"):
        if not (ROOT / required).is_file():
            fail(f"missing community file: {required}")


def main() -> None:
    validate_source_package()
    validate_marketplace()
    validate_release_metadata()
    validate_generated_marketplace()
    validate_skills_and_docs()
    print("codex-plugin-glab validation passed")


if __name__ == "__main__":
    main()
