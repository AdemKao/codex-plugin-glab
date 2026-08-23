---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, a personal/Codex remote MCP server must be added, workspace binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration before repository work. The primary remote path is the self-hosted MCP server bundled with this repository; GitLab native MCP is optional.

## Choose the client path first

### Personal / Codex remote MCP — primary path

Use the client's MCP settings directly:

1. deploy the bundled MCP server behind public HTTPS;
2. use `MCP_AUTH_MODE=oauth` for per-user identity;
3. validate `https://<host>/mcp` with the repository doctor;
4. open MCP settings and choose **Add server**;
5. choose **Streamable HTTP**;
6. enter the remote HTTPS `/mcp` URL;
7. save/restart if requested;
8. choose **Authenticate** and complete OAuth discovery / GitLab authorization; and
9. test a harmless read.

Do not require `.app.json`, `build_chatgpt_variant.py`, or an App Template for this direct personal/Codex path.

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

## Personal / Codex installation

After the doctor passes:

1. open the ChatGPT desktop / Codex MCP settings;
2. choose **Add server**;
3. choose **Streamable HTTP**;
4. enter `https://gitlab-mcp.example.com/mcp`;
5. save and restart if requested;
6. choose **Authenticate** when OAuth is offered;
7. complete GitLab OAuth; and
8. test harmless reads before enabling writes.

If a client cannot complete OAuth discovery, inspect the `401` challenge and discovery metadata before changing server security settings.

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
