# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository ships two first-class parts:

1. a GitLab plugin with workflow skills and safe routing; and
2. a self-hosted GitLab MCP server backed by the GitLab REST API.

> **Status:** v0.5.2 / early preview.
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
  single node   -> encrypted file store
  multi replica -> PostgreSQL store
```

The Codex plugin still uses local `git` / `glab` when a task needs local working-tree state, commit, or push behavior.

## Installation paths

### Personal / Codex remote MCP — recommended remote path

After deploying the bundled server behind public HTTPS, configure the remote server directly in Codex:

1. choose **Add server**;
2. choose the remote HTTP/HTTPS MCP option;
3. enter the exact endpoint, for example `https://gitlab-mcp.example.com/mcp`;
4. let Codex follow OAuth discovery from the unauthenticated MCP `401` challenge and Protected Resource Metadata;
5. complete the browser GitLab OAuth flow;
6. verify a harmless read before enabling writes.

In OAuth mode you do not paste a GitLab PAT into Codex. The MCP server owns the GitLab OAuth boundary and stores GitLab credentials server-side.

### Local Codex fallback

The portable plugin deliberately keeps:

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

Use this when Codex and the MCP server run on the same machine. Do not overwrite the source `.mcp.json` with a maintainer/private remote URL just to configure a remote client.

### Managed ChatGPT workspace

When a managed ChatGPT workspace provides an admin-controlled App or App Template provisioning feature, use that **platform/admin** workflow and point it at the validated public HTTPS `/mcp` endpoint.

This repository does **not** publish, generate, or emulate an OpenAI-native managed workspace App Template. OpenAI controls that template/provisioning format, lifecycle, plan availability, approval, and consent behavior.

If the workspace already has an App/connector and gives you its ID, this repository provides an optional workspace binding helper; see [Workspace binding helper](#workspace-binding-helper-for-an-existing-chatgpt-appconnector).

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

Each remote MCP user authorizes their own GitLab identity. Create a GitLab OAuth application whose callback is:

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

v0.5+ supports both:

- **Client ID Metadata Documents (CIMD)** — preferred for modern MCP clients.
- **Dynamic Client Registration (DCR)** — retained as a compatibility fallback.

CIMD clients use an HTTPS metadata URL as `client_id`. The server verifies exact client ID matching, redirect URIs, supported grants, and blocks private/loopback/link-local metadata targets by default.

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

The local MCP endpoint is `http://127.0.0.1:3333/mcp`. Remote clients must use a public HTTPS endpoint.

## Validate a remote OAuth MCP deployment

Before adding a remote server to Codex/ChatGPT or a managed workspace, run:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The doctor verifies:

- the URL is HTTPS and resolves only to public addresses;
- Protected Resource Metadata is reachable;
- Authorization Server Metadata is reachable and internally consistent; and
- unauthenticated `/mcp` returns the OAuth `401` challenge with `resource_metadata`.

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

## Workspace binding helper for an existing ChatGPT App/connector

Only use this after the target workspace App/connector already exists and you have its ID:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

The command creates ignored `dist/gitlab-chatgpt/` output containing:

- `.app.json` with the existing workspace App/connector binding;
- a patched `plugin.json` with `apps: "./.app.json"`; and
- `.chatgpt-setup.json` documenting the remote MCP endpoint and explicit provisioning boundary.

The source example is `plugins/gitlab/workspace-binding/.app.json.example`. It is a **workspace binding helper input**, not an OpenAI-native App Template.

The source plugin and localhost `.mcp.json` are not modified. The builder rejects HTTP, localhost, loopback, link-local/private literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints.

See [docs/chatgpt-app.md](docs/chatgpt-app.md) for the distinction between personal/Codex remote setup, local fallback, managed workspace provisioning, and the optional existing-App binding helper.

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

## Codex plugin

The portable plugin lives at `plugins/gitlab/`. Its checked-in `.mcp.json` is the localhost fallback, not the configuration source for personal remote servers.

For local plugin development:

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

Then add the `gitlab` marketplace entry from `.agents/plugins/marketplace.json` to your personal marketplace configuration and restart Codex.

For a remote self-hosted deployment, configure the server through Codex **Add server** instead of patching the portable `.mcp.json`.

## Repository layout

```text
plugins/gitlab/                         # ChatGPT/Codex plugin assets and skills
  .mcp.json                            # localhost Codex fallback
  workspace-binding/.app.json.example # existing-App workspace binding example
packages/mcp-server/
  src/oauth-gateway.ts                 # MCP OAuth, CIMD/DCR, GitLab OAuth
  src/oauth-store.ts                   # encrypted file backend + store contract
  src/postgres-oauth-store.ts          # multi-replica PostgreSQL backend
  src/register-tools.ts                # core GitLab tools
  src/register-v05-tools.ts            # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
scripts/build_chatgpt_variant.py       # existing-App workspace binding helper
scripts/chatgpt_binding.py             # remote URL validation helpers
scripts/chatgpt_mcp_doctor.py          # live remote OAuth/MCP deployment checks
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

CI builds a fake existing-App workspace binding variant, verifies unsafe remote URL rejection, starts PostgreSQL 17 for multi-replica OAuth integration tests, runs TypeScript strict build, and builds the production Docker image.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Remote MCP / ChatGPT setup](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, the MCP package version, and runtime version must match. CI validates the release sources before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
