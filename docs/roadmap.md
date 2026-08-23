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

## v0.5.1–v0.5.6 — Installation and binding experiments

Completed across these releases:

- remote MCP doctor and public HTTPS `/mcp` URL validation;
- direct MCP OAuth installation guidance;
- workspace/App binding helper experiments;
- package identity migration to `gitlab-self-hosted`;
- local, custom-remote, and App-bound generated variants;
- ChatGPT MCP connection-ID compatibility helpers;
- regression coverage for unsafe URL rejection and generated binding artifacts.

These releases exposed an important UX problem: a marketplace-root plugin that did not carry its own direct remote MCP binding still forced users to configure or generate a second binding layer before the plugin could expose GitLab tools.

## v0.5.7 — Hosted MCP as the marketplace-root default

Completed:

- repository-root `gitlab-self-hosted` now ships `mcpServers: "./.mcp.json"`;
- committed `.mcp.json` points directly to `https://gitlab-mcp.blacmarcs.com/mcp`;
- normal ChatGPT/Codex installation becomes root marketplace -> remote HTTPS MCP -> OAuth;
- no local MCP process, generated marketplace variant, second repository, or ChatGPT connection technical ID is required for the default path;
- `build_local_variant.py` is retained as a development-only override to `http://127.0.0.1:3333/mcp`;
- `build_personal_variant.py` is retained as an optional custom-remote override;
- `build_chatgpt_variant.py` is retained as an optional existing-App/connection compatibility path and removes the source direct MCP binding in generated output;
- validators lock the hosted root endpoint and test all override invariants;
- English / Traditional Chinese installation docs, capability matrix, setup skill, and changelog are synchronized;
- release metadata is synchronized at `0.5.7`.

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
