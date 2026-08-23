# Changelog

All notable changes to this project will be documented here.

The format is inspired by Keep a Changelog, and plugin versions follow semantic versioning while the project remains in early preview.

## [Unreleased]

### Planned

- Capability probing and compatibility fixtures across more GitLab Self-Managed versions.
- More granular per-tool and per-project authorization policy.
- Observability, audit events, and operational metrics for hosted deployments.
- Additional GitLab release/member/milestone workflows.

## [0.5.0] - 2026-08-23

### Added

- MCP Client ID Metadata Documents (CIMD) support while retaining Dynamic Client Registration as a compatibility fallback.
- CIMD security controls: HTTPS-only client IDs, exact `client_id` matching, redirect validation, response-size limits, bounded caching, optional hostname allowlists, and DNS/private-network SSRF protection.
- Pluggable OAuth persistence through a common store interface.
- PostgreSQL-backed OAuth persistence for multi-replica deployments with encrypted record payloads.
- Atomic PostgreSQL consumption of OAuth state and authorization codes through `DELETE ... RETURNING`.
- Atomic MCP refresh-token rotation through conditional updates so the same refresh token cannot succeed on two replicas.
- PostgreSQL migration/schema and an optional Docker Compose PostgreSQL profile.
- CI PostgreSQL 17 integration tests that exercise concurrent state/code consumption and refresh-token rotation.
- Full OAuth smoke coverage for authorize -> GitLab callback -> MCP token -> authenticated session -> refresh rotation.
- Repository tree/file read tools plus repository file create/update/delete tools.
- Merge-request approve/unapprove and discussion tools.
- Pipeline create/retry/cancel tools.

### Changed

- The MCP runtime now targets Node.js 22 or newer.
- OAuth storage defaults to the encrypted file backend for backward compatibility; `OAUTH_STORE_DRIVER=postgres` is recommended for horizontally scaled production deployments.
- Authorization-server metadata now advertises `client_id_metadata_document_supported` when CIMD is enabled.
- OAuth gateway persistence is asynchronous so file and PostgreSQL backends use the same authorization flow.
- GitLab token refresh can recover when another replica has already refreshed the same session.
- CI now starts PostgreSQL and validates the production OAuth storage path in addition to repository validation, TypeScript strict build, and Docker build.

### Security

- CIMD metadata fetching rejects redirects and private/loopback/link-local targets by default to reduce SSRF risk.
- CIMD document size and fetch time are bounded.
- GitLab OAuth tokens remain encrypted at rest for both file and PostgreSQL stores.
- MCP access/refresh tokens and authorization codes remain persisted as hashes only.
- Repository, MR, and pipeline write tools still require both server-wide write policy and `gitlab:write` in OAuth mode.
- File deletion and pipeline cancellation are marked destructive; MR merge remains separately gated by `GITLAB_MERGE_ENABLED`.
- The server continues to expose explicit tools rather than a generic arbitrary GitLab API proxy.

## [0.4.0] - 2026-08-23

### Added

- Per-user OAuth mode for ChatGPT, Codex, and other remote MCP clients while retaining the v0.3 shared-token deployment mode.
- MCP OAuth Protected Resource Metadata and authorization-server metadata endpoints.
- Dynamic Client Registration for current MCP-client compatibility.
- Mandatory downstream PKCE S256 and an independent GitLab authorization-code + PKCE flow.
- Per-user GitLab identity resolution, MCP access/refresh token issuance, refresh-token rotation, and automatic GitLab token refresh.
- Encrypted persistent OAuth state for registered clients, authorization transactions, authorization codes, and sessions.
- Persistent `/data` Docker volume and runtime permissions for the encrypted OAuth store.
- OAuth tests covering configuration, PKCE, encrypted persistence, discovery metadata, DCR, and write-scope gating.

### Changed

- GitLab REST credentials are now resolved per MCP request in OAuth mode instead of being permanently bound to one server-wide token.
- `MCP_AUTH_MODE` now selects `shared-token` or `oauth`; `shared-token` remains the backward-compatible default.
- OAuth deployments use `PUBLIC_BASE_URL`, a GitLab OAuth application, and `OAUTH_ENCRYPTION_KEY` instead of `MCP_AUTH_TOKEN` and `GITLAB_TOKEN`.
- GitLab API write requests in OAuth mode require both server-side write policy and the requesting OAuth session's `gitlab:write` scope.
- The bundled server reports v0.4.0 and keeps the plugin/MCP package/release version synchronized through `VERSION`.

### Security

- GitLab OAuth access and refresh tokens are encrypted at rest with AES-256-GCM.
- MCP authorization codes, access tokens, and refresh tokens are persisted only as SHA-256 hashes.
- Dynamically registered confidential client secrets are stored as scrypt hashes.
- OAuth state is single-use and time-limited; authorization codes are single-use and time-limited.
- Production OAuth origins require HTTPS, redirect URIs are validated and matched against the registered client, and OAuth responses include the issuer (`iss`).
- The existing `GITLAB_WRITE_ENABLED`, `GITLAB_MERGE_ENABLED`, and project allowlist controls remain authoritative regardless of OAuth scopes.

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
