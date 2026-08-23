# Changelog

All notable changes to this project will be documented here.

The format is inspired by Keep a Changelog, and plugin versions follow semantic versioning while the project remains in early preview.

## [Unreleased]

### Planned

- Capability probing and compatibility fixtures across more GitLab Self-Managed versions.
- More granular per-tool and per-project authorization policy.
- Observability, audit events, and operational metrics for hosted deployments.
- Additional GitLab release/member/milestone workflows.

## [0.5.6] - 2026-08-23

### Fixed

- Corrected the ChatGPT setup model after reproducing the case where the repository plugin is visible and OAuth completes successfully, but the conversation still has no GitLab tools because the portable plugin is not bound to that authenticated MCP connection.
- Reframed the ChatGPT helper around an existing **MCP App/connection technical ID** rather than implying that installing the plugin repository creates or automatically attaches a separate App.
- Added the preferred `--connection-id` option to `scripts/build_chatgpt_variant.py`; `--app-id` remains a backwards-compatible alias.
- Generated `.chatgpt-setup.json` now records `connection_id`, explicitly states that the helper does not create the MCP connection or run OAuth, and no longer claims that explicit ChatGPT App creation is performed by the helper.

### Changed

- ChatGPT setup documentation now separates four layers: portable plugin, native/direct MCP connection, ChatGPT MCP App/connection, and the generated connection-bound plugin variant.
- Plugin README, Traditional Chinese documentation, and the `gitlab-setup` skill now explain that `Authentication complete` proves the OAuth callback succeeded but does not prove the portable plugin acquired a tool binding.
- Added `scripts/validate_chatgpt_binding.py` and CI coverage for the preferred `--connection-id` flow, generated `.app.json`, connection metadata, and the legacy `--app-id` alias.
- Synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime-reported version at v0.5.6.

### Security

- User/workspace-specific MCP connection technical IDs remain outside the portable public plugin and are written only to generated marketplace output.
- Remote MCP URL validation remains unchanged: ChatGPT binding generation still requires a public HTTPS `/mcp` URL and rejects unsafe local/private/credential-bearing targets.

## [0.5.5] - 2026-08-23

### Fixed

- Added `scripts/build_personal_variant.py` for users who want the installed `GitLab Self-Hosted` plugin to call a remote HTTPS MCP server directly.
- Generated personal marketplace artifacts replace the localhost fallback with the requested validated `/mcp` endpoint without requiring a ChatGPT App/connector ID.
- Kept the portable source plugin and its same-host localhost fallback unchanged.

### Changed

- Documented the difference between direct MCP setup, the portable local plugin, the personal remote plugin variant, and the App-bound ChatGPT variant.
- Synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime-reported version at v0.5.5.

### Security

- Personal remote variant generation reuses the existing HTTPS, public-host, and `/mcp` URL validation; credentials and OAuth secrets remain outside generated plugin artifacts.

## [0.5.4] - 2026-08-23

### Fixed

- Fixed package resolution ambiguity where the third-party plugin's generic internal identifier `gitlab` could resolve to OpenAI's curated GitLab plugin instead of this repository's self-hosted package.
- Renamed the source plugin folder, marketplace entry, and plugin manifest name to the distinct `gitlab-self-hosted` identifier.
- Updated the generated ChatGPT App-bound marketplace to use `gitlab-self-hosted@ademkao-gitlab-chatgpt` and a namespaced `gitlab-self-hosted` App binding key.
- Added validation that rejects the legacy `plugins/gitlab` package, generic `gitlab` marketplace entries, folder/manifest/marketplace identity mismatches, and generated artifacts that recreate the collision-prone generic package.

### Changed

- Portable/local plugin reference is now `gitlab-self-hosted@ademkao-codex-plugins`.
- Generated ChatGPT App-bound plugin reference is now `gitlab-self-hosted@ademkao-gitlab-chatgpt`.
- The user-facing display name is now **GitLab Self-Hosted** while MCP tool names remain unchanged.
- English and Traditional Chinese root/plugin READMEs, ChatGPT integration docs, and setup skill now document the v0.5.4 package-identity migration and troubleshooting order: verify package resolution first, then App binding/OAuth.
- Synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime-reported version at v0.5.4.

### Security

- Workspace-specific App/connector IDs remain outside the portable public source package by default.
- Generated App-bound packages still remove the localhost `.mcp.json` / `mcpServers` dependency and require explicit marketplace import/installation.
- Remote MCP URL safety checks continue to reject non-HTTPS, localhost, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints.

## [0.5.3] - 2026-08-23

### Fixed

- Fixed the ChatGPT package-selection gap where PR #15 produced a correct App-only plugin copy but the repository root marketplace still installed the portable localhost-oriented source package. OAuth could therefore succeed on a separately-added remote MCP server while `@GitLab` still exposed no GitLab tools.
- `scripts/build_chatgpt_variant.py` now emits a complete workspace-specific marketplace source under `dist/gitlab-chatgpt-marketplace/`, including `.agents/plugins/marketplace.json` and the App-bound `plugins/gitlab` copy.
- The generated ChatGPT plugin contains `apps: "./.app.json"`, no `mcpServers`, and no `.mcp.json`, preventing the source localhost fallback from competing with the workspace App binding.
- CIMD native-client loopback redirects can now match ChatGPT/Codex-style ephemeral ports when metadata registers a portless `http://127.0.0.1/...` or `http://localhost/...` callback. The exception remains limited to the same loopback host and path with no credentials, query, or fragment; public and explicitly ported redirects remain exact-match only.

