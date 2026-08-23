# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository ships two first-class parts:

1. a GitLab plugin with workflow skills and safe routing; and
2. a self-hosted GitLab MCP server backed by the GitLab REST API.

> **Status:** v0.5.3 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Why self-host

GitLab's native MCP offering can have availability or group/instance prerequisites that do not fit every GitLab.com or Self-Managed installation. This project therefore ships its own MCP server and treats GitLab's native MCP as optional.

The bundled server works with GitLab.com, GitLab Self-Managed, and GitLab Dedicated as long as the target instance exposes the REST APIs used by the enabled tools.

## Architecture

```text
ChatGPT / Codex / MCP client
            |
            | MCP over Streamable HTTP
            | OAuth or shared bearer
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

The local endpoint is `http://127.0.0.1:3333/mcp`. Remote clients should use a reachable HTTPS endpoint such as `https://gitlab-mcp.example.com/mcp`.

## Primary personal / Codex remote MCP setup

For a personal Codex host, the primary self-hosted OAuth path is to add the deployed MCP server directly. You do **not** need `.app.json`, `build_chatgpt_variant.py`, or a managed workspace App Template for this path.

1. Deploy the bundled server with `MCP_AUTH_MODE=oauth` behind HTTPS.
2. Validate it:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

3. In the ChatGPT desktop/Codex MCP settings, choose **Add server**.
4. Choose **Streamable HTTP** and enter the remote endpoint:

```text
https://gitlab-mcp.example.com/mcp
```

5. Save/restart when the client asks, then choose **Authenticate** when OAuth sign-in is shown.
6. Let the client follow the server's OAuth discovery metadata, complete GitLab authorization, and verify a harmless read first.

In OAuth mode, an unauthenticated `/mcp` request returns `401` with `WWW-Authenticate` pointing to Protected Resource Metadata. The server then exposes Authorization Server Metadata and CIMD/DCR support for compatible clients.

## Localhost `.mcp.json` fallback

The portable source plugin intentionally keeps:

```text
plugins/gitlab/.mcp.json -> http://127.0.0.1:3333/mcp
```

This is a **local fallback** for running the bundled server on the same Codex host. Do not replace the source file with a maintainer-specific public URL just to make remote OAuth work.

The repository root marketplace (`ademkao-codex-plugins`) points to this portable source plugin. Installing that root marketplace therefore does **not** turn a separately-added remote MCP connection into the `@GitLab` plugin's tool binding.

Local working-tree state, commits, and pushes remain local `git` / `glab` operations.

## ChatGPT App-bound marketplace helper

`plugins/gitlab/workspace-binding/.app.json.example` and `scripts/build_chatgpt_variant.py` are repository helpers for one narrow case: you already have a ChatGPT workspace App/connector ID for your remote MCP server and want an installable plugin marketplace that binds to that App.

They are **not an OpenAI native App Template**, are not required for personal/Codex direct MCP setup, and do not create or publish a ChatGPT App.

After an App/connector already exists, generate the workspace-specific marketplace:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Default output:

```text
dist/gitlab-chatgpt-marketplace/
  .agents/plugins/marketplace.json
  plugins/gitlab/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

The generated marketplace is named `ademkao-gitlab-chatgpt`, so its plugin reference is:

```text
gitlab@ademkao-gitlab-chatgpt
```

The generated ChatGPT plugin deliberately contains `apps: "./.app.json"`, contains **no** `mcpServers` entry, and contains **no** `.mcp.json`. This prevents the portable localhost fallback from competing with the connected App binding.

When you want `@GitLab` to use the remote App, import/install the **generated marketplace root**, not the repository's root `ademkao-codex-plugins` marketplace. The source plugin and source localhost `.mcp.json` remain unchanged.

Generated output is workspace-specific and ignored by git. Do not commit it to this public repository unless you intentionally understand the workspace-binding implications.

## Managed workspace App Templates are separate

OpenAI managed workspace **App Templates** are a separate platform feature for workspace admins/owners. A managed template provides a guided setup flow that can collect organization-specific configuration, create a workspace draft app, and let admins review/publish/manage access and actions.

This repository does **not** currently ship or claim to be an OpenAI managed App Template. If a future GitLab template is provided through the OpenAI platform/plugin directory, follow that managed workspace flow independently from this repository's optional binding helper.

See [docs/chatgpt-app.md](docs/chatgpt-app.md) for the full separation between direct remote MCP setup, local fallback, generated App-bound marketplace installation, and managed workspace administration.

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

## Repository layout

```text
plugins/gitlab/
  .mcp.json                              # localhost fallback
  workspace-binding/.app.json.example   # optional existing-app binding helper input
packages/mcp-server/
  src/oauth-gateway.ts                  # MCP OAuth, CIMD/DCR, GitLab OAuth
  src/oauth-store.ts                    # encrypted file backend + store contract
  src/postgres-oauth-store.ts           # multi-replica PostgreSQL backend
  src/register-tools.ts                 # core GitLab tools
  src/register-v05-tools.ts             # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
scripts/build_chatgpt_variant.py        # generates an App-bound ChatGPT marketplace artifact
scripts/chatgpt_binding.py              # remote URL validation helpers
scripts/chatgpt_mcp_doctor.py           # live OAuth/MCP deployment checks
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

CI validates repository structure and the generated ChatGPT marketplace artifact, asserts that its App-bound plugin cannot retain the source localhost MCP dependency, rejects unsafe remote URLs, starts PostgreSQL 17 for multi-replica OAuth integration tests, runs the TypeScript test/build gate, and builds the production Docker image.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT / Codex remote MCP setup](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, the MCP package version, and the runtime-reported version must match. CI validates the release metadata before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
