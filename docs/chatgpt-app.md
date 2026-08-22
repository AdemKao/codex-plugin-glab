# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For v0.4, the recommended multi-user ChatGPT path is the bundled MCP server in **per-user OAuth mode**. ChatGPT connects to your HTTPS `/mcp` endpoint; each user then authorizes their own GitLab account through the server's OAuth flow.

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP + OAuth discovery
        v
https://gitlab-mcp.example.com/mcp
        |
        | built-in OAuth gateway
        v
GitLab OAuth
        |
        | per-user GitLab token
        v
GitLab REST API v4
```

## 1. Create a GitLab OAuth Application

Create one OAuth Application on the GitLab instance you want the MCP server to use.

Callback URI:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Keep the Application ID and secret in your deployment secret manager. Do not put them in the plugin package or ChatGPT prompt.

## 2. Deploy the MCP server in OAuth mode

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Deploy behind HTTPS. The public origin in `PUBLIC_BASE_URL` must be the same origin users and MCP clients can reach.

The root Docker Compose file persists `/data` for the encrypted OAuth store. Protect the encryption key separately from the volume.

## 3. Verify OAuth discovery before adding ChatGPT

Useful checks:

```text
GET https://gitlab-mcp.example.com/.well-known/oauth-protected-resource
GET https://gitlab-mcp.example.com/.well-known/oauth-authorization-server
```

An unauthenticated request to:

```text
https://gitlab-mcp.example.com/mcp
```

should return `401` and a `WWW-Authenticate` header containing `resource_metadata=...`.

Do not consider the deployment ready if `/mcp` accepts anonymous requests in OAuth mode.

## 4. Create the ChatGPT Custom MCP App

In a ChatGPT workspace/surface that currently supports the required custom MCP capability:

1. Enable Developer Mode if required.
2. Create a Custom MCP App.
3. Enter `https://gitlab-mcp.example.com/mcp`.
4. Scan/discover tools.
5. Start the authentication flow when prompted.
6. Authorize the GitLab account in the GitLab browser consent screen.
7. Return to ChatGPT and verify a harmless read operation first.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

The MCP tools should execute with the GitLab identity that completed OAuth, not a shared server token.

## Read vs write authorization

The deployment is read-only by default.

For a read-only ChatGPT integration:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

The OAuth flow exposes only `gitlab:read`.

To permit selected write tools:

```bash
GITLAB_WRITE_ENABLED=true
```

The user must also authorize `gitlab:write`. Merge still remains disabled until:

```bash
GITLAB_MERGE_ENABLED=true
```

OAuth scope, server policy, project allowlist, and the GitLab user's actual GitLab permission all have to permit the action.

## What ChatGPT does not receive

With per-user OAuth, ChatGPT/MCP clients receive MCP access and refresh tokens issued by this MCP server. The client does **not** need the deployment's GitLab OAuth application secret, `OAUTH_ENCRYPTION_KEY`, or a raw PAT.

The user's GitLab OAuth access/refresh tokens are kept in the encrypted server-side OAuth store.

## Shared-token fallback

For a personal/trusted single-user environment, `MCP_AUTH_MODE=shared-token` remains supported. It uses one GitLab token for the deployment and may use `MCP_AUTH_TOKEN` to protect the MCP endpoint.

Do not use shared-token mode as a substitute for per-user authorization in an untrusted multi-user ChatGPT workspace.

## Current storage limitation

v0.4's built-in OAuth store is single-node/file-based. Use one writable MCP server instance for a given store. Do not mount the same OAuth store file into several replicas without an external locking/transactional backend.

## ChatGPT plan and surface support

OpenAI controls which plans, workspace roles, and ChatGPT surfaces can create or use Custom MCP Apps and write-capable MCP tools. Those rules can change independently of this repository, so verify current OpenAI documentation when deploying.

## Plugin packaging

`scripts/build_chatgpt_variant.py` remains available for workspace-specific plugin/app packaging where applicable. The GitLab data and OAuth path is the self-hosted MCP server.
