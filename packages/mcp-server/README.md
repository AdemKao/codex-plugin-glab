# GitLab MCP Server

Self-hosted MCP server used by `codex-plugin-glab` to expose a controlled GitLab REST API surface to ChatGPT, Codex, and other MCP clients.

v0.4 supports two authentication modes:

- `shared-token` — v0.3-compatible trusted single-user/service-token mode.
- `oauth` — each MCP user authorizes their own GitLab identity.

## Shared-token quick start

```bash
cd packages/mcp-server
npm install
GITLAB_TOKEN=your-token npm run dev
```

The safe local default is `http://127.0.0.1:3333/mcp` with write tools disabled.

## Per-user OAuth quick start

Create a GitLab OAuth application with this redirect URI:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

GitLab recommends authorization code with PKCE. Configure the server:

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json
npm run dev
```

The OAuth server exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

MCP clients discover the authorization server from Protected Resource Metadata. Current clients may dynamically register, complete downstream PKCE, then get redirected through the GitLab OAuth flow. The resulting MCP session carries that user's GitLab permissions rather than a server-wide GitLab identity.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MCP_AUTH_MODE` | `shared-token` | `shared-token` or `oauth` |
| `GITLAB_HOST` | `https://gitlab.com` | GitLab.com or Self-Managed base URL |
| `GITLAB_TOKEN` | shared mode: required | PAT, project/group token, or OAuth bearer token |
| `GITLAB_TOKEN_TYPE` | `private-token` | `private-token` or `bearer` in shared mode |
| `PUBLIC_BASE_URL` | OAuth: required | Public HTTPS origin for OAuth discovery/callbacks |
| `GITLAB_OAUTH_CLIENT_ID` | OAuth: required | GitLab OAuth Application ID |
| `GITLAB_OAUTH_CLIENT_SECRET` | OAuth: required | GitLab OAuth Application secret |
| `OAUTH_ENCRYPTION_KEY` | OAuth: required | Base64 encoding of exactly 32 random bytes |
| `OAUTH_STORE_PATH` | `./data/oauth-store.json` | Encrypted OAuth client/session store |
| `OAUTH_DCR_ENABLED` | `true` | Enable Dynamic Client Registration for compatible MCP clients |
| `GITLAB_ALLOWED_PROJECTS` | empty | Optional comma-separated allowlist of IDs or namespace paths |
| `GITLAB_WRITE_ENABLED` | `false` | Enables issue/MR/branch write tools |
| `GITLAB_MERGE_ENABLED` | `false` | Separately enables MR merge tool |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `MCP_PORT` | `3333` | HTTP port |
| `MCP_PATH` | `/mcp` | MCP endpoint path |
| `MCP_AUTH_TOKEN` | empty | Shared-mode bearer token protecting the MCP endpoint |
| `MCP_ALLOW_INSECURE_NO_AUTH` | `false` | Shared mode only: explicitly allow unauthenticated non-loopback endpoint |

See the root `.env.example` for TTL and deployment settings.

## OAuth security model

- Production `PUBLIC_BASE_URL` must use HTTPS.
- Downstream MCP authorization requires PKCE S256.
- GitLab authorization also uses PKCE S256.
- GitLab access and refresh tokens are encrypted at rest with AES-256-GCM.
- MCP authorization codes, access tokens, and refresh tokens are stored only as SHA-256 hashes.
- Dynamically registered confidential-client secrets are stored as scrypt hashes.
- Authorization state and authorization codes are single-use and expire quickly.
- Read-only OAuth sessions cannot issue non-GET GitLab requests; `gitlab:write` is checked at the GitLab client boundary.
- Server policy still wins: `GITLAB_WRITE_ENABLED`, `GITLAB_MERGE_ENABLED`, and project allowlists cannot be bypassed by requesting a broader OAuth scope.

The encrypted store persists to `/data` in the provided Docker Compose configuration. Back it up like a credential database and protect `OAUTH_ENCRYPTION_KEY` separately.

## Tool groups

Read tools cover the current user, groups, projects, branches, commits, issues, merge requests and diffs, pipelines, jobs, and job traces.

Write tools cover issue create/update/comment, merge-request create/update/comment, branch creation, and merge. Writes are off by default; merge requires a second explicit flag.

## Compatibility note

The current MCP specification is moving from Dynamic Client Registration toward Client ID Metadata Documents (CIMD). v0.4 retains DCR for broad client compatibility; CIMD support is planned without removing the existing preregistration/DCR path abruptly.
