# Changelog

All notable changes to this project will be documented here.

The format is inspired by Keep a Changelog, and plugin versions follow semantic versioning while the project remains in early preview.

## [Unreleased]

### Planned

- Per-user OAuth passthrough between MCP clients and GitLab.
- Additional repository file/write and MR review/approval tools.
- Broader GitLab Self-Managed compatibility fixtures.
- Capability probing across GitLab versions.

## [0.3.0] - 2026-08-23

### Added

- A bundled self-hosted GitLab MCP server under `packages/mcp-server`.
- GitLab.com and GitLab Self-Managed host selection through `GITLAB_HOST`.
- Personal/project/group token and OAuth bearer-token authentication to the GitLab REST API.
- Read tools for user, groups, projects, branches, commits, issues, merge requests/diffs, pipelines, jobs, and job traces.
- Controlled write tools for issues, merge requests, branch creation, and MR merge.
- `GITLAB_ALLOWED_PROJECTS` allowlisting, read-only-by-default behavior, and an independent merge enable flag.
- MCP endpoint bearer protection for remote/self-hosted deployments.
- Dockerfile, Docker Compose, `.env.example`, health endpoint, TypeScript tests, and production container validation.
- `VERSION` as the release version source checked against the plugin and MCP package.

### Changed

- The default plugin MCP endpoint now targets the bundled local server at `http://127.0.0.1:3333/mcp` instead of GitLab's native MCP endpoint.
- Project positioning now treats the bundled MCP server and ChatGPT/Codex plugin as two first-class parts of the same repository.
- GitLab's native MCP is optional rather than required.
- CI now validates repository structure, MCP tests, TypeScript build, and Docker build.
- ChatGPT guidance now expects a remotely deployed HTTPS MCP endpoint and a separate authentication boundary.

### Security

- Write tools remain disabled unless `GITLAB_WRITE_ENABLED=true` is explicitly configured.
- Merge remains disabled unless both write and merge flags are enabled.
- Non-loopback MCP binds require `MCP_AUTH_TOKEN` unless unauthenticated mode is explicitly acknowledged for use behind a separate trusted tunnel or gateway.
- The MCP server exposes explicit tools rather than a generic arbitrary GitLab API proxy.

## [0.2.0] - 2026-08-23

### Added

- ChatGPT Web integration guide using GitLab's official remote MCP server.
- Codex / ChatGPT Web / ChatGPT mobile capability matrix.
- Workspace app-binding template for `.app.json`.
- `scripts/build_chatgpt_variant.py` to generate an app-bound plugin package without modifying the portable source plugin.
- Git-ignored `dist/` output for workspace-specific plugin variants.

### Changed

- Clarified that GitLab.com does not require this project to host a duplicate MCP server.
- Updated the plugin manifest to v0.2.0 and documented optional ChatGPT app binding.
- Reframed the roadmap around GitLab official MCP + ChatGPT App integration rather than a custom hosted MCP proxy.
- Documented current OpenAI surface/plan constraints, including web-only Custom MCP Apps as of 2026-08-23.

## [0.1.0] - 2026-08-23

### Added

- Marketplace-ready Codex GitLab plugin scaffold.
- GitLab hosted MCP configuration.
- General GitLab, setup, publish, review-feedback, and CI-debugging skills.
- Hybrid MCP + local `git`/`glab` routing.
- English and Traditional Chinese documentation.
- Open-source governance files and plugin validation CI.