### Changed

- The generated marketplace is named `ademkao-gitlab-chatgpt`, with plugin reference `gitlab@ademkao-gitlab-chatgpt`, so it is explicitly distinct from the portable repository marketplace `ademkao-codex-plugins`.
- Generated `.chatgpt-setup.json` records that the artifact is workspace-specific, requires an existing ChatGPT App/connector, requires explicit marketplace import/installation, and does not modify an already-installed plugin.
- Generated output now includes a README warning that workspace-specific App/connector IDs should live in an appropriate controlled marketplace source unless their portability is explicitly documented.
- Repository validation now builds and inspects the generated marketplace layout, verifies its App binding and marketplace path/policy, and rejects any generated package that retains the localhost MCP dependency.
- English and Traditional Chinese root/plugin READMEs, ChatGPT integration docs, and the setup skill now distinguish direct Codex/native MCP setup, the portable root marketplace/local fallback, and the workspace-specific ChatGPT App-bound marketplace source.
- Synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime-reported version at v0.5.3.

### Security

- The workspace binding helper continues to reject HTTP, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints.
- The source repository does not embed a maintainer- or workspace-specific App/connector ID; generated workspace-specific output remains under ignored `dist/` by default.
- The live MCP doctor continues to reject non-public DNS resolutions and verifies OAuth discovery metadata and the unauthenticated `/mcp` challenge before connection.

## [0.5.2] - 2026-08-23

### Fixed

- Corrected the self-hosted MCP/OAuth installation UX for personal/Codex users: the primary path is now **Add server -> Streamable HTTP -> remote HTTPS `/mcp` -> OAuth discovery/authentication**.
- Removed the implication that `.app.json`, a workspace app/connector ID, or `scripts/build_chatgpt_variant.py` is required for direct personal/Codex remote MCP setup.
- Removed the implication that the repository's `.app.json.example` or binding builder is an OpenAI native/managed App Template.

### Changed

- Preserved `plugins/gitlab/.mcp.json` at `http://127.0.0.1:3333/mcp` as an explicit same-host/local Codex fallback rather than a remote-install configuration.
- Moved the optional helper input from `plugins/gitlab/app-template/.app.json.example` to `plugins/gitlab/workspace-binding/.app.json.example` to remove App Template naming ambiguity.
- Repositioned `scripts/build_chatgpt_variant.py` as an optional **workspace binding helper** for an already-existing workspace app/connector ID.
- Generated `.chatgpt-setup.json` now identifies itself as workspace-binding-helper output, requires an existing workspace app/connector, and explicitly states that it is not an OpenAI managed App Template.
- Managed workspace App Templates are documented as a separate administrator/platform feature with their own guided setup, review, publication, and access-management flow.
- Synchronized the English and Traditional Chinese README, ChatGPT/Codex integration docs, setup skill, capability matrix, roadmap, and release documentation around the same installation model.
- Synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime-reported version at v0.5.2.

### Security

- Direct remote setup continues to require a public HTTPS `/mcp` endpoint for OAuth deployments.
- The live MCP doctor continues to reject non-public DNS resolutions and verifies Protected Resource Metadata, Authorization Server Metadata, and the unauthenticated `/mcp` OAuth challenge before connection.
- The optional workspace binding helper continues to reject HTTP, localhost, loopback, private/link-local literal IPs, embedded credentials, query/fragment data, and non-`/mcp` endpoints.

## [0.5.1] - 2026-08-23

### Added

- First-class ChatGPT remote MCP binding workflow for Issue #8.
- `scripts/chatgpt_binding.py` with deterministic HTTPS `/mcp` URL validation and optional DNS/public-address checks.
- `scripts/chatgpt_mcp_doctor.py` to verify Protected Resource Metadata, Authorization Server Metadata, and the unauthenticated `/mcp` OAuth challenge before connecting ChatGPT.
- Workspace-specific `.chatgpt-setup.json` output documenting the remote MCP endpoint, App/connector ID, explicit ChatGPT App creation boundary, and doctor command.
- CI coverage that builds a fake ChatGPT-bound variant and rejects HTTP, localhost, loopback, link-local, private-network, and non-`/mcp` remote URLs.

### Changed

- `scripts/build_chatgpt_variant.py` requires both `--app-id` and `--mcp-url`, validates the remote endpoint, and leaves the portable localhost Codex configuration untouched.
- ChatGPT setup documentation made the platform consent boundary explicit; v0.5.2 further clarified that this binding is optional rather than the primary personal/Codex remote MCP setup path.
- Plugin, MCP package, and release version are synchronized at v0.5.1.

### Security

- ChatGPT remote binding generation rejects embedded URL credentials, query/fragment data, localhost, loopback, private, link-local, multicast, reserved, and unspecified literal IP targets.
- The live doctor resolves DNS and rejects any resolved non-public address before making HTTP requests.
- Generated workspace App IDs and setup artifacts remain under ignored `dist/` output and are not committed to the portable source plugin.

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
