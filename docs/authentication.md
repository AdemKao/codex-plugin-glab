# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.4.0 supports two authentication models. Choose one deliberately; do not mix their credentials unless you are migrating.

## Shared-token mode

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

For a non-loopback bind, also configure:

```bash
MCP_AUTH_TOKEN=a-long-random-secret
```

This is the v0.3-compatible model. The configured GitLab token represents one GitLab identity for the whole MCP server. It is appropriate for personal deployments, CI/service accounts, or a trusted workspace intentionally using one service identity.

`MCP_ALLOW_INSECURE_NO_AUTH=true` disables the built-in shared-mode remote-auth guard. Use it only when a separate trusted gateway or private tunnel already authenticates every request.

## Per-user OAuth mode

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json
```

In this mode, `GITLAB_TOKEN` and `MCP_AUTH_TOKEN` are not the identity path. Each MCP user authorizes their own GitLab account.

### GitLab OAuth Application

Create one GitLab OAuth Application for the MCP deployment. Register this callback exactly:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

For GitLab Self-Managed, create the OAuth Application on that GitLab instance and point `GITLAB_HOST` to the same instance.

The server requests upstream GitLab scopes based on the downstream MCP scope:

| MCP OAuth scope | GitLab OAuth scopes | Effective capability |
| --- | --- | --- |
| `gitlab:read` | `read_api read_user` | read tools only |
| `gitlab:write` | `api read_user` | write-capable session, still limited by server policy |

`gitlab:read` is always present. `gitlab:write` cannot be requested when `GITLAB_WRITE_ENABLED=false`.

### MCP OAuth discovery

OAuth mode exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
```

An unauthenticated `/mcp` request returns `401` and a `WWW-Authenticate` header that points to Protected Resource Metadata. Compatible clients can then discover the authorization server and start authorization automatically.

### Authorization flow

```text
MCP client
  -> Protected Resource Metadata
  -> authorization-server metadata
  -> optional Dynamic Client Registration
  -> /oauth/authorize + PKCE S256
  -> GitLab /oauth/authorize + independent PKCE S256
  -> /oauth/gitlab/callback
  -> one-time MCP authorization code
  -> /oauth/token + downstream PKCE verifier
  -> MCP access + refresh token
  -> /mcp as that GitLab user
```

The server includes `iss` in downstream authorization responses. Current MCP clients may use Dynamic Client Registration. The MCP specification is moving toward Client ID Metadata Documents (CIMD), so DCR is a compatibility path rather than the long-term only registration mechanism.

## Token lifecycle

The MCP access token and GitLab access token have independent lifetimes.

- MCP access tokens are short-lived and backed by rotating MCP refresh tokens.
- GitLab access tokens are refreshed automatically using the user's GitLab refresh token before expiry.
- If the GitLab refresh token is revoked or cannot be refreshed, the corresponding MCP session is removed and the user must authorize again.

## OAuth persistence

The built-in store persists registrations, pending transactions, authorization codes, and sessions to `OAUTH_STORE_PATH`.

Security properties:

- the entire store is encrypted with AES-256-GCM;
- GitLab access/refresh tokens exist only inside the encrypted payload;
- MCP authorization/access/refresh tokens are stored only as SHA-256 hashes;
- confidential OAuth client secrets are stored only as scrypt hashes;
- writes use a temporary file + atomic rename;
- file mode is set to `0600` when the filesystem supports it.

`OAUTH_ENCRYPTION_KEY` must decode from base64 to exactly 32 bytes. Do not store the encryption key beside backups of the OAuth store.

The v0.4 store is designed for one MCP server process/node. Do not mount one store file read-write into multiple replicas. Horizontal scaling needs a transactional shared store/locking backend.

## Authorization is not the same as server policy

OAuth scopes do not override safety configuration.

A write request must satisfy all applicable layers:

1. the user authorized `gitlab:write`;
2. `GITLAB_WRITE_ENABLED=true`;
3. for merge, `GITLAB_MERGE_ENABLED=true`;
4. the target is permitted by `GITLAB_ALLOWED_PROJECTS`, if configured;
5. the GitLab account itself has permission for the requested API action.

This prevents an OAuth client from escalating beyond the MCP deployment's configured policy.

## Credential handling

- Never commit `.env`, GitLab OAuth secrets, `OAUTH_ENCRYPTION_KEY`, tokens, or the OAuth store.
- Prefer a secret manager for production environment variables.
- Back up the encrypted store only when you also have a secure recovery plan for its encryption key.
- Rotate the GitLab OAuth application secret and encryption key deliberately; changing the encryption key without migrating/recreating the store makes existing encrypted sessions unreadable.
- Use separate OAuth applications and secrets for development and production.
