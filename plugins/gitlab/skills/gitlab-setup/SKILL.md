---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, ChatGPT app binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration before repository work. The primary remote path is the self-hosted MCP server bundled with this repository; GitLab native MCP is optional.

## MCP endpoint

Local Codex default:

`http://127.0.0.1:3333/mcp`

Remote ChatGPT example:

`https://gitlab-mcp.example.com/mcp`

The portable source `.mcp.json` intentionally stays on localhost for Codex. Do not replace it with a maintainer/private deployment URL just to make ChatGPT work.

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

Use when every MCP/ChatGPT user should keep their own GitLab permissions:

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

## Verify server setup

Before declaring the MCP deployment ready:

1. verify `/healthz`;
2. verify tool discovery;
3. OAuth mode: verify Protected Resource Metadata and Authorization Server Metadata;
4. unauthenticated `/mcp` must return `401` with OAuth discovery metadata;
5. verify CIMD metadata support or DCR according to the client;
6. run a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

Do not validate authentication by creating, updating, merging, canceling, or deleting content.

## ChatGPT path

For per-user ChatGPT access:

1. deploy the bundled MCP server behind public HTTPS;
2. use `MCP_AUTH_MODE=oauth`;
3. configure a GitLab OAuth Application;
4. use PostgreSQL store when deploying multiple MCP replicas;
5. run the live deployment doctor:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

6. in a ChatGPT workspace/surface that supports Custom MCP Apps, explicitly create/connect a Custom MCP App pointing at the same `/mcp` URL and complete the platform user/admin consent flow;
7. obtain the workspace App/connector ID;
8. build the workspace-specific plugin variant:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id <workspace-app-or-connector-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

9. install/use the generated ignored `dist/gitlab-chatgpt/` variant as appropriate for the target workspace;
10. test harmless reads before enabling writes.

Do not claim that installing the portable plugin silently creates an arbitrary ChatGPT Custom MCP App. App creation and authorization are explicit platform consent boundaries. Do not commit generated workspace App IDs, `.chatgpt-setup.json`, or other `dist/` output.

ChatGPT plan/workspace/surface support is controlled by OpenAI and can change independently of this repository.

## Remote URL safety

The ChatGPT binding builder must reject non-HTTPS, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints. The live doctor also resolves DNS and rejects resolved non-public addresses before HTTP requests.

## Codex / local path

The bundled `.mcp.json` targets the local MCP endpoint. For local working-tree state, commit, and push, use local `git` / `glab` rather than trying to model local filesystem mutation through the remote MCP server.

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
