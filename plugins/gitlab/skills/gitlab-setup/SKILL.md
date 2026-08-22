---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, ChatGPT app binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration path before repository work. The primary remote path is the self-hosted MCP server bundled with this repository; GitLab native MCP is optional.

## Primary backend

Run or deploy `packages/mcp-server` and point the plugin/client to its MCP endpoint.

Local Codex default:

`http://127.0.0.1:3333/mcp`

Remote ChatGPT example:

`https://gitlab-mcp.example.com/mcp`

The MCP server talks to GitLab REST API v4 and supports GitLab.com plus compatible Self-Managed/Dedicated hosts without requiring GitLab native MCP.

## Choose the authentication mode

### Shared-token

Use for a trusted single-user/service-identity deployment:

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=<secret-from-secure-store>
MCP_AUTH_TOKEN=<separate-mcp-bearer>
```

Do not ask users to paste a real GitLab token into chat. Configure tokens through environment/secret-management facilities.

### Per-user OAuth

Use for a multi-user ChatGPT/Codex/remote-MCP deployment where each user should keep their own GitLab permissions:

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=<gitlab-oauth-app-id>
GITLAB_OAUTH_CLIENT_SECRET=<secret-store>
OAUTH_ENCRYPTION_KEY=<base64-32-byte-key>
OAUTH_STORE_PATH=/data/oauth-store.json
```

Create a GitLab OAuth Application with callback:

`https://gitlab-mcp.example.com/oauth/gitlab/callback`

OAuth mode exposes MCP Protected Resource Metadata and authorization-server discovery. Compatible clients should discover OAuth from an unauthenticated `/mcp` `401` rather than receiving a PAT from the user.

The server uses PKCE S256 for both the downstream MCP authorization-code flow and the upstream GitLab authorization-code flow.

## Safety policy

Start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` when a deployment should be restricted to specific projects.

In OAuth mode, write operations additionally require the user's `gitlab:write` OAuth scope. OAuth scope never overrides write/merge flags, project allowlists, or GitLab's own permissions.

## Codex path

The bundled `.mcp.json` targets `http://127.0.0.1:3333/mcp`.

Before declaring setup complete:

1. start the MCP server;
2. verify `/healthz`;
3. verify MCP tool discovery;
4. for OAuth, verify `/.well-known/oauth-protected-resource` and an unauthenticated `/mcp` returns `401` with OAuth discovery metadata;
5. run a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

For local working-tree tasks, `git` and `glab` remain useful:

```bash
glab auth status
```

Use local `git` / `glab` for working-tree state, commit, push, and explicit capability gaps.

## ChatGPT path

For per-user ChatGPT GitLab access:

1. deploy the bundled MCP server behind HTTPS;
2. use `MCP_AUTH_MODE=oauth`;
3. configure the GitLab OAuth Application and callback;
4. create the ChatGPT Custom MCP App pointing to the deployed `/mcp` URL;
5. let the client discover/start OAuth;
6. authorize GitLab in the browser consent flow;
7. test harmless reads before enabling writes.

If workspace-specific plugin/app packaging is needed:

```bash
python3 scripts/build_chatgpt_variant.py --app-id <workspace-app-or-connector-id>
```

Do not add workspace-specific IDs or credentials to the portable source plugin.

ChatGPT plan, workspace-role, and surface support are controlled by OpenAI and can change independently of this repository.

## OAuth persistence

The v0.4 built-in OAuth store is encrypted and persistent but file-based/single-node.

- Protect `OAUTH_ENCRYPTION_KEY` separately from the store.
- Do not expose or commit the store.
- Do not mount one writable store into multiple MCP replicas.
- Existing OAuth sessions become unreadable if the encryption key is changed without migration.

## GitLab.com / Self-Managed / Dedicated

Resolve the intended GitLab host from the user's URL, deployment configuration, or local remote:

```bash
GITLAB_HOST=https://<gitlab-host>
```

For OAuth mode, the GitLab OAuth Application must exist on that same GitLab instance.

Do not silently send private project identifiers to `gitlab.com` when the intended remote belongs to another host. Self-Managed compatibility depends on the GitLab version and REST APIs used by each tool.

## Optional GitLab native MCP

GitLab native MCP can still be used independently when the target environment supports it and the user deliberately chooses it. It is not a dependency of this project's self-hosted server architecture.

## Verification

Before declaring setup complete, verify the expected identity with a harmless read. Do not validate authentication by creating, updating, merging, or deleting content.
