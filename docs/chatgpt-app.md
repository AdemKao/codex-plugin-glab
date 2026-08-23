# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For multi-user ChatGPT access, deploy the bundled MCP server in **per-user OAuth mode**. Each user authorizes their own GitLab identity; ChatGPT receives MCP credentials, not a GitLab PAT.

The portable source plugin intentionally keeps `plugins/gitlab/.mcp.json` pointed at `http://127.0.0.1:3333/mcp` for local Codex use. A ChatGPT Custom MCP App must instead point at a public HTTPS `/mcp` endpoint.

## Flow

```text
Local Codex
  -> source plugin
  -> http://127.0.0.1:3333/mcp

ChatGPT
  -> explicit Custom MCP App creation/consent
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery (CIMD when supported, DCR fallback)
  -> GitLab OAuth
  -> GitLab REST API v4
```

## 1. Create a GitLab OAuth Application

Create one OAuth Application on the target GitLab instance with callback:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Keep the Application ID/secret and `OAUTH_ENCRYPTION_KEY` in deployment secrets, not the plugin or prompts.

## 2. Deploy OAuth mode

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Single replica:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Production / multi-replica:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

## 3. Run the ChatGPT MCP doctor

Before creating the workspace App, validate the deployed endpoint:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor validates the public HTTPS URL, resolves DNS and rejects non-public targets, fetches Protected Resource Metadata, fetches Authorization Server Metadata, verifies issuer consistency, and confirms that unauthenticated `/mcp` returns `401` with `WWW-Authenticate: ... resource_metadata=...`.

Do not proceed if the doctor fails. Do not expose localhost/private endpoints to make the check pass.

## 4. Explicitly create/connect the ChatGPT Custom MCP App

In a ChatGPT workspace/surface that currently supports Custom MCP Apps:

1. enable Developer Mode if required;
2. explicitly create a Custom MCP App;
3. enter `https://gitlab-mcp.example.com/mcp`;
4. let ChatGPT discover tools and OAuth;
5. complete GitLab browser authorization;
6. verify a harmless read first.

This repository does **not** claim that installing the plugin silently creates an arbitrary workspace Custom MCP App. App creation and authorization remain an explicit ChatGPT user/workspace-admin consent boundary.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

The result must reflect the GitLab account that completed OAuth.

## 5. Build the workspace-bound plugin variant

After the workspace gives you the App/connector ID, generate the binding without editing source files:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_WORKSPACE_APP_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Default output:

```text
dist/gitlab-chatgpt/
  .app.json
  .chatgpt-setup.json
  .codex-plugin/plugin.json
  ...
```

The generated `.app.json` is materialized from the source `plugins/gitlab/app-template/.app.json.example` semantics. The copied `plugin.json` gets `apps: "./.app.json"`. `.chatgpt-setup.json` records the expected remote MCP URL and reminds operators that the workspace App must be explicitly created.

The source plugin, source template, and local `.mcp.json` remain unchanged. `dist/` is ignored and workspace-specific IDs should never be committed.

## Remote URL safety

The ChatGPT variant builder rejects:

- non-HTTPS URLs;
- localhost / `.localhost`;
- loopback, private, link-local, multicast, reserved, and unspecified literal IPs;
- embedded username/password;
- query strings or fragments; and
- endpoints that do not use `/mcp`.

The live doctor additionally resolves DNS and rejects any resolved non-public address before making HTTP requests.

## CIMD / DCR

v0.5+ prefers CIMD for MCP clients that support URL-based client metadata. The server validates the metadata document and blocks private-network SSRF targets by default. DCR is retained for compatibility with clients that still require dynamic registration.

## Read vs write

Read-only deployment:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

To enable write tools:

```bash
GITLAB_WRITE_ENABLED=true
```

The user must also authorize `gitlab:write`. MR merge remains disabled until `GITLAB_MERGE_ENABLED=true`.

OAuth scope, deployment policy, project allowlist, and GitLab permission all have to allow the action.

## What ChatGPT does not receive

ChatGPT/MCP clients do not need the GitLab OAuth Application secret, `OAUTH_ENCRYPTION_KEY`, the PostgreSQL credentials, or a raw PAT. GitLab OAuth access/refresh tokens stay encrypted in the server-side store.

## Shared-token fallback

`MCP_AUTH_MODE=shared-token` remains available for personal/trusted environments. Do not use it as a substitute for per-user authorization in an untrusted multi-user workspace.

## Product support

OpenAI controls which plans, workspace roles, and ChatGPT surfaces can create/use Custom MCP Apps and write-capable MCP tools. Verify current OpenAI documentation when deploying because those capabilities can change independently of this repository.
