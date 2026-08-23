---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this self-hosted plugin. Use when authentication fails, MCP tools are missing, a Codex local or remote MCP server must be configured, ChatGPT app binding is missing, plugin resolution is ambiguous, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Self-Hosted Setup

## Goal

Establish the least-privilege GitLab integration before repository work. Keep these layers separate:

- the portable workflow plugin, which is endpoint-unbound;
- an explicit Codex local or remote MCP binding; and
- a ChatGPT custom MCP App plus the generated App-bound plugin variant.

A remote MCP server that works on its own does not automatically become a plugin's tool binding.

## Package identity

Starting with v0.5.4 this repository uses the package identifier:

```text
gitlab-self-hosted
```

The old generic `gitlab` identifier collides with OpenAI's curated GitLab plugin during platform resolution. Marketplace entry name, plugin folder, and `.codex-plugin/plugin.json` name must all remain `gitlab-self-hosted`.

Portable reference:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The portable package contains skills and metadata only. It intentionally does **not** contain `mcpServers`, `.mcp.json`, or a workspace-specific App binding.

Explicit generated references:

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Do not use `gitlab@ademkao-codex-plugins` for this repository after v0.5.4.

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

This direct MCP path does not require `.app.json` or `build_chatgpt_variant.py`.

### Portable root marketplace

The repository root marketplace `ademkao-codex-plugins` selects `plugins/gitlab-self-hosted`, but that portable plugin intentionally binds **no endpoint**.

This prevents an installed plugin from silently connecting to `127.0.0.1` when the user actually intended an OCI/remote deployment. Endpoint selection is explicit and surface-specific.

### Explicit local Codex fallback

When the bundled MCP server runs on the same Codex host, generate the local variant:

```bash
python3 scripts/build_local_variant.py
```

Import/install the generated marketplace root under `dist/gitlab-local-marketplace/`. Its plugin reference is:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

That generated variant explicitly adds:

```text
./.mcp.json -> http://127.0.0.1:3333/mcp
```

The committed portable package remains unchanged.

### Explicit remote MCP plugin variant

When a plugin reference itself should bind directly to a user-selected remote MCP endpoint, generate a remote marketplace:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install the generated marketplace root. Its plugin reference is:

```text
gitlab-self-hosted@ademkao-gitlab-remote
```

The helper validates a public HTTPS `/mcp` endpoint and writes the selected URL only into the generated artifact. It does not modify the committed portable plugin.

### ChatGPT plugin with remote MCP App

In ChatGPT, the MCP endpoint belongs to the custom MCP **App configuration**, not to the portable plugin file.

1. create/connect a ChatGPT custom MCP App/connector and provide the desired remote HTTPS `/mcp` endpoint;
2. scan tools and complete OAuth for that App/connector;
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
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

The generated plugin contains `apps: "./.app.json"`, contains no `mcpServers`, and contains no `.mcp.json`. The `--mcp-url` argument is validated and recorded as the endpoint expected to already be configured on the referenced App; the plugin binding itself is by App/connector ID.

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

## Troubleshooting: plugin is visible but GitLab tools are missing

Check the package reference **and** connection binding before changing OAuth settings.

A deprecated/collision-prone state is:

```text
Installed/reference: gitlab@ademkao-codex-plugins
  -> may resolve to OpenAI curated GitLab
  -> does not uniquely identify this repository
```

The portable self-hosted package is intentionally unbound:

```text
gitlab-self-hosted@ademkao-codex-plugins
  -> skills/metadata only
  -> no implicit localhost or remote MCP endpoint
```

For local Codex:

```text
gitlab-self-hosted@ademkao-gitlab-local
  -> explicit http://127.0.0.1:3333/mcp
```

For a direct remote MCP-bound generated package:

```text
gitlab-self-hosted@ademkao-gitlab-remote
  -> explicit user-selected HTTPS /mcp
```

For ChatGPT App binding:

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> apps: ./.app.json
  -> existing connected App/connector
  -> remote HTTPS /mcp configured on that App
```

If OAuth works on a separate MCP entry but the conversation still has no GitLab tools, confirm that the plugin is actually bound through one of the explicit connection paths above. Re-running OAuth does not add a binding to the portable package.

## Remote URL safety

The remote and ChatGPT binding helpers reject non-HTTPS, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints. The live doctor also resolves DNS and rejects non-public addresses before HTTP requests.

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
