# Remote MCP / ChatGPT Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For remote multi-user access, deploy the bundled MCP server in **per-user OAuth mode**. Each user authorizes their own GitLab identity; the MCP client receives MCP credentials, not a GitLab PAT.

This repository supports several client installation surfaces, but they are intentionally separate:

1. **Personal / Codex remote MCP** — add the deployed server directly with **Add server -> remote HTTPS `/mcp` -> OAuth discovery**.
2. **Local Codex fallback** — keep the portable `plugins/gitlab/.mcp.json` pointed at `http://127.0.0.1:3333/mcp` when Codex and the server run on the same machine.
3. **Managed ChatGPT workspace** — use the platform/admin App or App Template provisioning flow where available. This repository does not define or generate an OpenAI-native managed workspace App Template.

## Flow

```text
Personal / Codex remote
  -> Add server
  -> https://gitlab-mcp.example.com/mcp
  -> 401 + Protected Resource Metadata
  -> OAuth discovery / CIMD or DCR
  -> browser GitLab OAuth
  -> GitLab REST API v4

Local Codex fallback
  -> source plugin .mcp.json
  -> http://127.0.0.1:3333/mcp

Managed ChatGPT workspace
  -> platform/admin App provisioning or managed App Template (when available)
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
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

## 3. Validate the remote OAuth MCP endpoint

Before adding the server to a client or workspace, validate the deployed endpoint:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor validates the public HTTPS URL, resolves DNS and rejects non-public targets, fetches Protected Resource Metadata, fetches Authorization Server Metadata, verifies issuer consistency, and confirms that unauthenticated `/mcp` returns `401` with `WWW-Authenticate: ... resource_metadata=...`.

Do not expose localhost/private endpoints just to make the remote check pass.

## 4. Personal / Codex remote installation

For a personal Codex client using this self-hosted server:

1. open the MCP server configuration UI;
2. choose **Add server**;
3. choose the remote HTTP/HTTPS MCP option;
4. enter `https://gitlab-mcp.example.com/mcp`;
5. allow the client to follow OAuth discovery from the MCP `401` challenge and metadata endpoints;
6. complete browser GitLab authorization;
7. verify a harmless read such as listing groups or projects.

Do **not** replace the source `.mcp.json` with the remote URL just to enable this path. The remote client configuration is separate from the portable local fallback.

## 5. Local Codex fallback

The source plugin intentionally keeps:

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

Use it when the MCP server is running on the same machine as Codex. Local working-tree state, commit, and push remain local `git` / `glab` responsibilities.

## 6. Managed ChatGPT workspace App / App Template

If a managed ChatGPT workspace exposes an admin-controlled App or App Template provisioning feature, create/provision the integration through that **OpenAI workspace/admin surface** and point it at the same validated public HTTPS `/mcp` endpoint.

That provisioning lifecycle, template format, plan availability, approval policy, and admin consent are controlled by OpenAI. This repository documents compatibility with that route but does **not** publish, generate, or emulate an OpenAI-native managed workspace App Template.

## 7. Optional workspace binding helper for an existing App/connector

If the target ChatGPT workspace already has an App/connector and provides its ID, this repository can build a workspace-specific plugin binding helper without editing the portable source plugin:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_ID \
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

The generated `.app.json` is materialized from `plugins/gitlab/workspace-binding/.app.json.example`. That source file is a **workspace binding example only**. It is not an OpenAI App Template specification.

The generated `.chatgpt-setup.json` records that:

- the App/connector must already exist;
- the remote HTTPS `/mcp` endpoint is expected to be configured on that App/connector; and
- this repository did not create a managed workspace App Template.

`dist/` is ignored and workspace-specific IDs should never be committed.

## Remote URL safety

The workspace binding helper rejects:

- non-HTTPS URLs;
- localhost / `.localhost`;
- loopback, private, link-local, multicast, reserved, and unspecified literal IPs;
- embedded username/password;
- query strings or fragments; and
- endpoints that do not use `/mcp`.

The live doctor additionally resolves DNS and rejects any resolved non-public address before making HTTP requests.

## CIMD / DCR

v0.5+ prefers Client ID Metadata Documents (CIMD) for MCP clients that support URL-based client metadata. The server validates the metadata document and blocks private-network SSRF targets by default. Dynamic Client Registration (DCR) remains available as a compatibility fallback.

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

## What remote clients do not receive

Codex/ChatGPT/MCP clients do not need the GitLab OAuth Application secret, `OAUTH_ENCRYPTION_KEY`, PostgreSQL credentials, or a raw PAT. GitLab OAuth access/refresh tokens stay encrypted in the server-side store.

## Shared-token fallback

`MCP_AUTH_MODE=shared-token` remains available for personal/trusted environments. Do not use it as a substitute for per-user authorization in an untrusted multi-user workspace.

## Product support

OpenAI controls which products, plans, workspace roles, and surfaces expose remote MCP server configuration, managed Apps/App Templates, and write-capable MCP tools. Verify current platform documentation when deploying because those capabilities can change independently of this repository.
