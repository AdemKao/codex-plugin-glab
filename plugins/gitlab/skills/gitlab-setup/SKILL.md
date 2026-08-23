---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, a Codex remote server must be added, ChatGPT workspace binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration before repository work. The primary remote path is the self-hosted MCP server bundled with this repository; GitLab native MCP is optional.

## Choose the client path first

### Personal / Codex remote MCP — preferred remote install

For a personal Codex setup using a remotely deployed server:

1. deploy the bundled MCP server behind public HTTPS;
2. in Codex, choose **Add server**;
3. choose the remote HTTP/HTTPS MCP option;
4. enter the exact endpoint, for example `https://gitlab-mcp.example.com/mcp`;
5. let the client follow MCP OAuth discovery from the unauthenticated `401` challenge and Protected Resource Metadata;
6. complete the browser GitLab OAuth flow;
7. verify a harmless read before enabling writes.

Do not paste a GitLab PAT into the client when using per-user OAuth. The client talks to the MCP OAuth boundary and the server keeps GitLab OAuth credentials server-side.

### Local Codex fallback

The portable source plugin intentionally keeps:

`plugins/gitlab/.mcp.json` -> `http://127.0.0.1:3333/mcp`

Use this when Codex and the MCP server run on the same machine. Keep this localhost configuration as a local fallback; do not replace it with a maintainer/private deployment URL just to make remote clients work.

### ChatGPT managed workspace

A managed ChatGPT workspace can have a platform-admin App/connector provisioning flow, including an OpenAI-managed App Template workflow where available. That is a platform feature and is separate from this repository.

This repository does **not** publish, generate, or emulate an OpenAI-native managed workspace App Template. If the workspace already has an App/connector ID, `scripts/build_chatgpt_variant.py` can produce a workspace-specific plugin binding helper around that existing ID.

## MCP endpoint

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

Use when every remote MCP user should keep their own GitLab permissions:

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

Prefer CIMD when the client supports it. For older clients keep DCR enabled. Do not enable private-network CIMD unless the environment intentionally hosts client metadata there; prefer a narrow hostname allowlist.

## Safety policy

Start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` to restrict projects. OAuth write operations additionally require `gitlab:write`. OAuth scope never overrides write/merge flags, allowlists, or GitLab permissions.

## Verify remote server setup

Before declaring a remote MCP deployment ready:

1. verify `/healthz`;
2. verify Protected Resource Metadata and Authorization Server Metadata;
3. unauthenticated `/mcp` must return `401` with `WWW-Authenticate` and `resource_metadata`;
4. verify CIMD metadata support or DCR according to the client;
5. run the live remote doctor:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

6. use **Add server -> remote HTTPS `/mcp` -> OAuth discovery** in the personal/Codex client;
7. verify a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

Do not validate authentication by creating, updating, merging, canceling, or deleting content.

## ChatGPT workspace binding helper

Only use this helper after the target workspace App/connector already exists and you have its ID:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id <existing-workspace-app-or-connector-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

It generates ignored `dist/gitlab-chatgpt/` output containing `.app.json`, a patched plugin manifest, and `.chatgpt-setup.json` metadata. The source `workspace-binding/.app.json.example` is an example consumed by this helper; it is **not** an OpenAI-native App Template.

Do not claim that installing the portable plugin silently creates a ChatGPT Custom MCP App or managed App Template. App provisioning and authorization remain explicit platform user/admin boundaries. Do not commit generated workspace IDs or `dist/` output.

## Managed workspace App Template

When a managed ChatGPT workspace supports an admin-controlled App Template/provisioning feature, configure that through the OpenAI workspace/admin surface and point it at the same validated public HTTPS `/mcp` endpoint. This repository documents compatibility with that path but does not define the platform template format or lifecycle.

ChatGPT plan/workspace/surface support is controlled by OpenAI and can change independently of this repository.

## Remote URL safety

The workspace binding helper rejects non-HTTPS, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints. The live doctor also resolves DNS and rejects resolved non-public addresses before HTTP requests.

## Codex / local working tree

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
