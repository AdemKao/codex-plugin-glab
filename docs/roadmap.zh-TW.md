# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

本版完成：

- bundled TypeScript MCP Server；
- GitLab.com / Self-Managed host 選擇；
- server-side PAT / bearer 連 GitLab REST API；
- projects、groups、issues、MR、branches、commits、pipelines、jobs、traces read tools；
- 受控的 issue/MR/branch writes 與 MR merge；
- project allowlist；
- read-only、merge-off 安全預設；
- MCP endpoint bearer protection；
- Docker / Compose deployment；
- tests、build validation 與 automated release workflow。

## v0.4 — Per-user identity and OAuth

規劃：

- OAuth-capable MCP authorization flow；
- per-user GitLab identity/token mapping；
- refresh-token handling；
- multi-user workspace isolation；
- reverse proxy 與 hosted deployment 範例。

## v0.5 — Deeper GitLab workflows

候選項目：

- repository file reads/writes；
- 適合時透過 GitLab API 建立 commit；
- MR approval/review APIs；
- pipeline retry/cancel/trigger tools；
- labels、milestones、releases、members；
- 更細緻的 project/tool policy。

## Compatibility and quality

持續進行：

- GitLab Self-Managed version fixtures；
- API capability probing；
- tool schema contract tests；
- authentication / write boundary security review；
- 英文與繁中核心文件同步。

GitLab native MCP 仍可作為 optional alternative/backend path，但不是 dependency。
