# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository ships two first-class parts:

1. a GitLab plugin with workflow skills and safe routing; and
2. a self-hosted GitLab MCP server backed by the GitLab REST API.

> **Status:** v0.4.0 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Why self-host

GitLab's native MCP offering can have availability or group/instance prerequisites that do not fit every GitLab.com or Self-Managed installation. This project therefore ships its own MCP server and treats GitLab's native MCP as optional.

The bundled server works with GitLab.com, GitLab Self-Managed, and GitLab Dedicated as long as the target GitLab instance exposes the REST APIs used by the enabled tools.

## Architecture

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP + OAuth or shared bearer
            v
+-----------------------------------+
| codex-plugin-glab MCP server      |
| - MCP tool schemas                |
| - OAuth / auth boundary           |
| - read/write/merge policy         |
| - project allowlist               |
+----------------+------------------+
                 |
                 | per-user OAuth token
                 | or shared service token
                 v
       GitLab REST API v4
                 |
                 v
       GitLab.com / Self-Managed
```

The Codex plugin still uses local `git` / `glab` when a task needs local working-tree state, commit, or push behavior.

## Authentication modes

### 1. Shared-token mode

Backward-compatible with v0.3. One GitLab identity is shared by the MCP deployment.

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

Use this for a trusted single-user deployment, CI/service integration, or a private workspace where one service identity is intentional.

### 2. Per-user OAuth mode

Each ChatGPT/Codex/MCP user authorizes their own GitLab identity. The server no longer needs a shared `GITLAB_TOKEN`.

Create a GitLab OAuth application whose callback is:

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
OAUTH_STORE_PATH=/data/oauth-store.json
```

The OAuth flow is:

```text
MCP client
   |
   | Protected Resource Metadata
   v
codex-plugin-glab OAuth gateway
   |
   | authorization code + PKCE
   v
GitLab OAuth
   |
   | user's GitLab access/refresh token
   v
Encrypted MCP OAuth store
   |
   | MCP access/refresh token
   v
MCP client -> /mcp -> GitLab as that user
```

GitLab recommends authorization code with PKCE. The server uses PKCE both downstream with the MCP client and upstream with GitLab. Current MCP clients can use Dynamic Client Registration; CIMD support is planned as the newer MCP registration path matures.

## Quick start with Docker

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# edit .env for shared-token or oauth mode
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

The MCP endpoint is:

```text
http://127.0.0.1:3333/mcp
```

For ChatGPT or another remote MCP client, deploy behind HTTPS and use the resulting `https://.../mcp` endpoint.

## OAuth endpoints

In `MCP_AUTH_MODE=oauth`, the server exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

Unauthenticated `/mcp` requests return `401` with a `WWW-Authenticate` header pointing clients to Protected Resource Metadata.

## Safety defaults

The server starts conservative:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Optional project restriction:

```bash
GITLAB_ALLOWED_PROJECTS=123,group/backend,group/frontend
```

Write tools require `GITLAB_WRITE_ENABLED=true`. Merge additionally requires `GITLAB_MERGE_ENABLED=true`.

OAuth adds another independent boundary: non-GET GitLab API calls also require the session's `gitlab:write` scope. A client cannot bypass the server-wide write, merge, or project policy merely by requesting a broader OAuth scope.

## OAuth security

- Production `PUBLIC_BASE_URL` must use HTTPS.
- Downstream MCP OAuth requires PKCE S256.
- GitLab OAuth also uses PKCE S256.
- GitLab access/refresh tokens are encrypted at rest with AES-256-GCM.
- MCP authorization codes, access tokens, and refresh tokens are stored only as SHA-256 hashes.
- Dynamically registered confidential-client secrets use scrypt hashes.
- OAuth state and authorization codes are single-use and short-lived.
- MCP refresh tokens rotate when used.
- GitLab access tokens are refreshed automatically before expiry.
- Docker Compose persists the encrypted store in `/data`; protect `OAUTH_ENCRYPTION_KEY` separately from that volume.

## Supported MCP tools

### Read

- current authenticated GitLab user
- groups and projects
- project metadata
- branches and commits
- issues
- merge requests and diffs
- pipelines
- pipeline jobs and job traces

### Write

- create/update/comment issues
- create/update/comment merge requests
- create branches
- merge merge requests with a separate merge safety flag

The server intentionally does **not** expose a generic arbitrary GitLab API proxy.

## ChatGPT

For per-user ChatGPT access, deploy the server with `MCP_AUTH_MODE=oauth`, expose it through HTTPS, and create a Custom MCP App using your `/mcp` URL. The client should discover OAuth from the server rather than receiving a GitLab PAT from the user.

OpenAI plan/workspace availability can change independently of this repository. See [docs/chatgpt-app.md](docs/chatgpt-app.md).

## Codex plugin

The portable plugin lives at:

```text
plugins/gitlab/
```

Its default `.mcp.json` targets the bundled local server at `http://127.0.0.1:3333/mcp`.

For local development:

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

Then add the `gitlab` marketplace entry from `.agents/plugins/marketplace.json` to your personal marketplace configuration and restart Codex.

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/gitlab/                 # ChatGPT/Codex plugin assets and skills
packages/mcp-server/            # self-hosted GitLab MCP server
  src/auth-context.ts
  src/oauth-crypto.ts
  src/oauth-store.ts
  src/oauth-gateway.ts
Dockerfile
docker-compose.yml
.env.example
docs/
scripts/validate_plugin.py
VERSION
```

## Development

Repository validation:

```bash
python3 scripts/validate_plugin.py
```

MCP tests and build:

```bash
cd packages/mcp-server
npm install
npm run check
```

Production container:

```bash
docker build -t codex-plugin-glab .
```

CI requires repository validation, all MCP unit tests, TypeScript strict build, and production Docker build before merge.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT App setup](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, and the MCP package version must match. CI validates this before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

MIT. See [LICENSE](LICENSE).
