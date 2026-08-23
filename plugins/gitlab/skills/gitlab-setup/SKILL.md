---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, a Codex remote MCP server must be added, ChatGPT app binding is missing, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration before repository work. Keep Codex/native MCP configuration and ChatGPT plugin App binding as separate layers: a remote MCP server that works on its own does not automatically become the `@GitLab` plugin's tool binding.

## Choose the client path first

### Codex / native MCP remote server

Use the client's MCP settings directly when the goal is to make GitLab MCP tools available to Codex/native MCP usage:

1. deploy the bundled MCP server behind public HTTPS;
2. use `MCP_AUTH_MODE=oauth` for per-user identity;
3. validate `https://<host>/mcp` with the repository doctor;
4. open MCP settings and choose **Add server**;
5. choose **Streamable HTTP**;
6. enter the remote HTTPS `/mcp` URL;
7. save/restart if requested;
8. choose **Authenticate** and complete OAuth discovery / GitLab authorization; and
9. test a harmless read.

This direct MCP path does not require `.app.json` or `build_chatgpt_variant.py` when the remote MCP server itself is the capability being invoked.

### ChatGPT `@GitLab` plugin with remote MCP

ChatGPT plugin invocation has an additional binding requirement. Installing this source plugin gives it the packaged `mcpServers` dependency from `./.mcp.json`, which intentionally points at localhost for same-host Codex use. Adding and authenticating another remote MCP server separately does **not** replace that packaged dependency.

For `@GitLab` to expose tools from a remote deployment:

1. create/connect the ChatGPT App / connector that points at the remote HTTPS `/mcp` endpoint;
2. complete OAuth for that App/connector;
3. obtain the existing App/connector ID;
4. build the ChatGPT-bound plugin variant with `scripts/build_chatgpt_variant.py`;
5. install/use that generated variant.

The generated ChatGPT-bound variant uses `apps: "./.app.json"`, removes `mcpServers`, and removes the copied localhost `.mcp.json`, so it cannot accidentally keep the local fallback as a competing dependency.

### Local Codex fallback

The portable source `.mcp.json` intentionally stays on:

`http://127.0.0.1:3333/mcp`

Use it when the bundled server runs locally on the same Codex host. Do not replace the source file with a maintainer/private public deployment URL merely to make remote OAuth work.

### Managed workspace

Managed workspace app administration and managed App Templates are platform flows. Treat them separately from the repository's optional workspace binding helper.

### Optional workspace binding helper

`plugins/gitlab/workspace-binding/.app.json.example` and `scripts/build_chatgpt_variant.py` only bind an existing workspace app/connector ID into an ignored plugin copy. They are **not** an OpenAI managed App Template and do not create or publish an app.

## MCP endpoints

Local fallback:

`http://127.0.0.1:3333/mcp`

Remote example:

`https://gitlab-mcp.example.com/mcp`

## Choose authentication

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

`https://gitlab-mcp.example.com/oauth/gitlab/callback`

The server uses PKCE S256 downstream and independently upstream to GitLab.

## Choose OAuth persistence

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

## MCP OAuth client registration

Prefer CIMD when the client supports it. Keep DCR enabled as a compatibility fallback. Do not enable private-network CIMD unless the environment intentionally hosts client metadata there; prefer a narrow hostname allowlist.

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
3. OAuth mode: verify Protected Resource Metadata and Authorization Server Metadata;
4. unauthenticated `/mcp` must return `401` with OAuth discovery metadata;
5. verify CIMD support or DCR according to the client;
6. run the live doctor for a remote deployment; and
7. verify a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

Do not validate authentication by creating, updating, merging, canceling, or deleting content.

## Remote doctor

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor checks the public HTTPS URL, DNS/public-address safety, Protected Resource Metadata, Authorization Server Metadata, and the unauthenticated OAuth challenge.

## Troubleshooting: OAuth succeeds but `@GitLab` has no tools

Treat this as a binding problem before changing OAuth settings when all of the following are true:

- the remote MCP server is present in MCP settings;
- OAuth completed successfully;
- the GitLab plugin is installed and its skills are visible; and
- the ChatGPT conversation still cannot see GitLab tools.

Check the plugin details. If the plugin shows its packaged **MCP server** from the portable source plugin while the working remote server exists as a separate MCP entry, the two are not automatically linked. Do not keep retrying OAuth.

Use the App-binding path instead:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id <existing-chatgpt-app-or-connector-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The generated manifest must contain `apps: "./.app.json"` and must not contain `mcpServers`; the generated directory must not contain `.mcp.json`.

## Optional existing-workspace binding

Only when an app/connector ID already exists:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id <existing-workspace-app-or-connector-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The ignored generated output is a workspace binding helper. It must identify itself as helper-only and not as an OpenAI managed App Template. Do not commit generated workspace IDs, `.chatgpt-setup.json`, or `dist/` output.

Do not claim that the helper creates, publishes, installs, or substitutes for a managed workspace App Template.

## Managed workspace App Templates

OpenAI managed workspace App Templates are a separate administrator-oriented platform feature. They can provide guided configuration, create a workspace draft app, and then allow admins to review, publish, and manage access/actions.

This repository does not currently ship an OpenAI managed App Template. If a managed GitLab template is offered by the platform, follow that workspace administration flow separately from this repository's helper.

## Remote URL safety

The workspace binding helper must reject non-HTTPS, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints. The live doctor also resolves DNS and rejects resolved non-public addresses before HTTP requests.

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

## Optional GitLab native MCP

GitLab native MCP can still be used independently when available and deliberately selected. It is not a dependency of this self-hosted server architecture.
