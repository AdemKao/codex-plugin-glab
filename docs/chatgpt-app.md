# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For self-hosted GitLab access, deploy the bundled MCP server behind HTTPS. In per-user OAuth mode, each user authorizes their own GitLab identity; the MCP client receives MCP credentials rather than a GitLab PAT.

## Package identity

Starting with v0.5.4, this repository uses the third-party plugin identifier:

```text
gitlab-self-hosted
```

Do not use `gitlab@ademkao-codex-plugins`; the generic `gitlab` identifier can resolve to OpenAI's curated GitLab plugin.

The portable reference is:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The portable package is intentionally **endpoint-unbound**. It contains workflow skills and metadata, but no `mcpServers`, no automatically loaded `.mcp.json`, and no user/workspace-specific ChatGPT MCP connection binding.

Explicit generated references are:

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

## The important distinction

Keep these layers separate:

1. **Portable plugin** — workflow skills/metadata only; it does not select an MCP endpoint.
2. **Codex/native MCP connection** — add a local or remote MCP server directly, or generate an explicit local/remote plugin variant.
3. **ChatGPT MCP App/connection** — owns the remote MCP endpoint and OAuth session.
4. **ChatGPT connection-bound plugin variant** — binds the plugin to the platform-generated technical ID of that existing MCP connection through `.app.json`.

Installing the repository plugin and authenticating a remote MCP connection are separate operations. A visible `@GitLab Self-Hosted` plugin does **not** automatically discover or attach a user-specific MCP connection.

## Which setup path should I use?

### Codex / native MCP: direct remote server

```text
Codex / native MCP client
  -> Add server
  -> Streamable HTTP
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
  -> GitLab REST API v4
```

This path does not require `.app.json` or a generated ChatGPT plugin variant.

### Explicit local Codex variant

If the bundled MCP server runs on the same machine as Codex:

```bash
python3 scripts/build_local_variant.py
```

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

Only that generated artifact contains:

```text
.mcp.json -> http://127.0.0.1:3333/mcp
```

### Explicit remote MCP plugin variant

If the plugin reference itself should load a user-selected remote MCP server:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install the generated marketplace and use:

```text
gitlab-self-hosted@ademkao-gitlab-remote
```

The helper validates the public HTTPS `/mcp` endpoint and writes it only into the generated artifact. It does not edit the committed portable plugin.

### ChatGPT: existing MCP connection + connection-bound plugin

```text
ChatGPT MCP App/connection
  -> configured endpoint: https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> scanned GitLab tools
  -> platform-generated technical ID

GitLab Self-Hosted plugin
  -> gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> .app.json
  -> existing MCP connection technical ID
```

The generated plugin contains `apps: "./.app.json"` but no direct MCP server definition.

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

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor validates the public HTTPS URL, rejects non-public DNS targets, fetches Protected Resource Metadata and Authorization Server Metadata, verifies issuer consistency, and confirms that unauthenticated `/mcp` returns `401` with an OAuth `WWW-Authenticate` challenge containing `resource_metadata`.

A successful doctor/OAuth result proves the remote MCP authentication path. It does **not** prove that a particular plugin reference is bound to that connection.

## 4. Add the server directly in Codex / native MCP

1. Open **MCP servers**.
2. Choose **Add server**.
3. Choose **Streamable HTTP**.
4. Enter `https://gitlab-mcp.example.com/mcp`.
5. Save/restart when requested.
6. Choose **Authenticate** when OAuth sign-in is shown.
7. Complete GitLab browser authorization.
8. Verify a harmless read before enabling write policy.

Smoke test:

```text
List the GitLab groups and projects I can access.
```

## 5. Configure ChatGPT and bind the plugin

The exact labels and availability of custom MCP configuration are controlled by the ChatGPT plan/workspace and can change independently of this repository. Where the platform exposes custom MCP Apps/connections, use this sequence:

1. Create/connect the remote MCP endpoint in the ChatGPT platform UI.
2. Enter the desired public HTTPS endpoint, for example `https://gitlab-mcp.example.com/mcp`.
3. Complete OAuth.
4. Scan/refresh tools and verify that the underlying connection exposes the GitLab tools.
5. Copy the platform-generated **technical ID** for that MCP App/connection exactly. Do not substitute the plugin name, marketplace name, MCP URL, or GitLab OAuth client ID.
6. Generate the connection-bound marketplace:

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_CHATGPT_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

