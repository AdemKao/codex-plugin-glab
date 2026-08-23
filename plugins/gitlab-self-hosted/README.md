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

The portable package is intentionally endpoint-unbound: it contains no `mcpServers`, no automatically loaded `.mcp.json`, and no user/workspace-specific ChatGPT MCP connection binding.

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

### ChatGPT MCP connection binding

Installing the portable repository plugin and authenticating a remote MCP connection are two separate platform operations. A visible `@GitLab Self-Hosted` plugin does **not** automatically discover or attach a user-specific MCP connection.

For ChatGPT:

1. Create/connect the remote MCP endpoint in the ChatGPT platform UI using `https://gitlab-mcp.example.com/mcp`.
2. Complete OAuth and verify that the connection can scan/expose GitLab tools.
3. Copy the platform-generated **technical ID** of that underlying MCP App/connection exactly.
4. Generate the connection-bound plugin marketplace:

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_CHATGPT_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--app-id` remains accepted as a backwards-compatible alias for `--connection-id`.

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

The generated ChatGPT plugin uses `apps: "./.app.json"` and contains neither `mcpServers` nor `.mcp.json`. The `--mcp-url` value is only validated/recorded as the endpoint expected on the existing connection; the actual plugin dependency is the connection technical ID.

Generating the artifact does not create the MCP connection, run OAuth, or modify an already-installed portable plugin. You must import/install the generated marketplace explicitly.

See `docs/chatgpt-app.md` for the complete setup, migration, and troubleshooting flow.