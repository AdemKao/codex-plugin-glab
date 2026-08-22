# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

Completed:

- bundled TypeScript MCP server;
- GitLab.com / Self-Managed host selection;
- server-side PAT / bearer authentication to GitLab REST API;
- read tools for projects, groups, issues, merge requests, branches, commits, pipelines, jobs, and traces;
- controlled issue/MR/branch writes and MR merge;
- project allowlist;
- read-only and merge-off safety defaults;
- MCP endpoint bearer protection;
- Docker / Compose deployment;
- tests, build validation, and automated release workflow.

## v0.4.0 — Per-user identity and OAuth

Completed:

- built-in MCP Protected Resource Metadata and OAuth authorization-server discovery;
- per-user GitLab OAuth identity/token mapping;
- downstream authorization-code + PKCE S256;
- independent upstream GitLab authorization-code + PKCE S256;
- Dynamic Client Registration compatibility;
- MCP access/refresh token issuance and rotation;
- automatic GitLab refresh-token handling;
- encrypted persistent OAuth state;
- independent `gitlab:read` / `gitlab:write` authorization with server-side policy still authoritative;
- Docker persistence for the encrypted single-node OAuth store;
- backward-compatible shared-token mode.

## v0.5 — OAuth interoperability and deeper GitLab workflows

Planned candidates:

- Client ID Metadata Documents (CIMD) alongside the existing DCR compatibility path;
- transactional/shared OAuth storage backend for HA and multiple replicas;
- repository file reads/writes;
- commit creation through GitLab API where appropriate;
- MR approval/review APIs;
- pipeline retry/cancel/trigger tools;
- labels, milestones, releases, and members;
- more granular project/tool policy configuration.

## Compatibility and quality

Ongoing:

- fixtures for GitLab Self-Managed versions;
- live OAuth interoperability testing against GitLab.com and representative Self-Managed releases;
- API capability probing;
- contract tests for tool schemas and OAuth endpoints;
- security review of authorization, encrypted persistence, and write boundaries;
- documentation parity between English and Traditional Chinese.

The GitLab native MCP server remains an optional alternative/backend path, not a dependency.
