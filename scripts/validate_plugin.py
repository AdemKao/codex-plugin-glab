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
MCP_BINDING = PLUGIN / ".mcp.json"
MCP_TEMPLATE = PLUGIN / "workspace-binding" / ".mcp.local.json.example"
APP_TEMPLATE = PLUGIN / "workspace-binding" / ".app.json.example"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
BUILDER = ROOT / "scripts" / "build_chatgpt_variant.py"
PERSONAL_BUILDER = ROOT / "scripts" / "build_personal_variant.py"
LOCAL_BUILDER = ROOT / "scripts" / "build_local_variant.py"
MCP_PACKAGE = ROOT / "packages" / "mcp-server" / "package.json"
VERSION_FILE = ROOT / "VERSION"
PLACEHOLDER = "REPLACE_WITH_GITLAB_APP_OR_CONNECTOR_ID"
GENERATED_MARKETPLACE = "ademkao-gitlab-chatgpt"
GENERATED_PERSONAL_MARKETPLACE = "ademkao-gitlab-remote"
GENERATED_LOCAL_MARKETPLACE = "ademkao-gitlab-local"
DEFAULT_REMOTE_MCP_URL = "https://gitlab-mcp.blacmarcs.com/mcp"
TEST_MCP_URL = "https://gitlab-mcp.example.com/mcp"
LOCAL_MCP_URL = "http://127.0.0.1:3333/mcp"

DOC_PAIRS = [
    ("README.md", "README.zh-TW.md"),
    ("docs/chatgpt-app.md", "docs/chatgpt-app.zh-TW.md"),
    ("docs/architecture.md", "docs/architecture.zh-TW.md"),
    ("docs/authentication.md", "docs/authentication.zh-TW.md"),
    ("docs/self-managed.md", "docs/self-managed.zh-TW.md"),
    ("docs/capability-matrix.md", "docs/capability-matrix.zh-TW.md"),
    ("docs/roadmap.md", "docs/roadmap.zh-TW.md"),
]

