# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

Completed in this release:

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

## v0.4 — Per-user identity and OAuth

Planned:

- OAuth-capable MCP authorization flow;
- per-user GitLab identity/token mapping;
- refresh-token handling;
- multi-user workspace isolation;
- documented reverse-proxy and hosted deployment examples.

## v0.5 — Deeper GitLab workflows

Planned candidates:

- repository file reads/writes;
- commit creation through GitLab API where appropriate;
- MR approval/review APIs;
- pipeline retry/cancel/trigger tools;
- labels, milestones, releases, and members;
- more granular project/tool policy configuration.

## Compatibility and quality

Ongoing:

- fixtures for GitLab Self-Managed versions;
- API capability probing;
- contract tests for tool schemas;
- security review of authentication and write boundaries;
- documentation parity between English and Traditional Chinese.

The GitLab native MCP server remains an optional alternative/backend path, not a dependency.
