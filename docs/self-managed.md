# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

The bundled MCP server talks directly to GitLab REST API v4 and is not tied to `gitlab.com`.

## Configure the host

```bash
GITLAB_HOST=https://gitlab.example.com
```

Use the GitLab base URL without `/api/v4`.

## Shared-token authentication

```bash
MCP_AUTH_MODE=shared-token
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

Personal/project/group tokens are supported according to the target GitLab instance and endpoint. Existing OAuth access tokens can use `GITLAB_TOKEN_TYPE=bearer`.

## Per-user OAuth

Create the OAuth Application **on the same GitLab instance** selected by `GITLAB_HOST` and register the MCP callback:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Configure:

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

The target GitLab version must support the OAuth authorization/token flow, PKCE, refresh tokens, and REST APIs used by enabled tools. Test the complete flow on the exact deployed GitLab version.

## OAuth persistence

Single MCP instance:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Multiple replicas / HA:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

All replicas must use the same `OAUTH_ENCRYPTION_KEY`. The PostgreSQL backend provides atomic state/code consumption and refresh-token rotation across instances.

## CIMD in private networks

v0.5 supports CIMD, but its metadata fetcher blocks private/loopback/link-local destinations by default. That is the safe default for a public MCP endpoint.

If an enterprise Self-Managed deployment intentionally hosts MCP client metadata on a private network, use the narrowest configuration possible:

```bash
OAUTH_CIMD_ALLOWED_HOSTS=approved-client-metadata.internal.example.com
OAUTH_CIMD_ALLOW_PRIVATE_NETWORK=true
```

Only enable private-network CIMD when the MCP server's network boundary is trusted. Prefer an explicit hostname allowlist rather than unrestricted private-network fetching.

DCR can remain enabled for clients that do not support CIMD:

```bash
OAUTH_DCR_ENABLED=true
```

## TLS and networking

Use HTTPS to both GitLab and the MCP endpoint. For an internal CA, configure the Node/container trust store instead of disabling TLS verification.

`PUBLIC_BASE_URL` is the browser/MCP-client-visible OAuth origin; `GITLAB_HOST` is the GitLab instance. They may be different hostnames.

Expose only the required MCP/OAuth routes through an authenticated reverse proxy, private ingress, VPN, or supported tunnel. Do not make the GitLab API broadly public for MCP.

## Version compatibility

v0.5 tools use GitLab REST API v4 for projects/groups/issues/MRs, repository branches/commits/files, MR approvals/discussions, and CI pipelines/jobs. Self-Managed versions can differ in fields, OAuth behavior, and endpoint availability.

If you find a mismatch, report the exact GitLab version and a sanitized response/error.

## Project scoping

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

The allowlist applies to all users in OAuth mode even if their GitLab account can access additional projects.

## Native GitLab MCP

GitLab's native MCP can still be used independently where available, but it is not a dependency of this project.
