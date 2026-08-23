# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

Completed:

- bundled TypeScript MCP server;
- GitLab.com / Self-Managed host selection;
- server-side PAT / bearer authentication;
- core project/group/issue/MR/repository/CI reads;
- controlled issue/MR/branch writes and MR merge;
- project allowlist and conservative write/merge defaults;
- Docker deployment, tests, and release automation.

## v0.4.0 — Per-user identity and OAuth

Completed:

- Protected Resource Metadata and Authorization Server Metadata;
- per-user GitLab OAuth identity mapping;
- downstream and upstream PKCE S256;
- DCR compatibility;
- MCP access/refresh tokens and rotation;
- automatic GitLab token refresh;
- encrypted single-node OAuth persistence;
- independent `gitlab:read` / `gitlab:write` scope enforcement.

## v0.5.0 — Production OAuth and deeper GitLab workflows

Completed:

- Client ID Metadata Documents (CIMD) support with DCR fallback;
- CIMD SSRF/redirect/size/timeout/host validation;
- pluggable OAuth store contract;
- encrypted PostgreSQL OAuth/session backend;
- cross-replica atomic state and authorization-code consumption;
- atomic refresh-token rotation;
- concurrent GitLab token-refresh recovery;
- PostgreSQL 17 CI integration tests;
- full OAuth authorize/callback/token/refresh smoke tests;
- repository tree/file read and file create/update/delete tools;
- MR approve/unapprove/discussion tools;
- pipeline create/retry/cancel tools;
- Docker Compose PostgreSQL profile and migration documentation.

## v0.5.1 — Initial workspace binding helper

Completed:

- live remote MCP doctor for Protected Resource Metadata, Authorization Server Metadata, and unauthenticated `/mcp` OAuth challenge checks;
- public HTTPS `/mcp` URL validation with unsafe target rejection;
- an initial workspace-specific `.app.json` binding generator;
- preserved localhost `.mcp.json` for local Codex;
- CI coverage for helper generation and unsafe URL rejection.

v0.5.2 refines the product positioning introduced in v0.5.1 so that this optional binding helper is no longer presented as the primary personal/Codex installation path or as an OpenAI native App Template.

## v0.5.2 — Direct Codex MCP / OAuth installation UX

Completed:

- personal/Codex remote setup now explicitly follows **Add server -> Streamable HTTP -> remote HTTPS `/mcp` -> OAuth discovery/authentication**;
- direct remote OAuth no longer requires `.app.json`, a workspace app/connector ID, or `build_chatgpt_variant.py`;
- portable `plugins/gitlab/.mcp.json` remains the localhost `http://127.0.0.1:3333/mcp` fallback for same-host local use;
- moved the helper input from `app-template/.app.json.example` to `workspace-binding/.app.json.example` to remove App Template ambiguity;
- repositioned `build_chatgpt_variant.py` as an optional **workspace binding helper** that requires an existing workspace app/connector ID;
- generated helper metadata and CI validation explicitly state that the output is not an OpenAI managed App Template;
- documented managed workspace App Templates as a separate administrator/platform feature rather than a repository-provided template;
- synchronized English / Traditional Chinese README, ChatGPT/Codex setup docs, setup skill, capability matrix, roadmap, and changelog;
- synchronized `VERSION`, plugin manifest, MCP package, and MCP runtime version to `0.5.2`.

## v0.6 — Policy, observability, and compatibility

Planned candidates:

- per-tool policy allow/deny configuration;
- group/project-scoped policy rules beyond a flat allowlist;
- audit events for OAuth sign-in, write tools, destructive tools, and merge actions;
- Prometheus/OpenTelemetry-compatible operational metrics;
- rate-limit/backpressure visibility;
- GitLab Self-Managed version compatibility fixtures and capability probing;
- labels, milestones, releases, members, and additional CI/CD operations;
- hardened secret/key rotation procedures for hosted deployments.

## Compatibility and quality

Ongoing:

- live OAuth interoperability testing against GitLab.com and representative Self-Managed versions;
- API capability probing;
- tool schema and OAuth endpoint contract tests;
- security review of authorization, CIMD metadata fetching, encrypted persistence, and write boundaries;
- English / Traditional Chinese documentation parity.

GitLab native MCP remains an optional alternative, not a dependency.
