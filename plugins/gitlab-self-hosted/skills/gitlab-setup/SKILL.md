---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this self-hosted plugin. Use when authentication fails, MCP tools are missing, the hosted remote MCP binding must be verified, a localhost development fallback is needed, plugin resolution is ambiguous, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Self-Hosted Setup

## Goal

Use the repository-root plugin as the default GitLab connection path. The root package is directly bound to the hosted remote MCP endpoint:

```text
https://gitlab-mcp.blacmarcs.com/mcp
```

Normal users should not be asked to run an MCP server locally, build a generated marketplace variant, maintain a second repository, or provide a ChatGPT MCP connection technical ID.

## Package identity

Use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Do not use the old generic `gitlab@ademkao-codex-plugins`; the generic identifier can collide with OpenAI's curated GitLab integration.

The root package must contain:

```text
.codex-plugin/plugin.json -> mcpServers: "./.mcp.json"
.mcp.json                 -> https://gitlab-mcp.blacmarcs.com/mcp
```

## Default remote OAuth path

For normal ChatGPT/Codex usage:

1. install the repository marketplace root;
2. select or invoke **GitLab Self-Hosted**;
3. allow the client to load `./.mcp.json` and connect to `https://gitlab-mcp.blacmarcs.com/mcp`;
4. when authentication is required, follow the MCP server's OAuth discovery flow;
5. complete GitLab authorization in the browser; and
6. test a harmless read.

Preferred smoke tests:

```text
List the GitLab groups and projects I can access.
Show my current authenticated GitLab user.
```

Do not test authentication by creating, updating, deleting, merging, or cancelling content.

## OAuth behavior

In OAuth mode an unauthenticated `/mcp` request should return `401` with a `WWW-Authenticate` challenge pointing to Protected Resource Metadata. The server then exposes Authorization Server Metadata and supports CIMD, with DCR retained as a compatibility fallback.

Never ask the user to paste a real GitLab PAT, OAuth client secret, refresh token, or MCP bearer token into chat.

## Troubleshooting: plugin visible, tools missing

Check the binding before changing deployment settings:

```text
gitlab-self-hosted@ademkao-codex-plugins
  -> .codex-plugin/plugin.json
  -> mcpServers: ./.mcp.json
  -> https://gitlab-mcp.blacmarcs.com/mcp
  -> OAuth discovery
```

Verify in this order:

1. package identity is `gitlab-self-hosted`, not generic `gitlab`;
2. root plugin manifest has `mcpServers: "./.mcp.json"`;
3. root `.mcp.json` has server key `gitlab`, type `http`, and URL `https://gitlab-mcp.blacmarcs.com/mcp`;
4. client authentication/OAuth has completed;
5. a harmless GitLab read works.

For the normal root package, do not switch to `127.0.0.1` and do not generate a second marketplace merely because OAuth has not yet been completed.

## Localhost development fallback

Only when the MCP server intentionally runs on the same development machine, generate the local override:

```bash
python3 scripts/build_local_variant.py
```

Use:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

That generated artifact overrides the hosted source endpoint with:

```text
http://127.0.0.1:3333/mcp
```

It also records that a local MCP process is required. This path is a development fallback and must not become the root marketplace default.

## Optional custom remote override

If an operator intentionally uses another public HTTPS MCP deployment:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

This helper is optional. It copies the root plugin and replaces `.mcp.json` with the validated custom endpoint. It does not require a ChatGPT App binding.

## Optional existing ChatGPT App/connection binding

For a workspace that explicitly wants an existing ChatGPT MCP App/connection dependency rather than direct `mcpServers`, the backwards-compatible helper remains:

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id <existing-chatgpt-mcp-connection-technical-id> \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--app-id` is a legacy alias for `--connection-id`.

The generated App-bound plugin removes the root direct MCP binding and copied `.mcp.json`, then uses `apps: "./.app.json"`. The helper does not create the connection and does not run OAuth.

This is an advanced compatibility path, not the default installation flow and not an OpenAI managed App Template.

## Self-hosted server configuration

Operators deploying a different MCP endpoint can use shared-token or per-user OAuth modes.

Shared service identity:

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=<secret-from-secure-store>
MCP_AUTH_TOKEN=<separate-mcp-bearer>
```

Per-user OAuth:

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

One replica may use the encrypted file store; multiple production replicas should use PostgreSQL and a shared encryption key stored separately from database backups.

## Safety policy

Start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` when a deployment needs a project allowlist. OAuth `gitlab:write` never overrides deployment write/merge flags, allowlists, or GitLab permissions.

## Local repository operations

For working-tree state, commit, and push, use local `git` / `glab` when available rather than attempting to model local filesystem changes through the remote MCP server.

```bash
glab auth status
```

Keep local Git identity/host configuration separate from MCP OAuth identity when troubleshooting.
