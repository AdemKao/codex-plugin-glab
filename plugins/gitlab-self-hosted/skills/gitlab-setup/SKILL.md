---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this self-hosted plugin. Use when authentication fails, MCP tools are missing, a user/workspace remote MCP endpoint must be configured, ChatGPT app binding is missing, plugin resolution is ambiguous, or the GitLab host must be verified.
---

# GitLab Self-Hosted Setup

## Goal

Use the public `gitlab-self-hosted` plugin without exposing a maintainer-specific MCP deployment and without requiring a local MCP process for normal remote use.

Keep these layers separate:

- **plugin package** — workflow skills and metadata;
- **remote MCP connection** — the user/workspace-selected HTTPS `/mcp` endpoint plus OAuth session;
- **optional ChatGPT app dependency** — required only on surfaces that explicitly require the plugin to bind an app/connection; and
- **localhost development fallback** — explicit local variant only.

## Package identity

Use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Do not use the generic `gitlab@ademkao-codex-plugins`; the generic identifier can collide with other GitLab integrations.

The root source plugin is endpoint-neutral. It must not contain a committed active `.mcp.json`, `mcpServers`, `.app.json`, or `apps` binding.

## Normal remote setup — no build variant

For clients that support a custom remote MCP server directly:

1. Install the repository marketplace root.
2. Ask the user/workspace administrator for the intended public HTTPS MCP endpoint. Do not assume a maintainer endpoint.
3. Configure that endpoint in the client's MCP/App settings. Example shape only:

   ```text
   https://gitlab-mcp.example.com/mcp
   ```

4. Complete OAuth discovery and GitLab authorization.
5. Refresh or scan tools when the client supports it.
6. Verify a harmless read such as current user, groups, or projects.
7. Keep write and merge policy disabled until read access is proven.

This normal path does not require `build_personal_variant.py`, `build_chatgpt_variant.py`, a second repository, or a local MCP process.

## Do not fake install-time URL variables

Agent Plugin HTTP MCP configuration requires a literal absolute HTTP/HTTPS URL. Do not put `${GITLAB_MCP_URL}` or a similar arbitrary placeholder into an automatically loaded HTTP MCP `url` and claim it is user-configurable at install time.

The committed neutral reference is:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

It is documentation/reference only. The actual organization endpoint belongs in the user's or workspace's client configuration.

Never ask a user to replace the committed example with a private production hostname in the public repository.

## ChatGPT app dependency

A successful MCP OAuth callback proves authentication to that MCP connection. It does not necessarily prove that the installed plugin declares that same connection as an app dependency.

If the ChatGPT surface exposes the configured MCP tools directly, use the user/workspace connection and continue without a generated variant.

If the surface requires the plugin itself to bind an app:

1. check whether the workspace has a canonical portable app/connector ID or an admin-configured managed App Template;
2. if neither exists, do not invent a portable technical ID;
3. for backwards compatibility only, an existing connection can be bound with `scripts/build_chatgpt_variant.py`, but this is not the default path.

Do not solve missing app binding by committing a private MCP hostname or workspace-specific connection ID.

## Authentication modes

### Per-user OAuth — preferred for interactive remote use

Create a GitLab OAuth Application on the same GitLab instance that users will access. Callback example:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Server configuration example:

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=<secret-store-value>
GITLAB_OAUTH_CLIENT_SECRET=<secret-store-value>
OAUTH_ENCRYPTION_KEY=<base64-32-byte-key>
```

Never ask the user to paste a real GitLab token, OAuth client secret, or encryption key into chat.

### Shared token

Use only for intentionally shared service identities or trusted single-user deployments:

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=<secret-store-value>
MCP_AUTH_TOKEN=<separate-mcp-bearer>
```

## OAuth persistence

Single MCP replica:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Multiple replicas / production HA:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

Use the same `OAUTH_ENCRYPTION_KEY` across replicas and keep it separate from database backups.

## Safety policy

Start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` to restrict projects. OAuth write operations additionally require `gitlab:write`. OAuth scope never overrides write/merge flags, allowlists, or GitLab permissions.

## Verify a remote deployment

Before declaring it ready:

1. verify `/healthz`;
2. verify the remote endpoint uses HTTPS;
3. verify Protected Resource Metadata and Authorization Server Metadata;
4. verify unauthenticated `/mcp` returns `401` with OAuth discovery metadata;
5. verify CIMD or DCR according to the client;
6. run:

   ```bash
   python3 scripts/chatgpt_mcp_doctor.py \
     --mcp-url https://gitlab-mcp.example.com/mcp
   ```

7. verify a harmless read.

Do not validate authentication by creating, modifying, merging, canceling, or deleting GitLab content.

## Local development fallback

Only use localhost when the MCP server intentionally runs on the same development host:

```bash
python3 scripts/build_local_variant.py
```

The generated local marketplace binds:

```text
http://127.0.0.1:3333/mcp
```

The repository root marketplace must remain endpoint-neutral.

## Troubleshooting: plugin visible, GitLab tools missing

Check in this order:

1. package identity is `gitlab-self-hosted@ademkao-codex-plugins`;
2. the intended user/workspace MCP connection points to the correct HTTPS `/mcp` URL;
3. OAuth completed for that exact connection;
4. the connection itself exposes GitLab tools;
5. the current ChatGPT/Codex surface actually exposes that connection to the plugin/conversation;
6. if explicit app dependency is required, use a portable platform binding/template when available rather than committing private infrastructure.

Re-running OAuth alone will not repair a missing plugin-to-app dependency.

## Public endpoint privacy guard

Run:

```bash
python3 scripts/validate_public_config.py
```

The validator rejects real non-example `/mcp` endpoints in public setup files, keeps localhost isolated to its development template, and confirms the root package remains endpoint-neutral.

## Local repository operations

For local working-tree state, commit, and push, use local `git` / `glab` when that local repository is available. Do not model local filesystem mutation through the remote MCP server.

## GitLab.com / Self-Managed / Dedicated

Resolve the intended GitLab host explicitly:

```bash
GITLAB_HOST=https://<gitlab-host>
```

In OAuth mode, create the GitLab OAuth Application on that same GitLab instance. Never silently send private project identifiers to `gitlab.com` when the intended host is different.
