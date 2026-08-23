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

## v0.5.1 — Initial ChatGPT remote binding UX

Completed:

- remote OAuth MCP URL validator and live doctor;
- workspace-specific `.app.json` binding generation for an already-created App/connector;
- preserved localhost `.mcp.json` for local Codex;
- CI coverage for generated binding output and unsafe URL rejection;
- explicit platform consent boundary documentation.

## v0.5.2 — Codex remote MCP / OAuth installation UX

Completed:

- personal/Codex remote self-host installation is documented as **Add server -> remote HTTPS `/mcp` -> OAuth discovery**;
- localhost `plugins/gitlab/.mcp.json` remains a local Codex fallback instead of being repurposed for remote deployments;
- `plugins/gitlab/workspace-binding/.app.json.example` and `scripts/build_chatgpt_variant.py` are explicitly scoped as workspace binding helpers for an existing App/connector;
- removed the misleading `app-template/` source path and added validation that prevents it from returning;
- generated binding metadata now states that an existing workspace App/connector is required and that this repository does not generate an OpenAI managed workspace App Template;
- managed workspace App Template/provisioning is documented separately as a platform/admin capability;
- remote MCP doctor wording is client-neutral for Codex/ChatGPT OAuth validation;
- README, Traditional Chinese docs, ChatGPT docs, setup skill, capability matrix, roadmap, and changelog synchronized to the same installation model;
- plugin, MCP package, runtime, tooling user agent, and release version synchronized at `0.5.2`.

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
