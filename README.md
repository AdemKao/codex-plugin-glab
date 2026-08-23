# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository ships two first-class parts:

1. a GitLab plugin with workflow skills and safe routing; and
2. a self-hosted GitLab MCP server backed by the GitLab REST API.

> **Status:** v0.5.0 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Why self-host

GitLab's native MCP offering can have availability or group/instance prerequisites that do not fit every GitLab.com or Self-Managed installation. This project therefore ships its own MCP server and treats GitLab's native MCP as optional.

The bundled server works with GitLab.com, GitLab Self-Managed, and GitLab Dedicated as long as the target instance exposes the REST APIs used by the enabled tools.

## Architecture

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP + OAuth or shared bearer
            v
+---------------------------------------+
| codex-plugin-glab MCP server          |
| - MCP tools + schemas                 |
| - OAuth / auth boundary               |
| - CIMD + DCR client registration      |
| - read/write/merge policy             |
| - project allowlist                   |
+-------------------+-------------------+
                    |
                    | per-user OAuth token
                    | or shared service token
                    v
             GitLab REST API v4

OAuth persistence:
  single node  -> encrypted file store
  multi replica -> PostgreSQL store
```

The Codex plugin still uses local `git` / `glab` when a task needs local working-tree state, commit, or push behavior.

## Authentication modes

### Shared-token

One GitLab identity is shared by the MCP deployment:

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

Use this for a trusted single-user deployment, CI/service integration, or an intentionally shared service identity.

### Per-user OAuth

Each ChatGPT/Codex/MCP user authorizes their own GitLab identity. Create a GitLab OAuth application whose callback is:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Then configure:

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

For one MCP replica, the encrypted file store remains available:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

For production horizontal scaling, use PostgreSQL:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

The PostgreSQL backend makes authorization-state consumption, authorization-code consumption, and MCP refresh-token rotation atomic across replicas.

## MCP OAuth client registration

v0.5 supports both:

- **Client ID Metadata Documents (CIMD)** — preferred for modern MCP clients.
- **Dynamic Client Registration (DCR)** — retained as a compatibility fallback.

CIMD clients use an HTTPS metadata URL as `client_id`. The server verifies exact client ID matching, redirect URIs, supported grants, and blocks private/loopback/link-local metadata targets by default. Optional controls:

```bash
OAUTH_CIMD_ENABLED=true
OAUTH_CIMD_ALLOWED_HOSTS=client.example.com
OAUTH_CIMD_ALLOW_PRIVATE_NETWORK=false
OAUTH_CIMD_FETCH_TIMEOUT_MS=5000
OAUTH_DCR_ENABLED=true
```

## Docker quick start

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# edit .env
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

For the bundled PostgreSQL profile:

```bash
# .env: MCP_AUTH_MODE=oauth, OAUTH_STORE_DRIVER=postgres
# set POSTGRES_PASSWORD and make OAUTH_DATABASE_URL use host `postgres`
docker compose --profile postgres up -d --build
```

The MCP endpoint is `http://127.0.0.1:3333/mcp` locally. Remote ChatGPT/MCP deployments should expose it through HTTPS.

## OAuth endpoints

OAuth mode exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register          # DCR compatibility
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

Unauthenticated `/mcp` requests return `401` with `WWW-Authenticate` pointing to Protected Resource Metadata.

## Safety defaults

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
GITLAB_ALLOWED_PROJECTS=
```

Writes require `GITLAB_WRITE_ENABLED=true`. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`. In OAuth mode, non-GET GitLab API requests also require the session's `gitlab:write` scope.

The server intentionally does **not** expose a generic arbitrary GitLab API proxy.

## Supported MCP tools

### Read

- current authenticated GitLab user
- groups / projects / project metadata
- branches / commits
- repository tree and repository files
- issues
- merge requests and diffs
- pipelines / jobs / traces

### Write

- create/update/comment issues
- create/update/comment merge requests
- create branches
- repository file create/update/delete with commits
- approve/unapprove merge requests
- create merge-request discussions
- create/retry/cancel pipelines
- merge merge requests with a separate merge safety flag

Destructive operations such as repository-file deletion and pipeline cancellation are annotated as destructive MCP tools.

## OAuth security

- Production `PUBLIC_BASE_URL` must use HTTPS.
- Downstream MCP OAuth and upstream GitLab OAuth use PKCE S256.
- GitLab access/refresh tokens are encrypted at rest with AES-256-GCM.
- MCP authorization codes, access tokens, and refresh tokens are persisted only as hashes.
- OAuth state and authorization codes are single-use and time-limited.
- MCP refresh tokens rotate on use.
- PostgreSQL atomic operations prevent the same state/code/refresh token succeeding on two replicas.
- CIMD fetches reject redirects and private-network targets by default and are bounded by size/time limits.
- `OAUTH_ENCRYPTION_KEY` must be stored separately from the OAuth database/volume.

## ChatGPT

For per-user ChatGPT access, deploy with `MCP_AUTH_MODE=oauth`, expose the server through HTTPS, and create a Custom MCP App using the `/mcp` URL. The client should discover OAuth from the server instead of receiving a GitLab PAT from the user.

OpenAI plan/workspace availability can change independently of this repository. See [docs/chatgpt-app.md](docs/chatgpt-app.md).

## Codex plugin

The portable plugin lives at `plugins/gitlab/`. Its default `.mcp.json` targets `http://127.0.0.1:3333/mcp`.

For local development:

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

Then add the `gitlab` marketplace entry from `.agents/plugins/marketplace.json` to your personal marketplace configuration and restart Codex.

## Repository layout

```text
plugins/gitlab/                         # ChatGPT/Codex plugin assets and skills
packages/mcp-server/
  src/oauth-gateway.ts                 # MCP OAuth, CIMD/DCR, GitLab OAuth
  src/oauth-store.ts                   # encrypted file backend + store contract
  src/postgres-oauth-store.ts          # multi-replica PostgreSQL backend
  src/register-tools.ts                # core GitLab tools
  src/register-v05-tools.ts            # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
Dockerfile
docker-compose.yml
.env.example
docs/
VERSION
```

## Development

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
cd packages/mcp-server
npm install
npm run check
```

CI additionally starts PostgreSQL 17 and runs multi-replica OAuth integration tests before the production Docker build.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT App setup](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, and the MCP package version must match. CI validates this before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
