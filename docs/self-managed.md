# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

The bundled MCP server talks to GitLab REST API v4 and is not tied to `gitlab.com`.

## Configure the host

```bash
GITLAB_HOST=https://gitlab.example.com
```

`GITLAB_HOST` must be the GitLab base URL without `/api/v4`; the server adds the API prefix itself.

## Shared-token authentication

```bash
MCP_AUTH_MODE=shared-token
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

Use a token type supported by the target GitLab instance and APIs. Personal access tokens are the simplest setup; project/group tokens can reduce scope for bounded deployments. A pre-existing OAuth access token can be supplied with `GITLAB_TOKEN_TYPE=bearer`.

## Per-user OAuth authentication

v0.4 also supports per-user OAuth against Self-Managed/Dedicated GitLab.

Create the OAuth Application **on the same GitLab instance** selected by `GITLAB_HOST` and register the MCP server callback, for example:

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

The target GitLab version must support the OAuth authorization/token endpoints, PKCE behavior, refresh tokens, and REST endpoints used by the enabled tools. Test the complete authorization flow on the exact GitLab version before production rollout.

## TLS and private networking

For production, use HTTPS to GitLab and to the MCP endpoint. If the GitLab instance uses an internal CA, configure the Node/container trust store rather than disabling TLS verification.

If GitLab or the MCP server is private/on-premises, expose only the minimum required OAuth/MCP routes through an authenticated reverse proxy, VPN, private ingress, or supported tunnel. Do not weaken TLS or make the GitLab API broadly public just to support MCP.

`PUBLIC_BASE_URL` is the browser/client-visible OAuth origin; `GITLAB_HOST` is the GitLab instance. They do not need to be the same hostname.

## Version compatibility

The tool layer uses common GitLab REST API v4 endpoints for projects, groups, issues, merge requests, repository branches/commits, and CI pipelines/jobs.

GitLab Self-Managed versions can differ in fields, endpoint behavior, OAuth features, and refresh-token semantics. File an issue with the GitLab version and sanitized error response if you find a mismatch.

## Project scoping

For a shared Self-Managed instance, strongly consider an explicit allowlist:

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

The allowlist is checked before project-level API calls and filters project discovery results. In OAuth mode it applies equally to every user even when GitLab grants that user access to additional projects.

## OAuth store deployment

The v0.4 built-in OAuth store is encrypted but single-node/file-based. Keep the store on persistent storage, protect the encryption key separately, and do not mount one writable store into multiple MCP replicas.

## Native GitLab MCP

GitLab's own MCP server can still be used separately when it is available and appropriate, but it is not a dependency of this project.
