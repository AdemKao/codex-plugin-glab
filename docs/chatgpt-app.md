# ChatGPT / Codex App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## Goal

Package the GitLab Self-Hosted workflow as a ChatGPT/Codex plugin that depends on a registered MCP App/connection, while keeping workspace-specific App IDs and real MCP endpoints out of the public source package.

The public marketplace package remains:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

It intentionally contains the reusable skills but no active `.app.json` or maintainer-specific remote endpoint.

## Recommended ChatGPT path: registered MCP App

For ChatGPT plugin usage, the recommended flow is:

```text
GitLab Self-Hosted plugin variant
        |
        | apps: "./.app.json"
        v
Registered ChatGPT MCP App
  plugin_asdk_app_...
        |
        v
https://gitlab-mcp.example.com/mcp
        |
        v
MCP OAuth discovery
        |
        v
GitLab OAuth
        |
        v
GitLab REST API v4
```

### 1. Register the MCP server in ChatGPT

Enable Developer mode, add the deployed public HTTPS `/mcp` endpoint, complete OAuth, and confirm the connection exposes GitLab tools.

After ChatGPT creates the connection, copy its platform-generated technical ID. Current ChatGPT App IDs start with:

```text
plugin_asdk_app_
```

Do not invent this value and do not commit a workspace-specific App ID to the portable public plugin.

### 2. Build the App-bound plugin variant

Use the first-class helper:

```bash
python3 scripts/build_chatgpt_app.py \
  --app-id plugin_asdk_app_REPLACE_ME \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Environment variables are also supported:

```bash
export CHATGPT_APP_ID=plugin_asdk_app_REPLACE_ME
export GITLAB_MCP_URL=https://gitlab-mcp.example.com/mcp
python3 scripts/build_chatgpt_app.py
```

The generated marketplace is written to:

```text
dist/gitlab-chatgpt-marketplace/
```

The generated plugin contains:

```text
plugins/gitlab-self-hosted/
├── .app.json
└── .codex-plugin/
    └── plugin.json
```

Its manifest declares:

```json
{
  "apps": "./.app.json"
}
```

and `.app.json` maps the plugin's `gitlab-self-hosted` app key to the registered `plugin_asdk_app_...` technical ID.

The generated marketplace uses `authentication: ON_INSTALL`, so the App connection is treated as part of the plugin installation path.

### 3. Import and install the generated marketplace

Import or add the generated marketplace source to the target ChatGPT/Codex workspace, then install:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Use the generated artifact only in the workspace that owns the referenced App/connection unless that App ID is explicitly documented as portable.

## Why the public plugin stays endpoint-neutral

A registered ChatGPT MCP App ID is platform-generated and normally belongs to a specific user/workspace connection. A public Git repository cannot safely guess that ID or dynamically discover it during installation.

Therefore this repository keeps two layers separate:

- **Portable source plugin:** public skills and metadata, no workspace-specific App ID.
- **Generated App-bound plugin:** contains `.app.json` and `apps: "./.app.json"` for one registered ChatGPT MCP App.

This avoids shipping a broken placeholder as an active dependency and avoids silently routing all users to a maintainer-controlled MCP deployment.

## Direct remote MCP fallback

Clients that expose custom MCP servers directly can still add the remote HTTPS `/mcp` endpoint without generating the App-bound marketplace. This remains useful for development, troubleshooting, and MCP-client testing.

Reference configuration:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

The committed example deliberately uses:

```text
https://gitlab-mcp.example.com/mcp
```

Do not replace the public example with a private or organization-specific endpoint.

## Validate the MCP endpoint

Before binding a ChatGPT App, validate the remote deployment:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor checks the public HTTPS URL, OAuth Protected Resource Metadata, Authorization Server Metadata, DNS safety, and the unauthenticated `/mcp` OAuth challenge.

## OAuth server endpoints

In OAuth mode the bundled server exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

The server supports CIMD and DCR-compatible registration. Downstream MCP OAuth and upstream GitLab OAuth use PKCE S256.

## Local development fallback

Localhost is available only through an explicit generated local variant:

```bash
python3 scripts/build_local_variant.py
```

That development artifact binds:

```text
http://127.0.0.1:3333/mcp
```

The public root marketplace never selects localhost automatically.

## Compatibility helpers

The lower-level helper remains available:

```text
scripts/build_chatgpt_variant.py
```

`build_chatgpt_app.py` is the preferred ChatGPT-facing wrapper because it validates the current `plugin_asdk_app_...` technical-ID shape and supports `CHATGPT_APP_ID` / `GITLAB_MCP_URL` environment variables.

`scripts/build_personal_variant.py` remains available for explicit direct remote-MCP packaging.

## Troubleshooting

If the plugin is visible but GitLab tools are missing:

1. Confirm the remote MCP connection itself can scan/expose GitLab tools.
2. Confirm OAuth completed for that same connection.
3. Confirm the copied technical ID starts with `plugin_asdk_app_`.
4. Open the generated `plugins/gitlab-self-hosted/.app.json` and verify it contains that exact ID.
5. Confirm the generated `plugin.json` contains `"apps": "./.app.json"` and does not retain a direct `.mcp.json` dependency.
6. Install the generated `gitlab-self-hosted@ademkao-gitlab-chatgpt` package rather than assuming an already-installed portable source plugin was modified in place.

## Public configuration guard

CI keeps the portable source endpoint-neutral and separately smoke-tests the registered-App packaging path. It rejects unsafe MCP URLs and verifies that the generated App-bound plugin contains the expected `.app.json` dependency.
