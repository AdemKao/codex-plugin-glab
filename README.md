# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The same repository contains:

1. the `GitLab Self-Hosted` workflow plugin; and
2. the GitLab MCP server that can be deployed behind HTTPS with per-user OAuth.

> **Status:** v0.5.8 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Default setup: remote-first and user-configured

Install the repository marketplace root and use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The public source plugin is intentionally **endpoint-neutral**. It does not contain a maintainer-specific MCP hostname, it does not silently select `localhost`, and it does not publish a private deployment URL.

For the normal remote setup:

1. Install the marketplace root from this repository.
2. In ChatGPT, Codex, or another compatible MCP client, configure the remote HTTPS endpoint that belongs to the user or workspace, for example:

   ```text
   https://gitlab-mcp.example.com/mcp
   ```

3. Complete the MCP server's OAuth discovery and GitLab authorization flow.
4. Verify a harmless read such as listing accessible groups or projects before enabling writes.

This path does **not** require running the MCP server on the user's laptop, does not require `build_personal_variant.py`, does not require `build_chatgpt_variant.py`, and does not require a second repository.

### Why the URL is not `${GITLAB_MCP_URL}`

Current Agent Plugin HTTP MCP configuration requires an actual absolute HTTP/HTTPS URL. Arbitrary install-time variables are not expanded inside the HTTP `url` field. A committed `.mcp.json` therefore cannot safely be both automatically active and independently editable for every user's private hostname.

For that reason, this repository keeps the public plugin endpoint-neutral and keeps the real remote URL in the user's or workspace's MCP/App configuration. The neutral example is stored at:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

Do not commit organization-specific MCP endpoints or OAuth secrets into the public plugin.

## ChatGPT app-binding note

A plugin package and an authenticated MCP App/connection are separate layers. On ChatGPT surfaces that require an explicit app dependency for plugin-backed tools, a static public plugin cannot dynamically guess or inherit an arbitrary user-created MCP connection ID.

The normal endpoint-neutral setup is still the preferred path when the client exposes the user's configured MCP tools directly. For managed workspaces, a platform App Template can represent workspace-specific configuration when such a template is available. This repository does not claim to ship an OpenAI-managed App Template.

The legacy `build_chatgpt_variant.py` helper remains for environments that explicitly require binding the plugin to an already-existing ChatGPT MCP App/connection technical ID, but it is no longer the default installation path.

## Localhost is development fallback only

If you are developing the bundled MCP server on the same machine as Codex, the local fallback remains available:

```bash
python3 scripts/build_local_variant.py
```

That generated development marketplace binds:

```text
http://127.0.0.1:3333/mcp
```

The repository root marketplace never selects that localhost URL automatically.

## Deploying the bundled MCP server

The MCP server supports GitLab.com, GitLab Self-Managed, and GitLab Dedicated as long as the target instance exposes the REST APIs used by the enabled tools.

For per-user OAuth, deploy it behind HTTPS and configure a GitLab OAuth application whose callback uses your own host:

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Example environment:

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Single replica OAuth persistence:

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

For multi-replica production deployment:

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

The PostgreSQL backend makes authorization-state consumption, authorization-code consumption, and MCP refresh-token rotation atomic across replicas.

## OAuth discovery

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

An unauthenticated `/mcp` request returns `401` with OAuth Protected Resource Metadata so compatible clients can discover the authorization flow. The server supports Client ID Metadata Documents (CIMD) and Dynamic Client Registration (DCR) compatibility.

Validate a deployment with:

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

## Safety defaults

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
GITLAB_ALLOWED_PROJECTS=
```

Writes require `GITLAB_WRITE_ENABLED=true`. Merge requests additionally require `GITLAB_MERGE_ENABLED=true`. In OAuth mode, write operations also require the session's `gitlab:write` scope. Deployment flags, allowlists, OAuth scopes, and GitLab permissions are all enforced independently.

The server intentionally does not expose a generic arbitrary GitLab API proxy.

## Supported MCP tools

Read workflows include authenticated user, groups, projects, branches, commits, repository tree/files, issues, merge requests/diffs, pipelines, jobs, and traces.

Write workflows include issue/MR creation and updates, comments, branch creation, repository-file commits, approvals, MR discussions, pipeline actions, and MR merge when the separate merge safety flag is enabled.

## Repository layout

```text
.agents/plugins/marketplace.json
plugins/gitlab-self-hosted/
  .codex-plugin/plugin.json
  workspace-binding/.mcp.remote.json.example   # neutral remote reference
  workspace-binding/.mcp.local.json.example    # localhost development fallback
  workspace-binding/.app.json.example          # legacy explicit app-binding helper input
  skills/
packages/mcp-server/
  src/
  tests/
scripts/
  build_local_variant.py       # explicit localhost development marketplace
  build_personal_variant.py    # legacy explicit remote artifact helper
  build_chatgpt_variant.py     # legacy existing-App binding helper
  chatgpt_mcp_doctor.py
  validate_plugin.py
  validate_oauth.py
  validate_chatgpt_binding.py
  validate_public_config.py
```

## Development and validation

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
python3 scripts/validate_public_config.py

cd packages/mcp-server
npm install
npm run check
```

CI also builds the production Docker image. `validate_public_config.py` protects the public package from accidentally committing a real maintainer or organization MCP `/mcp` endpoint.

## Documentation

- [ChatGPT / Codex remote MCP setup](docs/chatgpt-app.md)
- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, the MCP package version, and the runtime-reported version must match. CI validates the release metadata before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
