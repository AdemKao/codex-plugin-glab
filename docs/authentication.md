# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.5.0 supports two authentication models. Choose one deliberately.

## Shared-token mode

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
MCP_AUTH_TOKEN=a-long-random-secret
```

One configured GitLab identity represents the whole MCP server. Use this for personal deployments, CI/service identities, or deliberately trusted shared workspaces.

## Per-user OAuth mode

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Each MCP user authorizes their own GitLab account. Create the GitLab OAuth Application on the same GitLab instance selected by `GITLAB_HOST` and register exactly:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

The server maps downstream scopes to GitLab scopes:

| MCP scope | GitLab scopes | Effective capability |
| --- | --- | --- |
| `gitlab:read` | `read_api read_user` | read tools |
| `gitlab:write` | `api read_user` | write-capable session, still limited by server policy |

`gitlab:read` is always present. `gitlab:write` is unavailable when `GITLAB_WRITE_ENABLED=false`.

## OAuth discovery and client registration

OAuth mode exposes Protected Resource Metadata and Authorization Server Metadata plus `/oauth/authorize`, `/oauth/token`, and the GitLab callback.

v0.5 supports two client-registration paths:

### CIMD — preferred

A modern MCP client can use an HTTPS Client ID Metadata Document URL directly as `client_id`.

The server verifies:

- HTTPS URL with a non-root path;
- metadata `client_id` exactly equals the requested URL;
- declared redirect URI exactly matches the request;
- supported response/grant type;
- public client mode (`token_endpoint_auth_method=none`) in v0.5;
- no HTTP redirect while fetching metadata;
- document-size and timeout limits;
- DNS/IP does not resolve to loopback/private/link-local networks unless explicitly enabled.

Optional controls:

```bash
OAUTH_CIMD_ENABLED=true
OAUTH_CIMD_ALLOWED_HOSTS=client.example.com
OAUTH_CIMD_ALLOW_PRIVATE_NETWORK=false
OAUTH_CIMD_FETCH_TIMEOUT_MS=5000
```

### DCR — compatibility fallback

`/oauth/register` remains available when:

```bash
OAUTH_DCR_ENABLED=true
```

DCR client secrets are stored as scrypt hashes. New deployments should prefer CIMD where the MCP client supports it.

## Authorization flow

```text
MCP client
  -> Protected Resource Metadata
  -> Authorization Server Metadata
  -> CIMD client metadata OR DCR
  -> /oauth/authorize + PKCE S256
  -> GitLab /oauth/authorize + independent PKCE S256
  -> /oauth/gitlab/callback
  -> one-time MCP authorization code
  -> /oauth/token + PKCE verifier
  -> MCP access + rotating refresh token
  -> /mcp as that GitLab user
```

## OAuth persistence

Choose one backend.

### Encrypted file store

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

The whole payload is AES-256-GCM encrypted and file writes use atomic rename. This backend is for one MCP process/node only.

### PostgreSQL store

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

This is the recommended backend for horizontal scaling. Record payloads containing GitLab credentials remain encrypted with `OAUTH_ENCRYPTION_KEY`; lookup fields contain only non-secret identifiers or token hashes.

The PostgreSQL backend provides cross-replica atomicity:

- OAuth state consume uses `DELETE ... RETURNING`;
- authorization-code consume uses `DELETE ... RETURNING`;
- refresh-token rotation conditionally updates against the previous refresh-token hash;
- concurrent GitLab token refresh can recover by using a newer session written by another replica.

## Token lifecycle

- MCP access tokens are short-lived.
- MCP refresh tokens rotate on every successful refresh and cannot be reused.
- GitLab access tokens refresh automatically.
- If the upstream GitLab authorization can no longer be refreshed, the MCP session is invalidated.

## Authorization is not server policy

A GitLab write must satisfy all applicable layers:

1. the OAuth session has `gitlab:write` when OAuth mode is used;
2. `GITLAB_WRITE_ENABLED=true`;
3. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`;
4. `GITLAB_ALLOWED_PROJECTS`, if configured, permits the project;
5. the GitLab account has permission for the API action.

OAuth scope therefore cannot escalate beyond deployment policy.

## Credential handling

- Never commit `.env`, OAuth secrets, encryption keys, tokens, or OAuth store data.
- Store `OAUTH_ENCRYPTION_KEY` separately from the file volume/PostgreSQL backups it protects.
- Prefer a production secret manager.
- Use separate GitLab OAuth applications for development and production.
- Changing the encryption key requires an explicit migration/re-authorization plan because existing encrypted sessions cannot be read with a new key.
