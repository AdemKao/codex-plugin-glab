---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, a Codex remote MCP server must be added, ChatGPT app binding is missing, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration before repository work. Keep these layers separate:

- direct Codex/native MCP server configuration;
- the repository root portable marketplace/local fallback; and
- the generated ChatGPT App-bound marketplace.

A remote MCP server that works on its own does not automatically become the `@GitLab` plugin's tool binding.

## Choose the client path first

### Codex / native MCP remote server

Use the client's MCP settings directly when the goal is to make GitLab MCP tools available to Codex/native MCP usage:

1. deploy the bundled MCP server behind public HTTPS;
2. use `MCP_AUTH_MODE=oauth` for per-user identity;
3. validate `https://<host>/mcp` with `scripts/chatgpt_mcp_doctor.py`;
4. open MCP settings and choose **Add server**;
5. choose **Streamable HTTP**;
6. enter the remote HTTPS `/mcp` URL;
7. save/restart if requested;
8. choose **Authenticate** and complete OAuth discovery / GitLab authorization; and
9. test a harmless read.

This path does not require `.app.json` or `build_chatgpt_variant.py`.

### Portable root marketplace / local Codex fallback

The repository root marketplace `ademkao-codex-plugins` selects the portable source plugin. That plugin intentionally contains:

```text
./.mcp.json -> http://127.0.0.1:3333/mcp
```

Use this only when the bundled MCP server runs on the same Codex host. Do not replace the source file with a maintainer/private public deployment URL merely to make remote OAuth work.

### ChatGPT `@GitLab` with remote MCP

Installing `gitlab@ademkao-codex-plugins` gives `@GitLab` the portable source package and its localhost MCP dependency. Adding and authenticating another remote MCP server separately does **not** replace that dependency.

For `@GitLab` to expose tools from a remote deployment:

1. create/connect a ChatGPT App/connector that points at the remote HTTPS `/mcp` endpoint;
2. complete OAuth for that App/connector;
3. obtain the existing App/connector ID;
4. build the generated marketplace:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id <existing-chatgpt-app-or-connector-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

5. import/install the generated marketplace root under `dist/gitlab-chatgpt-marketplace/`.

The generated marketplace name is `ademkao-gitlab-chatgpt`; the generated plugin reference is:

```text
gitlab@ademkao-gitlab-chatgpt
```

The generated plugin must contain `apps: "./.app.json"`, must not contain `mcpServers`, and must not contain `.mcp.json`.

## Authentication

### Shared-token

Use for trusted single-user/service-identity deployments:

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=<secret-from-secure-store>
MCP_AUTH_TOKEN=<separate-mcp-bearer>
```

Never ask the user to paste a real GitLab token into chat.

### Per-user OAuth

Use when every MCP user should keep their own GitLab permissions:

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=<gitlab-oauth-app-id>
GITLAB_OAUTH_CLIENT_SECRET=<secret-store>
OAUTH_ENCRYPTION_KEY=<base64-32-byte-key>
```

GitLab OAuth Application callback:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

The server uses PKCE S256 downstream and independently upstream to GitLab.

## OAuth persistence

One MCP replica:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Multiple replicas / production HA:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

Use the same `OAUTH_ENCRYPTION_KEY` across replicas and store it separately from database backups. Never share the writable file store between replicas.

## Safety policy

Start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` to restrict projects. OAuth write operations additionally require `gitlab:write`. OAuth scope never overrides write/merge flags, allowlists, or GitLab permissions.

## Verify server setup

Before declaring the deployment ready:

1. verify `/healthz`;
2. verify the public endpoint is HTTPS for remote use;
3. in OAuth mode verify Protected Resource Metadata and Authorization Server Metadata;
4. verify unauthenticated `/mcp` returns `401` with OAuth discovery metadata;
5. verify CIMD or DCR according to the client;
6. run the live doctor; and
7. verify a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

Do not validate authentication by creating, updating, merging, canceling, or deleting content.

## Troubleshooting: OAuth succeeds but `@GitLab` has no tools

Treat this as a binding/package-selection problem before changing OAuth settings when:

- the remote MCP server is present in MCP settings;
- OAuth completed successfully;
- the GitLab plugin is installed and its skills are visible; and
- the ChatGPT conversation still cannot see GitLab tools.

Broken state:

```text
Installed: gitlab@ademkao-codex-plugins
  -> packaged mcpServers
  -> http://127.0.0.1:3333/mcp

Separate MCP entry
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth succeeds
```

Intended remote ChatGPT state:

```text
Installed: gitlab@ademkao-gitlab-chatgpt
  -> apps: ./.app.json
  -> existing connected App/connector
  -> remote HTTPS /mcp
```

Do not keep retrying OAuth when the installed package is still the portable root marketplace. Generate/import the App-bound marketplace instead.

## Remote URL safety

The workspace binding helper rejects non-HTTPS, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints. The live doctor also resolves DNS and rejects non-public addresses before HTTP requests.

## Local repository operations

For local working-tree state, commit, and push, use local `git` / `glab` rather than trying to model local filesystem mutation through the remote MCP server.

```bash
glab auth status
```

## GitLab.com / Self-Managed / Dedicated

Resolve the intended GitLab host explicitly:

```bash
GITLAB_HOST=https://<gitlab-host>
```

In OAuth mode, create the GitLab OAuth Application on that same GitLab instance. Do not silently send private project identifiers to `gitlab.com` when the intended host is different.

## Managed workspace App Templates

OpenAI managed workspace App Templates are a separate administrator-oriented platform feature. This repository's `.app.json.example` and builder are workspace binding helpers only; they do not create, publish, or substitute for a managed App Template.
