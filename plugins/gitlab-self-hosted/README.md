# GitLab Self-Hosted Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

This plugin combines the repository's self-hosted GitLab MCP server with local `git` and `glab` workflows.

Use MCP first for structured project, issue, merge-request, branch, commit, file, and pipeline data. Use local tools for working-tree changes, commit, and push, or as a fallback when the connected GitLab instance does not expose a required MCP capability.

Main skills:

- `gitlab` — general routing and triage.
- `gitlab-setup` — authentication, host, and capability setup.
- `glab-publish` — branch, stage, test, commit, push, and create MR.
- `glab-address-comments` — address MR feedback and push fixes.
- `glab-fix-ci` — diagnose failed GitLab pipelines/jobs and publish a fix.

## Package identifier migration

Starting with v0.5.4, this third-party package uses the distinct internal identifier:

```text
gitlab-self-hosted
```

The old `gitlab` identifier collided with OpenAI's curated GitLab plugin during platform resolution. The user-facing name remains **GitLab Self-Hosted**, but marketplace, folder, and `plugin.json.name` now intentionally match `gitlab-self-hosted`.

Portable/local plugin reference:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Do not use the old `gitlab@ademkao-codex-plugins` reference for this repository after upgrading to v0.5.4.

## Portable marketplace vs ChatGPT App binding

The portable source plugin keeps `./.mcp.json` pointed at `http://127.0.0.1:3333/mcp` as a same-host Codex fallback. The repository root marketplace, `ademkao-codex-plugins`, installs this portable source package.

A remote MCP server that you add and authenticate separately in MCP settings does **not** automatically replace that packaged localhost dependency in ChatGPT.

To use the plugin with a remote MCP deployment:

1. create/connect the ChatGPT App/connector for the remote HTTPS `/mcp` endpoint;
2. complete OAuth for that App/connector;
3. obtain its existing App/connector ID;
4. run `scripts/build_chatgpt_variant.py` with that ID and remote MCP URL; and
5. import/install the generated marketplace root.

The generated marketplace is `ademkao-gitlab-chatgpt`, so the generated plugin reference is:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Its plugin uses `apps: "./.app.json"` and contains neither `mcpServers` nor `.mcp.json`. This prevents the localhost fallback from competing with the remote App binding.

See `docs/chatgpt-app.md` for the complete setup, migration, and troubleshooting flow.
