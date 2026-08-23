# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## Goal

Use one public plugin repository without exposing a maintainer-specific MCP deployment and without requiring users to run the MCP server locally.

The default package is:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

It is intentionally endpoint-neutral. The real remote MCP URL belongs to the user or workspace configuration, not to the public Git repository.

## Normal remote path

For a client that supports adding a custom remote MCP server directly:

```text
Install repository marketplace root
        |
        v
GitLab Self-Hosted skills
        +
User/workspace MCP setting
  https://gitlab-mcp.example.com/mcp
        |
        v
MCP OAuth discovery
        |
        v
GitLab OAuth
        |
        v
GitLab REST API v4
```

Setup:

1. Install the repository root marketplace.
2. Add the user's or workspace's public remote HTTPS `/mcp` endpoint in the client MCP/App settings.
3. Complete OAuth.
4. Refresh/scan tools when the client offers that action.
5. Verify a harmless read before enabling writes.

No local MCP process, generated remote marketplace, or second repository is required for this direct-MCP path.

## Why the endpoint is not embedded in the plugin

Agent Plugin HTTP MCP configuration requires a literal absolute URL. The current format does not treat arbitrary `${ENV_VAR}` text in the HTTP `url` field as install-time endpoint substitution.

That creates an important invariant:

- a committed active `.mcp.json` can point to one concrete URL; or
- the public package can remain endpoint-neutral so each user/workspace configures its own URL.

This project chooses the second option. It avoids publishing an operator's private infrastructure and avoids silently sending other users to a maintainer-controlled server.

A neutral reference is included at:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

It intentionally uses:

```text
https://gitlab-mcp.example.com/mcp
```

Do not replace that committed example with a real organization endpoint.

## Important ChatGPT app-binding distinction

ChatGPT plugins can package skills and can depend on apps. A plugin package and a connected/authenticated MCP App are separate objects.

When a ChatGPT surface exposes a user-configured MCP App directly to the conversation, the endpoint-neutral workflow can use that connection without generating another repository variant.

When a ChatGPT surface requires the plugin itself to declare an app dependency, a static public plugin cannot dynamically discover the technical ID of an arbitrary user-created connection. There are two platform-level ways to make such a dependency portable:

- a canonical shared app/connector ID that is portable across workspaces; or
- a managed App Template that creates a workspace-specific app and is supported by the target managed workspace.

This repository currently has neither a canonical OpenAI-managed GitLab Self-Hosted app ID nor an OpenAI-managed App Template. It therefore does not pretend that a placeholder connection ID or `${GITLAB_MCP_URL}` can provide one-click binding for every workspace.

The legacy `build_chatgpt_variant.py` helper remains available only when a workspace already has a connection technical ID and explicitly needs a plugin-bound artifact. It is compatibility tooling, not the normal remote setup.

## Deploy the bundled OAuth MCP server

Create a GitLab OAuth Application on the intended GitLab instance. Use your own public hostname for the callback, for example:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Environment example:

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Single replica:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Multi-replica production:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

## Validate the remote endpoint

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor validates the public HTTPS URL, rejects non-public DNS targets, checks Protected Resource Metadata and Authorization Server Metadata, and confirms that unauthenticated `/mcp` returns the OAuth challenge expected by compatible clients.

A successful OAuth callback proves authentication to that MCP connection. It does not by itself prove that every plugin surface has an explicit app dependency on the same connection.

## OAuth discovery sequence

In OAuth mode the server exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

The server supports CIMD and DCR-compatible registration flows. Downstream MCP OAuth and upstream GitLab OAuth use PKCE S256.

## Local development fallback

Localhost remains an explicit development option only:

```bash
python3 scripts/build_local_variant.py
```

The generated development artifact binds:

```text
http://127.0.0.1:3333/mcp
```

The repository root marketplace never chooses localhost automatically.

## Legacy compatibility helpers

These scripts remain to avoid breaking existing deployments:

```text
scripts/build_personal_variant.py
scripts/build_chatgpt_variant.py
```

They are no longer required by the normal direct remote MCP path. Do not create a second public repository solely to store their generated output.

## Troubleshooting

If the plugin is visible but GitLab tools are missing, check the layers in this order:

1. Confirm the intended `gitlab-self-hosted@ademkao-codex-plugins` package is installed.
2. Confirm the user's/workspace's remote MCP connection points at the intended HTTPS `/mcp` endpoint.
3. Confirm OAuth completed for that same connection and the connection itself exposes GitLab tools.
4. If the ChatGPT surface requires an explicit plugin app dependency, confirm the workspace has a portable app/template binding or use the existing-connection compatibility helper.
5. Do not solve a missing app binding by committing a private MCP hostname to the public plugin.

## Public configuration guard

CI runs:

```bash
python3 scripts/validate_public_config.py
```

The validator keeps the root plugin endpoint-neutral, verifies the localhost fallback remains isolated, and rejects real non-example `/mcp` endpoints from public setup files.
