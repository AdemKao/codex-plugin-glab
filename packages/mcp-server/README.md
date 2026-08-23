# GitLab MCP Server

Self-hosted MCP server used by `codex-plugin-glab` to expose a controlled GitLab REST API surface to ChatGPT, Codex, and other MCP clients.

v0.5 supports:

- `shared-token` — trusted single-user/service-token mode.
- `oauth` — each MCP user authorizes their own GitLab identity.
- CIMD client registration with DCR fallback.
- encrypted file OAuth persistence for one replica.
- PostgreSQL OAuth persistence for production multi-replica deployments.

## Shared-token quick start

```bash
cd packages/mcp-server
npm install
GITLAB_TOKEN=your-token npm run dev
```

The safe local default is `http://127.0.0.1:3333/mcp` with write tools disabled.

## Per-user OAuth quick start

Create a GitLab OAuth application with redirect URI:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Configure:

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
npm run dev
```

For multiple replicas:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

The store creates its schema idempotently at startup; the equivalent SQL is documented in `migrations/001_oauth_postgres.sql`.

## OAuth discovery and client registration

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register          # DCR fallback
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

The authorization metadata advertises CIMD when enabled. Modern clients can use an HTTPS metadata document URL as `client_id`; DCR remains enabled by default for clients that still rely on it.

CIMD protection includes exact client-id matching, redirect validation, no redirects during metadata fetch, document size/time limits, bounded caching, optional hostname allowlists, and private-network SSRF blocking by default.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MCP_AUTH_MODE` | `shared-token` | `shared-token` or `oauth` |
| `GITLAB_HOST` | `https://gitlab.com` | GitLab.com / Self-Managed / Dedicated base URL |
| `GITLAB_TOKEN` | shared mode: required | PAT/project/group/OAuth token |
| `GITLAB_TOKEN_TYPE` | `private-token` | `private-token` or `bearer` |
| `PUBLIC_BASE_URL` | OAuth: required | Public HTTPS OAuth origin |
| `GITLAB_OAUTH_CLIENT_ID` | OAuth: required | GitLab OAuth Application ID |
| `GITLAB_OAUTH_CLIENT_SECRET` | OAuth: required | GitLab OAuth Application secret |
| `OAUTH_ENCRYPTION_KEY` | OAuth: required | Base64 of exactly 32 random bytes |
| `OAUTH_STORE_DRIVER` | `file` | `file` or `postgres` |
| `OAUTH_STORE_PATH` | `./data/oauth-store.json` | Encrypted single-node file store |
| `OAUTH_DATABASE_URL` | postgres: required | PostgreSQL connection URL |
| `OAUTH_CIMD_ENABLED` | `true` | Enable Client ID Metadata Documents |
| `OAUTH_CIMD_ALLOWED_HOSTS` | empty | Optional CIMD host allowlist |
| `OAUTH_CIMD_ALLOW_PRIVATE_NETWORK` | `false` | Permit private-network CIMD only when explicitly needed |
| `OAUTH_CIMD_FETCH_TIMEOUT_MS` | `5000` | CIMD HTTP timeout |
| `OAUTH_DCR_ENABLED` | `true` | Keep Dynamic Client Registration fallback |
| `GITLAB_ALLOWED_PROJECTS` | empty | Optional project ID/path allowlist |
| `GITLAB_WRITE_ENABLED` | `false` | Enable ordinary writes |
| `GITLAB_MERGE_ENABLED` | `false` | Independently enable MR merge |

See root `.env.example` for full TTL/server settings.

## PostgreSQL concurrency guarantees

The production backend uses database operations rather than in-memory locking:

- OAuth transaction consume: `DELETE ... RETURNING`.
- Authorization-code consume: `DELETE ... RETURNING`.
- Refresh-token rotation: conditional `UPDATE` against the old refresh-token hash.

That means two MCP replicas racing on the same state/code/refresh token cannot both succeed.

## Security model

- Production `PUBLIC_BASE_URL` must use HTTPS.
- Downstream MCP OAuth and upstream GitLab OAuth use PKCE S256.
- GitLab access/refresh tokens are encrypted at rest with AES-256-GCM in both backends.
- MCP authorization codes, access tokens, and refresh tokens persist only as hashes.
- OAuth state/code are single-use and short-lived.
- Read-only OAuth sessions cannot issue non-GET GitLab requests; `gitlab:write` is checked at the GitLab client boundary.
- `GITLAB_WRITE_ENABLED`, `GITLAB_MERGE_ENABLED`, and project allowlists remain authoritative.
- CIMD metadata cannot redirect and cannot target private networks unless explicitly enabled.

Protect `OAUTH_ENCRYPTION_KEY` separately from the file volume or PostgreSQL database.

## Tool groups

Read tools include users/groups/projects, branches/commits, repository trees/files, issues, merge requests/diffs, pipelines/jobs/traces.

Write tools include issue/MR operations, branch creation, repository-file commit operations, MR approve/unapprove/discussions, pipeline create/retry/cancel, and MR merge. Writes remain disabled by default; merge requires its own flag.

The server does not expose a generic GitLab API proxy.
