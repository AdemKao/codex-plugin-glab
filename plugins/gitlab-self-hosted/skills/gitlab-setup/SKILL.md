---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this self-hosted plugin. Use when authentication fails, MCP tools are missing, a ChatGPT App binding is missing, a remote MCP endpoint must be configured, plugin resolution is ambiguous, or the GitLab host must be verified.
---

# GitLab Self-Hosted Setup

## Goal

Use the public `gitlab-self-hosted` plugin without exposing a maintainer-specific MCP deployment and without requiring a local MCP process for normal remote use.

Keep these layers separate:

- **portable plugin package** — workflow skills and metadata; endpoint-neutral by design;
- **registered ChatGPT MCP App** — the workspace/user connection with a platform-generated `plugin_asdk_app_...` technical ID;
- **remote MCP server** — the HTTPS `/mcp` endpoint and OAuth session behind that App; and
- **localhost development fallback** — explicit local variant only.

## Package identity

Use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Do not use the generic `gitlab@ademkao-codex-plugins`; the generic identifier can collide with other GitLab integrations.

The root source plugin is endpoint-neutral. It must not contain a committed active `.mcp.json`, `mcpServers`, `.app.json`, or `apps` binding because registered App IDs are workspace-specific.

## Recommended ChatGPT setup — registered App binding

For ChatGPT plugin-backed tools:

1. Identify the intended public HTTPS MCP endpoint. Never assume a maintainer endpoint.
2. Register that endpoint in ChatGPT Developer mode as an MCP App / connection.
3. Complete OAuth discovery and GitLab authorization for that exact connection.
4. Scan/refresh tools and verify a harmless read such as current user, groups, or projects.
5. Copy the platform-generated technical ID. It must start with:

   ```text
   plugin_asdk_app_
   ```

6. Build the App-bound plugin marketplace:

   ```bash
   python3 scripts/build_chatgpt_app.py \
     --app-id plugin_asdk_app_REPLACE_ME \
     --mcp-url https://gitlab-mcp.example.com/mcp
   ```

7. Import/install the generated marketplace and use:

   ```text
   gitlab-self-hosted@ademkao-gitlab-chatgpt
   ```

The generated plugin contains `.app.json` and its manifest declares `apps: "./.app.json"`. The generated marketplace uses authentication on install.

Do not invent a `plugin_asdk_app_...` ID. Do not solve missing app binding by committing a private MCP hostname or workspace-specific connection ID to the public source plugin.

## Direct remote MCP fallback

For clients that expose custom remote MCP servers directly, the remote endpoint can still be configured without generating an App-bound marketplace. Use this for development, troubleshooting, or clients that expose the connection directly to the conversation.

Example shape only:

```text
https://gitlab-mcp.example.com/mcp
```

The committed neutral reference is:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

Never replace that public example with a private production hostname.

## Do not fake install-time URL variables

Agent Plugin HTTP MCP configuration requires a literal absolute HTTP/HTTPS URL. Do not put `${GITLAB_MCP_URL}` or a similar arbitrary placeholder into an automatically loaded HTTP MCP `url` and claim it is user-configurable at install time.

The actual organization endpoint belongs in the registered App / client configuration, not in the portable source package.

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

1. the remote MCP connection points to the intended HTTPS `/mcp` URL;
2. OAuth completed for that exact connection;
3. the connection itself exposes GitLab tools;
4. the copied technical ID starts with `plugin_asdk_app_`;
5. the generated `.app.json` contains that exact ID;
6. the generated plugin manifest contains `apps: "./.app.json"` and no competing direct MCP dependency;
7. the installed package is `gitlab-self-hosted@ademkao-gitlab-chatgpt` when explicit App binding is required.

Re-running OAuth alone will not repair a missing plugin-to-app dependency.

## Public endpoint privacy guard

Run:

```bash
python3 scripts/validate_public_config.py
```

The validator rejects real non-example `/mcp` endpoints in public setup files, keeps localhost isolated to its development template, and confirms the root package remains endpoint-neutral while the generated registered-App path is documented.

## Local repository operations

For local working-tree state, commit, and push, use local `git` / `glab` when that local repository is available. Do not model local filesystem mutation through the remote MCP server.

## GitLab.com / Self-Managed / Dedicated

Resolve the intended GitLab host explicitly:

```bash
GITLAB_HOST=https://<gitlab-host>
```

In OAuth mode, create the GitLab OAuth Application on that same GitLab instance. Never silently send private project identifiers to `gitlab.com` when the intended host is different.