REMOTE_DEFAULT_DOCS = [
    "README.md",
    "README.zh-TW.md",
    "docs/chatgpt-app.md",
    "docs/chatgpt-app.zh-TW.md",
    "plugins/gitlab-self-hosted/README.md",
    "plugins/gitlab-self-hosted/README.zh-TW.md",
    "plugins/gitlab-self-hosted/skills/gitlab-setup/SKILL.md",
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


def gitlab_server(document: dict, description: str) -> dict:
    server = document.get("mcpServers", {}).get("gitlab")
    if not isinstance(server, dict):
        fail(f"{description} must define mcpServers.gitlab")
    return server


def validate_source_package() -> None:
    if (ROOT / "plugins" / "gitlab").exists():
        fail("plugins/gitlab must not exist; the generic id collides with curated GitLab")

    manifest = load(MANIFEST)
    if PLUGIN.name != PLUGIN_ID or manifest.get("name") != PLUGIN_ID:
        fail("plugin folder and plugin.json.name must both be gitlab-self-hosted")
    if manifest.get("version") != version():
        fail("plugin version must match VERSION")
    if manifest.get("skills") != "./skills/":
        fail("plugin must keep the standard skills path")
    if manifest.get("mcpServers") != "./.mcp.json":
        fail("root plugin must load the committed direct MCP binding")
    if "apps" in manifest:
        fail("root plugin must use direct MCP rather than an App binding")

    source_server = gitlab_server(load(MCP_BINDING), "root MCP binding")
    if source_server.get("type") != "http" or source_server.get("url") != DEFAULT_REMOTE_MCP_URL:
        fail(f"root MCP binding must point at {DEFAULT_REMOTE_MCP_URL}")

    interface = manifest.get("interface", {})
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
        if interface.get(key) in (None, "", []):
            fail(f"interface.{key} is required")

    local_server = gitlab_server(load(MCP_TEMPLATE), "local MCP template")
    if local_server.get("type") != "http" or local_server.get("url") != LOCAL_MCP_URL:
        fail("local MCP template changed unexpectedly")

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
    if entry.get("source") != {"source": "local", "path": f"./plugins/{PLUGIN_ID}"}:
        fail("root marketplace must install the committed remote-bound plugin directly")
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


def run_builder(command: list[str], description: str) -> None:
    run = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    if run.returncode != 0:
        fail(f"{description} failed: {run.stderr.strip()}")


def validate_generated_marketplace() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-chatgpt-") as temp:
        output = Path(temp) / "marketplace"
        run_builder(
            [
                sys.executable,
                str(BUILDER),
                "--connection-id",
                "test_connector_ci_123",
                "--mcp-url",
                TEST_MCP_URL,
                "--output",
                str(output),
            ],
            "ChatGPT marketplace builder",
        )
        plugin = output / "plugins" / PLUGIN_ID
        generated_manifest = load(plugin / ".codex-plugin" / "plugin.json")
        generated_app = load(plugin / ".app.json")
        generated_setup = load(plugin / ".chatgpt-setup.json")
        generated_marketplace = load(output / ".agents" / "plugins" / "marketplace.json")

        entry = generated_marketplace.get("plugins", [{}])[0]
        expected_ref = f"{PLUGIN_ID}@{GENERATED_MARKETPLACE}"
        if generated_marketplace.get("name") != GENERATED_MARKETPLACE:
            fail("generated ChatGPT marketplace has the wrong catalog name")
        if entry.get("name") != PLUGIN_ID or entry.get("source", {}).get("path") != f"./plugins/{PLUGIN_ID}":
            fail("generated ChatGPT marketplace identity/path is not namespaced")
        if generated_manifest.get("name") != PLUGIN_ID or generated_manifest.get("apps") != "./.app.json":
            fail("generated ChatGPT plugin has the wrong App binding")
        if "mcpServers" in generated_manifest or (plugin / ".mcp.json").exists():
            fail("generated App-bound plugin must remove the source direct MCP binding")
        if generated_app.get("apps", {}).get(PLUGIN_ID, {}).get("id") != "test_connector_ci_123":
            fail("generated .app.json has the wrong connection binding")
        if generated_setup.get("plugin_reference") != expected_ref:
            fail("generated ChatGPT setup has the wrong plugin reference")
        for flag in (
            "requires_existing_workspace_app_or_connector",
            "requires_marketplace_import_or_install",
            "does_not_modify_existing_installation",
            "source_default_remote_bound",
            "source_direct_mcp_removed_for_app_binding",
            "endpoint_configured_on_app",
        ):
            if generated_setup.get(flag) is not True:
                fail(f"generated ChatGPT setup must set {flag}=true")

    for bad_url in (
        "http://gitlab-mcp.example.com/mcp",
        "https://localhost/mcp",
        "https://127.0.0.1/mcp",
        "https://10.0.0.8/mcp",
        "https://169.254.10.1/mcp",
        "https://gitlab-mcp.example.com/not-mcp",
    ):
        with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-chatgpt-reject-") as temp:
            run = subprocess.run(
                [
                    sys.executable,
                    str(BUILDER),
                    "--connection-id",
                    "bad_ci",
                    "--mcp-url",
                    bad_url,
                    "--output",
                    str(Path(temp) / "out"),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            if run.returncode == 0:
                fail(f"ChatGPT builder accepted unsafe MCP URL: {bad_url}")


def validate_generated_personal_marketplace() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-remote-") as temp:
        output = Path(temp) / "marketplace"
        run_builder(
            [
                sys.executable,
                str(PERSONAL_BUILDER),
                "--mcp-url",
                TEST_MCP_URL,
                "--output",
                str(output),
            ],
            "custom remote marketplace builder",
        )
        plugin = output / "plugins" / PLUGIN_ID
        manifest = load(plugin / ".codex-plugin" / "plugin.json")
        mcp = load(plugin / ".mcp.json")
        setup = load(plugin / ".chatgpt-setup.json")
        marketplace = load(output / ".agents" / "plugins" / "marketplace.json")

        if marketplace.get("name") != GENERATED_PERSONAL_MARKETPLACE:
            fail("generated custom remote marketplace has the wrong catalog name")
        if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
            fail("generated custom remote plugin must retain direct MCP binding only")
        if gitlab_server(mcp, "generated custom remote MCP binding").get("url") != TEST_MCP_URL:
            fail("generated custom remote MCP binding has the wrong URL")
        if setup.get("binding_mode") != "remote-mcp":
            fail("generated custom remote setup must identify remote-mcp mode")
        if setup.get("source_default_remote_bound") is not True or setup.get("endpoint_overridden_explicitly") is not True:
            fail("generated custom remote setup must record the source/default override")
        if setup.get("requires_chatgpt_app_binding") is not False:
            fail("generated custom remote setup must not require ChatGPT App binding")
        if (plugin / "workspace-binding").exists():
            fail("generated custom remote marketplace must remove workspace-only templates")

    for bad_url in (
        "http://gitlab-mcp.example.com/mcp",
        "https://localhost/mcp",
        "https://127.0.0.1/mcp",
        "https://10.0.0.8/mcp",
        "https://gitlab-mcp.example.com/not-mcp",
    ):
        with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-remote-reject-") as temp:
            run = subprocess.run(
                [
                    sys.executable,
                    str(PERSONAL_BUILDER),
                    "--mcp-url",
                    bad_url,
                    "--output",
                    str(Path(temp) / "out"),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            if run.returncode == 0:
                fail(f"custom remote builder accepted unsafe MCP URL: {bad_url}")


def validate_generated_local_marketplace() -> None:
    with tempfile.TemporaryDirectory(prefix="codex-plugin-glab-local-") as temp:
        output = Path(temp) / "marketplace"
        run_builder(
            [sys.executable, str(LOCAL_BUILDER), "--output", str(output)],
            "local marketplace builder",
        )
        plugin = output / "plugins" / PLUGIN_ID
        manifest = load(plugin / ".codex-plugin" / "plugin.json")
        mcp = load(plugin / ".mcp.json")
        setup = load(plugin / ".chatgpt-setup.json")
        marketplace = load(output / ".agents" / "plugins" / "marketplace.json")

        if marketplace.get("name") != GENERATED_LOCAL_MARKETPLACE:
            fail("generated local marketplace has the wrong catalog name")
        if manifest.get("mcpServers") != "./.mcp.json" or "apps" in manifest:
            fail("generated local plugin must retain direct MCP binding only")
        if gitlab_server(mcp, "generated local MCP binding").get("url") != LOCAL_MCP_URL:
            fail("generated local MCP binding has the wrong localhost URL")
        if setup.get("binding_mode") != "local-mcp":
            fail("generated local setup metadata is incorrect")
        for flag in ("source_default_remote_bound", "endpoint_overridden_locally", "requires_local_mcp_server"):
            if setup.get(flag) is not True:
                fail(f"generated local setup must set {flag}=true")
        if (plugin / "workspace-binding").exists():
            fail("generated local marketplace must remove workspace-only templates")


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

    for path_string in REMOTE_DEFAULT_DOCS:
        text = (ROOT / path_string).read_text(encoding="utf-8")
        if DEFAULT_REMOTE_MCP_URL not in text:
            fail(f"{path_string} must document the root hosted MCP endpoint")
        if "endpoint-unbound" in text:
            fail(f"{path_string} still describes the root plugin as endpoint-unbound")

    for required in ("LICENSE", "CHANGELOG.md", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md", "SECURITY.md", "SUPPORT.md"):
        if not (ROOT / required).is_file():
            fail(f"missing community file: {required}")


def main() -> None:
    validate_source_package()
    validate_marketplace()
    validate_release_metadata()
    validate_generated_marketplace()
    validate_generated_personal_marketplace()
    validate_generated_local_marketplace()
    validate_skills_and_docs()
    print("codex-plugin-glab validation passed")


if __name__ == "__main__":
    main()
