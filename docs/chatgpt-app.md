# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For multi-user ChatGPT access, deploy the bundled MCP server in **per-user OAuth mode**. Each user authorizes their own GitLab identity; ChatGPT receives MCP credentials, not a GitLab PAT.

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP + OAuth discovery
        | CIMD when supported, DCR fallback
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

OAuth sessions
  one replica -> encrypted file
  many replicas -> PostgreSQL
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

The PostgreSQL backend gives atomic one-time authorization state/code consumption and refresh-token rotation across replicas.

## 3. Verify OAuth discovery

Check:

```text
GET https://gitlab-mcp.example.com/.well-known/oauth-protected-resource
GET https://gitlab-mcp.example.com/.well-known/oauth-authorization-server
```

The authorization metadata should advertise:

```json
"client_id_metadata_document_supported": true
```

when CIMD is enabled. DCR remains available at `/oauth/register` when `OAUTH_DCR_ENABLED=true`.

An unauthenticated `/mcp` request must return `401` with `WWW-Authenticate` pointing to Protected Resource Metadata.

## 4. Connect ChatGPT

In a ChatGPT workspace/surface that supports Custom MCP Apps:

1. enable Developer Mode if required;
2. create a Custom MCP App;
3. enter `https://gitlab-mcp.example.com/mcp`;
4. let the client discover tools and OAuth;
5. complete GitLab browser authorization;
6. verify a harmless read first.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

The result must reflect the GitLab account that completed OAuth.

## CIMD / DCR

v0.5 prefers CIMD for MCP clients that support URL-based client metadata. The server validates the metadata document and blocks private-network SSRF targets by default. DCR is retained for compatibility with clients that still require dynamic registration.

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

OpenAI controls which plans, workspace roles, and ChatGPT surfaces can create/use Custom MCP Apps and write-capable MCP tools. Verify current OpenAI documentation when deploying because those capabilities can change independently of this repo.
