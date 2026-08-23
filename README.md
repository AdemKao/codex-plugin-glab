# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository contains:

1. the **GitLab Self-Hosted** plugin and workflow skills; and
2. the GitLab MCP server implementation used by hosted or self-managed deployments.

> **Status:** v0.5.7 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Default installation: GitHub marketplace root

The normal package reference is:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Starting with v0.5.7, installing the repository marketplace root installs a plugin that is **already bound to the hosted remote MCP endpoint**:

```text
https://gitlab-mcp.blacmarcs.com/mcp
```

The committed plugin manifest loads:

```text
mcpServers: "./.mcp.json"
```

and the committed `.mcp.json` points directly at the hosted HTTPS endpoint above.

For the normal ChatGPT/Codex path you therefore do **not** need to:

- run an MCP server on your own computer;
- generate a personal/ChatGPT marketplace variant;
- maintain a second repository;
- copy a ChatGPT App/connection technical ID; or
- replace the root package with a localhost package.

Install the marketplace root, select **GitLab Self-Hosted**, and complete the OAuth flow when the client requests authentication. The client follows the remote MCP server's OAuth discovery metadata and GitLab authorization flow.

A harmless first test is:

```text
List the GitLab groups and projects I can access.
```

## Package identity

The third-party plugin identifier is deliberately namespaced as:

```text
gitlab-self-hosted
```

The generic `gitlab` identifier can collide with OpenAI's curated GitLab integration. Do not use the old `gitlab@ademkao-codex-plugins` reference for this repository.

## Default architecture

```text
ChatGPT / Codex
      |
      | marketplace root installs GitLab Self-Hosted
      v
plugins/gitlab-self-hosted/.mcp.json
      |
      | Streamable HTTP + OAuth
      v
https://gitlab-mcp.blacmarcs.com/mcp
      |
      | per-user GitLab OAuth identity
      v
GitLab REST API v4
```

OAuth credentials and GitLab tokens remain on the MCP/OAuth boundary; users should never paste GitLab PATs into chat.

## Localhost development fallback

The bundled MCP server can still be run locally for development. This is an explicit fallback, not the normal install path.

Run the MCP server locally, then generate the local marketplace:

```bash
python3 scripts/build_local_variant.py
```

The generated package is:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

and overrides the source binding with:

```text
http://127.0.0.1:3333/mcp
```

Use this only when you intentionally want the MCP server and client on the same development machine.

## Optional custom-remote override

The root marketplace already uses `https://gitlab-mcp.blacmarcs.com/mcp`. If an operator wants a different public HTTPS deployment, the backwards-compatible helper remains available:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

This is an advanced override, not a requirement for normal users.

## Optional ChatGPT App/connection-bound helper

`scripts/build_chatgpt_variant.py` is also retained for workspaces that explicitly need a plugin bound to an already-existing ChatGPT MCP App/connection technical ID. It is **not required** for the default root installation and it is not an OpenAI managed App Template.

The generated App-bound artifact deliberately removes the source direct MCP binding and uses `apps: "./.app.json"` instead.

See [docs/chatgpt-app.md](docs/chatgpt-app.md) for details.

## Self-hosting the MCP server

Operators who want to deploy their own endpoint can use the included MCP server. A local development start is:

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# edit .env
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

For per-user OAuth, configure a GitLab OAuth Application and deploy behind public HTTPS. A typical deployment includes:

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Production multi-replica OAuth persistence should use PostgreSQL:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

The server supports MCP OAuth discovery, PKCE S256, CIMD, and DCR compatibility.

## OAuth endpoints

OAuth mode exposes:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
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

Writes require `GITLAB_WRITE_ENABLED=true`. Merge requests also require `GITLAB_MERGE_ENABLED=true`. OAuth write operations additionally require `gitlab:write`, and GitLab's own permissions remain authoritative.

The server does not expose a generic arbitrary GitLab API proxy.

## Supported MCP tools

Read workflows include authenticated-user lookup, groups/projects, branches/commits, repository tree/files, issues, merge requests/diffs, pipelines/jobs, and traces.

Write workflows include issue/MR create-update-comment, branches, repository-file commits, MR approval/discussions, pipeline create/retry/cancel, and guarded merge operations. Destructive tools are annotated accordingly.

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/gitlab-self-hosted/
  .codex-plugin/plugin.json        # loads ./.mcp.json
  .mcp.json                        # hosted default: https://gitlab-mcp.blacmarcs.com/mcp
  workspace-binding/
    .mcp.local.json.example        # localhost development fallback
    .app.json.example              # optional existing-App binding helper
  skills/
packages/mcp-server/
scripts/build_local_variant.py
scripts/build_personal_variant.py
scripts/build_chatgpt_variant.py
scripts/validate_plugin.py
docs/
VERSION
```

## Development and CI

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
cd packages/mcp-server
npm install
npm run check
```

GitHub Actions also builds the production Docker image. Validation locks the root package to the hosted HTTPS endpoint, verifies the local fallback overrides it with localhost, verifies optional custom-remote and App-bound variants, rejects unsafe remote URLs, and keeps `VERSION`, plugin metadata, package metadata, and runtime version synchronized.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT / Codex integration](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## License

MIT. See [LICENSE](LICENSE).
