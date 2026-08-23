# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The same repository contains:

1. the `GitLab Self-Hosted` workflow plugin; and
2. the GitLab MCP server that can be deployed behind HTTPS with per-user OAuth.

> **Status:** v0.5.9 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Recommended ChatGPT setup: registered MCP App

The portable marketplace package is:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The public source plugin intentionally stays **endpoint-neutral**: it contains reusable skills and metadata, but no active workspace-specific `.app.json`, no maintainer-specific MCP hostname, and no automatically selected localhost server.

For ChatGPT plugin usage, the recommended setup is:

1. Deploy the MCP server behind a public HTTPS `/mcp` endpoint.
2. Enable ChatGPT Developer mode and register that MCP endpoint as an App/connection.
3. Complete OAuth and confirm the connection exposes the expected GitLab tools.
4. Copy the platform-generated technical ID. It starts with `plugin_asdk_app_`.
5. Build the App-bound marketplace variant:

   ```bash
   python3 scripts/build_chatgpt_app.py \
     --app-id plugin_asdk_app_REPLACE_ME \
     --mcp-url https://gitlab-mcp.example.com/mcp
   ```

6. Import/install the generated marketplace and use:

   ```text
   gitlab-self-hosted@ademkao-gitlab-chatgpt
   ```

The generated plugin contains `.app.json`, and its manifest declares:

```json
{
  "apps": "./.app.json"
}
```

The generated marketplace uses `authentication: ON_INSTALL`, so the registered App connection is treated as part of the plugin installation flow.

See [ChatGPT / Codex App integration](docs/chatgpt-app.md) for the full flow.

### Why the App ID is not committed

Registered ChatGPT MCP App IDs are platform-generated and normally belong to a specific user/workspace connection. A public Git repository cannot safely guess or dynamically inherit an arbitrary user's App ID at install time.

This repository therefore keeps two layers separate:

- **Portable source plugin:** public skills/metadata and no workspace-specific App ID.
- **Generated App-bound plugin:** `.app.json` plus `apps: "./.app.json"` for one registered `plugin_asdk_app_...` connection.

This avoids shipping a broken placeholder as an active dependency and avoids silently routing every user to a maintainer-controlled MCP deployment.

## Direct remote MCP fallback

Clients that expose custom MCP servers directly can still configure their own remote HTTPS endpoint, for example:

```text
https://gitlab-mcp.example.com/mcp
```

This remains useful for development, troubleshooting, and MCP-client testing. The neutral reference lives at:

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

Do not commit organization-specific MCP endpoints, App IDs, GitLab tokens, or OAuth secrets into the portable public plugin.

## Localhost is development fallback only

If you are developing the bundled MCP server on the same machine as Codex, generate the local variant explicitly:

```bash
python3 scripts/build_local_variant.py
```

That generated development marketplace binds:

```text
http://127.0.0.1:3333/mcp
```

The repository root marketplace never selects localhost automatically.

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
  workspace-binding/.app.json.example          # App-binding template input
  skills/
packages/mcp-server/
  src/
  tests/
scripts/
  build_chatgpt_app.py         # recommended registered ChatGPT App wrapper
  build_chatgpt_variant.py     # lower-level existing-App binding helper
  build_personal_variant.py    # explicit direct remote artifact helper
  build_local_variant.py       # explicit localhost development marketplace
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

CI also smoke-tests the registered-App packaging helper and builds the production Docker image. `validate_public_config.py` protects the public package from accidentally committing a real maintainer or organization MCP `/mcp` endpoint.

## Documentation

- [ChatGPT / Codex App integration](docs/chatgpt-app.md)
- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`, the plugin manifest, the MCP package version, and the runtime-reported version must match. CI validates the release metadata before merge. Release notes are taken from [CHANGELOG.md](CHANGELOG.md) when a matching section exists; otherwise the release workflow falls back to GitHub-generated notes.

## License

MIT. See [LICENSE](LICENSE).
