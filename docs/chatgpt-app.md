# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For self-hosted GitLab access, deploy the bundled MCP server behind HTTPS. In per-user OAuth mode, each user authorizes their own GitLab identity; the MCP client receives MCP credentials rather than a GitLab PAT.

## Which setup path should I use?

### Personal / Codex: direct remote MCP server

This is the primary path for a personal Codex host:

```text
Codex / ChatGPT desktop host
  -> Add server
  -> Streamable HTTP
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
  -> GitLab REST API v4
```

You do **not** need `.app.json`, `scripts/build_chatgpt_variant.py`, or a managed workspace App Template for this path.

### Local development: localhost fallback

The portable plugin intentionally keeps:

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

Use this only when the bundled MCP server runs on the same machine as the Codex client. Local `git` / `glab` remains responsible for working-tree state, commits, and pushes.

### Managed workspace: platform app administration

A managed ChatGPT workspace can have separate app administration, publication, RBAC, and App Template flows. Those platform-managed flows are separate from the repository helper described below.

### Optional repository workspace binding helper

`plugins/gitlab/workspace-binding/.app.json.example` and `scripts/build_chatgpt_variant.py` can bind an **already-existing** workspace app/connector ID into an ignored copy of this plugin. They are not an OpenAI native or managed App Template, they do not create an app, and they are not needed for the direct personal/Codex MCP path.

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

## 3. Validate the remote endpoint

Before connecting a client, validate the deployment:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor validates the public HTTPS URL, resolves DNS and rejects non-public targets, fetches Protected Resource Metadata, fetches Authorization Server Metadata, verifies issuer consistency, and confirms that unauthenticated `/mcp` returns `401` with an OAuth `WWW-Authenticate` challenge containing `resource_metadata`.

Do not expose localhost/private endpoints to make the remote check pass.

## 4. Add the server in personal / Codex

In the ChatGPT desktop / Codex MCP settings:

1. open **MCP servers**;
2. choose **Add server**;
3. choose **Streamable HTTP**;
4. enter `https://gitlab-mcp.example.com/mcp`;
5. save the server and restart the client if requested;
6. choose **Authenticate** when the client presents OAuth sign-in;
7. complete GitLab browser authorization; and
8. verify a harmless read before enabling write policy.

The MCP server supports the normal discovery chain. An unauthenticated `/mcp` request returns Protected Resource Metadata information; Authorization Server Metadata then advertises the OAuth endpoints. Compatible clients can use CIMD, with DCR retained as a fallback.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

The result should reflect the GitLab account that completed OAuth.

## 5. Localhost `.mcp.json` fallback

The source plugin keeps:

```json
{
  "mcpServers": {
    "gitlab": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

This is deliberately a local fallback. Do not rewrite the portable source file to a maintainer-specific public deployment URL.

## 6. Optional workspace binding helper

Only use this section when the target workspace already has an app/connector ID that needs to be referenced by a plugin copy.

Generate the copy with:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
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

The generated `.app.json` is materialized from `plugins/gitlab/workspace-binding/.app.json.example`. The copied `plugin.json` gets `apps: "./.app.json"`.

`.chatgpt-setup.json` explicitly records that:

- this is workspace-binding-helper output;
- the app/connector must already exist;
- the helper is **not** an OpenAI managed App Template; and
- app creation/authorization remains an explicit platform boundary.

The source plugin, source workspace-binding helper input, and local `.mcp.json` remain unchanged. `dist/` is ignored and workspace-specific IDs should never be committed.

## 7. Managed workspace App Templates

OpenAI managed workspace **App Templates** are a separate platform feature intended for workspace administration. A managed template can provide a guided configuration flow, create a workspace draft app, and then let workspace administrators review, publish, and control access/actions.

This repository does **not** currently ship or claim to be an OpenAI managed App Template. The repository's `.app.json.example` and `build_chatgpt_variant.py` must not be described as one.

If an OpenAI-managed GitLab App Template is available for a target workspace, follow that workspace's Apps / administration flow independently. Personal workspaces and direct Codex MCP setup should continue to use the direct **Add server** path when supported.

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

v0.5+ prefers Client ID Metadata Documents (CIMD) for MCP clients that support URL-based client metadata. The server validates the metadata document and blocks private-network SSRF targets by default. Dynamic Client Registration (DCR) remains available for compatibility.

Native loopback clients such as ChatGPT/Codex may advertise a portless redirect URI such as `http://127.0.0.1/callback/<client-id>` or `http://localhost/callback/<client-id>` and then choose an ephemeral port for the actual authorization request. The server accepts that dynamic port only when the registered URI is portless, both URIs use `http`, the loopback host and path match exactly, the requested port is valid and non-zero, and neither URI contains credentials, a query string, or a fragment. Public redirects and loopback redirects registered with an explicit port continue to require exact matching.

The authorization transaction stores the actual dynamic redirect URI, so the authorization-code exchange must present that same full URI, including the selected port. CIMD therefore works with this native-client pattern without disabling CIMD or falling back to DCR solely for the dynamic port.

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

## What the MCP client does not receive

The MCP client does not need the GitLab OAuth Application secret, `OAUTH_ENCRYPTION_KEY`, PostgreSQL credentials, or a raw PAT. GitLab OAuth access/refresh tokens stay encrypted in the server-side store.

## Shared-token fallback

`MCP_AUTH_MODE=shared-token` remains available for personal/trusted service-identity environments. Do not use it as a substitute for per-user authorization in an untrusted multi-user workspace.

## Product support

OpenAI controls which plans, workspace roles, and ChatGPT/Codex surfaces expose MCP server configuration, managed apps, App Templates, and write-capable tools. Those product capabilities can change independently of this repository, so verify current platform documentation when deploying.