For backwards compatibility, `--app-id` is accepted as an alias for `--connection-id`.

The `--mcp-url` value is validated and recorded as the endpoint expected on the existing connection. The actual plugin dependency is the connection technical ID.

Default output:

```text
dist/gitlab-chatgpt-marketplace/
  .agents/plugins/marketplace.json
  README.md
  plugins/gitlab-self-hosted/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

Use:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

The generated ChatGPT plugin:

- has `apps: "./.app.json"`;
- has no `mcpServers` entry;
- has no `.mcp.json`;
- uses the namespaced `gitlab-self-hosted` binding key;
- records both `connection_id` and the expected MCP URL in `.chatgpt-setup.json`;
- explicitly records that it does not create the connection or run OAuth.

Generating the directory does not modify an already-installed plugin. Import/install the generated marketplace explicitly.

## 6. Troubleshooting: plugin is visible but GitLab tools are missing

Check the package and binding path before repeatedly re-running OAuth.

```text
Deprecated:
  gitlab@ademkao-codex-plugins
  -> generic id; may resolve to curated GitLab

Portable:
  gitlab-self-hosted@ademkao-codex-plugins
  -> workflow plugin only
  -> no implicit MCP endpoint or connection binding

Local:
  gitlab-self-hosted@ademkao-gitlab-local
  -> http://127.0.0.1:3333/mcp

Remote direct:
  gitlab-self-hosted@ademkao-gitlab-remote
  -> explicit user-selected HTTPS /mcp

ChatGPT connection-bound:
  gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> existing MCP App/connection technical ID
  -> endpoint/OAuth belong to that connection
```

A browser message such as `Authentication complete. You may close this window.` proves that the OAuth callback reached the MCP client. It still does not prove that the portable plugin is bound to that authenticated connection.

If OAuth succeeds but the conversation still has no GitLab tools:

1. confirm that the underlying MCP connection itself exposes/scans the expected GitLab tools;
2. confirm you copied the technical ID from that same connection;
3. inspect generated `plugins/gitlab-self-hosted/.app.json` and confirm its `id` matches exactly;
4. confirm the installed plugin is `gitlab-self-hosted@ademkao-gitlab-chatgpt`, not the portable `@ademkao-codex-plugins` package; and
5. reinstall/import the generated marketplace if the portable plugin was already installed before binding.

Re-running OAuth alone does not add a binding to the portable package.

## 7. Managed workspace App Templates

Managed workspace App Templates are a separate platform feature. This repository does **not** currently ship or claim to be a managed App Template. `.app.json.example` and `build_chatgpt_variant.py` are connection-binding helpers only.

## Remote URL safety

The remote and ChatGPT binding helpers reject non-HTTPS URLs, localhost/private targets, embedded credentials, query strings/fragments, and endpoints that do not use `/mcp`. The live doctor additionally resolves DNS and rejects non-public addresses before making HTTP requests.

## CIMD / DCR

v0.5+ prefers Client ID Metadata Documents (CIMD) for MCP clients that support URL-based client metadata. Dynamic Client Registration (DCR) remains available for compatibility.

Native loopback clients may advertise a portless redirect URI such as `http://127.0.0.1/callback/<client-id>` or `http://localhost/callback/<client-id>` and then choose an ephemeral port for the actual authorization request. The server allows that dynamic port only when the registered URI is portless, both URIs use `http`, the loopback host/path match exactly, the requested port is valid and non-zero, and neither URI contains credentials, a query string, or a fragment. Public redirects and explicitly ported loopback redirects remain exact-match only.

## Read vs write

Read-only deployment:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Enable writes with `GITLAB_WRITE_ENABLED=true`; the user must also authorize `gitlab:write`. MR merge remains disabled until `GITLAB_MERGE_ENABLED=true`. OAuth scope, deployment policy, project allowlist, and GitLab permissions must all allow the action.

## Product support

OpenAI controls which plans, workspace roles, and ChatGPT/Codex surfaces expose custom MCP Apps/connections, managed templates, and write-capable tools. Those platform capabilities can change independently of this repository, so verify current OpenAI product documentation when deploying.