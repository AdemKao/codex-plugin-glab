# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab integration for **ChatGPT, Codex, and MCP clients**. The repository ships two first-class parts:

1. a GitLab plugin with workflow skills and safe routing; and
2. a self-hosted GitLab MCP server that talks directly to the GitLab REST API.

> **Status:** v0.3.0 / early preview.
>
> **Third-party project:** this repository is not an official GitLab or OpenAI project and is not endorsed by either company.

## Why the self-hosted server exists

GitLab has an official MCP offering, but its availability and prerequisites can make it unsuitable for some GitLab.com groups or Self-Managed installations. `codex-plugin-glab` therefore no longer requires GitLab's native MCP server.

The bundled server uses the normal GitLab REST API, so the same integration can target GitLab.com, GitLab Self-Managed, or GitLab Dedicated as long as the configured token and GitLab version expose the requested APIs.

## Architecture

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP
            v
+-------------------------------+
| codex-plugin-glab MCP server  |
| - tool schemas                |
| - auth boundary               |
| - read/write policy           |
| - project allowlist           |
+---------------+---------------+
                |
                | GitLab REST API v4
                v
      GitLab.com / Self-Managed
```

The Codex plugin adds GitLab-specific workflow skills and can still use local `git` / `glab` when a task needs local working-tree state, commit, or push behavior.

## Quick start: self-host the MCP server

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
```

Edit `.env` and set at least:

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

Then run:

```bash
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

The local MCP endpoint is:

```text
http://127.0.0.1:3333/mcp
```

For a remote ChatGPT connection, deploy the same container behind HTTPS and configure the resulting `https://.../mcp` endpoint in your ChatGPT Custom MCP App. Do not expose a server-side GitLab token through an unauthenticated public endpoint.

## Safety defaults

The server intentionally starts conservative:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Optional project restriction:

```bash
GITLAB_ALLOWED_PROJECTS=123,group/backend,group/frontend
```

Write tools require `GITLAB_WRITE_ENABLED=true`. Merge additionally requires `GITLAB_MERGE_ENABLED=true`, so enabling normal issue/MR writes does not silently enable merge.

A non-loopback MCP bind requires `MCP_AUTH_TOKEN` unless `MCP_ALLOW_INSECURE_NO_AUTH=true` is explicitly set. The insecure mode is intended only for a separately authenticated private tunnel or gateway.

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

The server does not expose a generic arbitrary GitLab API proxy.

## GitLab authentication

The first self-hosted release supports a server-side GitLab token:

```bash
GITLAB_TOKEN_TYPE=private-token
GITLAB_TOKEN=...
```

or:

```bash
GITLAB_TOKEN_TYPE=bearer
GITLAB_TOKEN=...
```

Use the least-privileged token that covers the tools you enable. OAuth-per-user passthrough is planned for a later release; v0.3.0 is primarily a single-user or trusted-workspace deployment model.

## ChatGPT

ChatGPT connects to remote MCP servers. Deploy this repository's MCP server to an HTTPS endpoint, protect it with a supported authentication layer, then create a Custom MCP App and scan its tools.

Current ChatGPT plan/workspace capabilities are controlled by OpenAI and can change independently of this repository. See [docs/chatgpt-app.md](docs/chatgpt-app.md) for the integration flow and security notes.

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

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT App setup](docs/chatgpt-app.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Capability matrix](docs/capability-matrix.md)
- [Roadmap](docs/roadmap.md)
- [Support](SUPPORT.md)
- [Security](SECURITY.md)

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Versioning

`VERSION`, the plugin manifest, and the MCP package version must match. CI validates this before merge. User-visible changes are recorded in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
