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

The old `gitlab` identifier collided with OpenAI's curated GitLab plugin during platform resolution. The user-facing name remains **GitLab Self-Hosted**, but marketplace, folder, and `plugin.json.name` intentionally match `gitlab-self-hosted`.

Portable reference:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The portable package is intentionally endpoint-unbound: it contains no `mcpServers`, no automatically loaded `.mcp.json`, and no workspace-specific App binding.

Explicit generated references:

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Do not use the old `gitlab@ademkao-codex-plugins` reference for this repository after upgrading to v0.5.4.

## Choose an MCP connection explicitly

### Local Codex

When the bundled MCP server runs on the same machine, generate a localhost-bound marketplace:

```bash
python3 scripts/build_local_variant.py
```

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

Only this generated variant contains:

```text
.mcp.json -> http://127.0.0.1:3333/mcp
```

### Direct remote MCP

For an OCI or other self-hosted deployment, supply the desired public HTTPS endpoint:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-remote
```

The selected URL is validated and written only into the generated artifact. The committed portable plugin remains endpoint-unbound.

### ChatGPT custom MCP App

For ChatGPT, configure the MCP endpoint on the custom MCP App/connector. The portable plugin does not own or mutate the App's URL.

After the App exists and OAuth is configured, bind a generated plugin marketplace to its App/connector ID:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

The generated ChatGPT plugin uses `apps: "./.app.json"` and contains neither `mcpServers` nor `.mcp.json`. The `--mcp-url` value is validated and recorded as the endpoint expected to already be configured on the referenced App.

See `docs/chatgpt-app.md` for the complete setup, migration, and troubleshooting flow.
