# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For self-hosted GitLab access, deploy the bundled MCP server behind HTTPS. In per-user OAuth mode, each user authorizes their own GitLab identity; the MCP client receives MCP credentials rather than a GitLab PAT.

## The important distinction

There are two different integration layers:

1. **Codex / native MCP server configuration** — adding `https://gitlab-mcp.example.com/mcp` directly makes that remote MCP server available to the client.
2. **ChatGPT `@GitLab` plugin binding** — the plugin must explicitly depend on the connected ChatGPT App/connector that owns the remote MCP connection.

A remote MCP server that is added and authenticated separately does **not** automatically replace the portable source plugin's packaged localhost MCP dependency.

That distinction explains the failure mode where OAuth succeeds, the plugin and skills are visible, but the ChatGPT conversation still has no GitLab tools.

## Which setup path should I use?

### Codex / native MCP: direct remote server

Use this when the remote MCP server itself is the capability you want to invoke:

```text
Codex / native MCP client
  -> Add server
  -> Streamable HTTP
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
  -> GitLab REST API v4
```

This direct MCP path does **not** require `.app.json` or `scripts/build_chatgpt_variant.py`.

### ChatGPT `@GitLab`: App-bound plugin variant

Use this when you want the GitLab plugin mention and its skills to expose tools from a remote MCP deployment:

```text
ChatGPT plugin
  -> .app.json binding
  -> existing ChatGPT App / connector
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> GitLab REST API v4
```

The App/connector must already exist and point to the remote MCP endpoint. Build the workspace-bound plugin copy with its App/connector ID. The generated ChatGPT variant removes the source `mcpServers` entry and the copied `.mcp.json`, so the plugin cannot keep the localhost fallback as a competing dependency.

### Local development: localhost fallback

The portable source plugin intentionally keeps:

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

Use this only when the bundled MCP server runs on the same machine as the Codex client. Local `git` / `glab` remains responsible for working-tree state, commits, and pushes.

### Managed workspace: platform App administration

A managed ChatGPT workspace can have separate App administration, publication, RBAC, and App Template flows. Those platform-managed flows are separate from the repository helper described below.

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

A successful doctor/OAuth result proves the remote MCP authentication path. It does **not** prove that an installed ChatGPT plugin is bound to that remote server.

## 4. Add the server directly in Codex / native MCP

1. open **MCP servers**;
2. choose **Add server**;
3. choose **Streamable HTTP**;
4. enter `https://gitlab-mcp.example.com/mcp`;
5. save the server and restart the client if requested;
6. choose **Authenticate** when the client presents OAuth sign-in;
7. complete GitLab browser authorization; and
8. verify a harmless read before enabling write policy.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

The result should reflect the GitLab account that completed OAuth.

## 5. Bind the remote server to `@GitLab` in ChatGPT

Adding the remote MCP server separately is not enough to replace the source plugin's packaged dependency.

First create/connect a ChatGPT App/connector for the remote MCP endpoint through the platform UI and complete OAuth. Then obtain that existing App/connector ID and build the bound plugin variant:

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

The generated variant intentionally differs from the portable source plugin:

- `.codex-plugin/plugin.json` contains `apps: "./.app.json"`;
- `.codex-plugin/plugin.json` does **not** contain `mcpServers`;
- the generated directory does **not** contain `.mcp.json`;
- `.chatgpt-setup.json` records `binding_mode: "app"` and `source_local_mcp_removed: true`.

The source plugin remains unchanged and still keeps the localhost fallback for Codex.

## 6. Troubleshooting: OAuth succeeds but `@GitLab` exposes no tools

If all of these are true:

- the remote MCP server is visible in MCP settings;
- OAuth completed successfully;
- the GitLab plugin and skills are installed; and
- the conversation cannot call GitLab tools;

check the plugin's binding before changing OAuth settings.

A common broken state is:

```text
Plugin @GitLab
  -> packaged mcpServers
  -> http://127.0.0.1:3333/mcp

Separate MCP entry
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth succeeds
```

Those are two separate bindings. The working remote MCP entry does not implicitly replace the plugin's localhost dependency.

The ChatGPT-bound package should instead be:

```text
Plugin @GitLab
  -> apps: ./.app.json
  -> existing connected App/connector
  -> https://gitlab-mcp.example.com/mcp
```

If the generated ChatGPT plugin still shows a packaged MCP server or still contains `.mcp.json`, rebuild it with the current helper before troubleshooting OAuth again.

## 7. Managed workspace App Templates

OpenAI managed workspace **App Templates** are a separate platform feature intended for workspace administration. A managed template can provide a guided configuration flow, create a workspace draft app, and then let workspace administrators review, publish, and control access/actions.

This repository does **not** currently ship or claim to be an OpenAI managed App Template. The repository's `.app.json.example` and `build_chatgpt_variant.py` must not be described as one.

If an OpenAI-managed GitLab App Template is available for a target workspace, follow that workspace's Apps / administration flow independently.

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

Native loopback clients may advertise a portless redirect URI such as `http://127.0.0.1/callback/<client-id>` or `http://localhost/callback/<client-id>` and then choose an ephemeral port for the actual authorization request. The server accepts that dynamic port only when the registered URI is portless, both URIs use `http`, the loopback host and path match exactly, the requested port is valid and non-zero, and neither URI contains credentials, a query string, or a fragment. Public redirects and loopback redirects registered with an explicit port continue to require exact matching.

The authorization transaction stores the actual dynamic redirect URI, so the authorization-code exchange must present that same full URI, including the selected port.

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

OpenAI controls which plans, workspace roles, and ChatGPT/Codex surfaces expose MCP server configuration, managed Apps, App Templates, and write-capable tools. Those product capabilities can change independently of this repository, so verify current platform documentation when deploying.
