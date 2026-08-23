# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

For self-hosted GitLab access, deploy the bundled MCP server behind HTTPS. In per-user OAuth mode, each user authorizes their own GitLab identity; the MCP client receives MCP credentials rather than a GitLab PAT.

## The important distinction

There are three different pieces that must not be conflated:

1. **Codex / native MCP server configuration** — adding `https://gitlab-mcp.example.com/mcp` directly makes that remote MCP server available to the MCP client.
2. **Portable repository marketplace** — `ademkao-codex-plugins` installs `plugins/gitlab`, whose packaged `.mcp.json` intentionally targets `http://127.0.0.1:3333/mcp` as a same-host Codex fallback.
3. **ChatGPT `@GitLab` App binding** — the plugin must explicitly depend on the connected ChatGPT App/connector that owns the remote MCP connection.

A remote MCP server that is added and authenticated separately does **not** automatically replace the portable source plugin's packaged localhost MCP dependency. OAuth can therefore succeed while `@GitLab` still exposes no GitLab tools.

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

### ChatGPT `@GitLab`: generated App-bound marketplace

Use this when you want the GitLab plugin mention and skills to expose tools from the remote MCP deployment:

```text
ChatGPT plugin
  -> generated marketplace
  -> .app.json binding
  -> existing ChatGPT App / connector
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> GitLab REST API v4
```

The App/connector must already exist and point to the remote MCP endpoint. The generated ChatGPT marketplace removes the source `mcpServers` entry and copied `.mcp.json`, so the localhost fallback cannot compete with the App binding.

### Local development: localhost fallback

The portable source plugin intentionally keeps:

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

Use this only when the bundled MCP server runs on the same machine as the Codex client. Local `git` / `glab` remains responsible for working-tree state, commits, and pushes.

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

The doctor validates the public HTTPS URL, rejects non-public DNS targets, fetches Protected Resource Metadata and Authorization Server Metadata, verifies issuer consistency, and confirms that unauthenticated `/mcp` returns `401` with an OAuth `WWW-Authenticate` challenge containing `resource_metadata`.

A successful doctor/OAuth result proves the remote MCP authentication path. It does **not** prove that an installed ChatGPT plugin is bound to that remote server.

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

The result should reflect the GitLab account that completed OAuth.

## 5. Bind the remote server to `@GitLab` in ChatGPT

Adding the remote MCP server separately is not enough to replace the source plugin's packaged dependency.

First create/connect a ChatGPT App/connector for the remote MCP endpoint through the platform UI and complete OAuth. Then obtain that existing App/connector ID and build the workspace-specific marketplace artifact:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Default output:

```text
dist/gitlab-chatgpt-marketplace/
  .agents/plugins/marketplace.json
  plugins/gitlab/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

The generated marketplace is named `ademkao-gitlab-chatgpt`; its plugin reference is:

```text
gitlab@ademkao-gitlab-chatgpt
```

The generated plugin intentionally differs from the portable source plugin:

- `.codex-plugin/plugin.json` contains `apps: "./.app.json"`;
- `.codex-plugin/plugin.json` does **not** contain `mcpServers`;
- `plugins/gitlab/.mcp.json` is absent from the generated artifact;
- `.chatgpt-setup.json` records `artifact_type: "chatgpt-marketplace"`, `binding_mode: "app"`, the generated marketplace/plugin reference, and `source_local_mcp_removed: true`.

When you want `@GitLab` to use the remote App, import/install the **generated marketplace root**. Do not install the repository root `ademkao-codex-plugins` marketplace for this use case, because that root marketplace intentionally selects the portable localhost-oriented source plugin.

The generated output is workspace-specific and gitignored. Do not commit a real workspace App/connector binding to the public repository.

## 6. Troubleshooting: OAuth succeeds but `@GitLab` exposes no tools

If all of these are true:

- the remote MCP server is visible in MCP settings;
- OAuth completed successfully;
- the GitLab plugin and skills are installed; and
- the conversation cannot call GitLab tools;

check the **installed marketplace/plugin binding** before changing OAuth settings.

A common broken state is:

```text
Installed: gitlab@ademkao-codex-plugins
  -> packaged mcpServers
  -> http://127.0.0.1:3333/mcp

Separate MCP entry
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth succeeds
```

Those are separate bindings. The working remote MCP entry does not implicitly replace the plugin's localhost dependency.

The intended remote ChatGPT state is:

```text
Installed: gitlab@ademkao-gitlab-chatgpt
  -> apps: ./.app.json
  -> existing connected App / connector
  -> https://gitlab-mcp.example.com/mcp
```

If the generated ChatGPT plugin still contains `mcpServers` or `.mcp.json`, rebuild it with the current helper. If ChatGPT is still using `gitlab@ademkao-codex-plugins`, switch to/import the generated marketplace rather than re-running OAuth against the separate MCP entry.

## 7. Managed workspace App Templates

OpenAI managed workspace **App Templates** are a separate platform feature intended for workspace administration. A managed template can provide guided configuration, create a workspace draft app, and let workspace administrators review, publish, and control access/actions.

This repository does **not** currently ship or claim to be an OpenAI managed App Template. The repository's `.app.json.example` and `build_chatgpt_variant.py` are workspace binding helpers only.

If an OpenAI-managed GitLab App Template becomes available for a target workspace, follow that workspace's Apps / administration flow independently.

## Remote URL safety

The workspace binding helper rejects non-HTTPS URLs, localhost/private targets, embedded credentials, query strings or fragments, and endpoints that do not use `/mcp`. The live doctor additionally resolves DNS and rejects non-public addresses before making HTTP requests.

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

OpenAI controls which plans, workspace roles, and ChatGPT/Codex surfaces expose MCP server configuration, managed Apps, App Templates, and write-capable tools. Those platform capabilities can change independently of this repository, so verify current platform documentation when deploying.
