# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

已完成：

- bundled TypeScript MCP Server；
- GitLab.com / Self-Managed host 選擇；
- server-side PAT / bearer authentication；
- 核心 project/group/issue/MR/repository/CI read tools；
- 受控的 issue/MR/branch writes 與 MR merge；
- project allowlist、read-only / merge-off 安全預設；
- Docker deployment、tests 與 release automation。

## v0.4.0 — Per-user identity and OAuth

已完成：

- Protected Resource Metadata 與 Authorization Server Metadata；
- per-user GitLab OAuth identity mapping；
- downstream / upstream PKCE S256；
- DCR compatibility；
- MCP access / refresh token 與 rotation；
- GitLab token 自動 refresh；
- encrypted single-node OAuth persistence；
- `gitlab:read` / `gitlab:write` 獨立 enforcement。

## v0.5.0 — Production OAuth 與更深 GitLab workflows

已完成：

- CIMD（Client ID Metadata Documents）+ DCR fallback；
- CIMD SSRF / redirect / size / timeout / host validation；
- pluggable OAuth store contract；
- encrypted PostgreSQL OAuth/session backend；
- 跨 replica atomic OAuth state / authorization-code consume；
- atomic refresh-token rotation；
- concurrent GitLab token refresh recovery；
- PostgreSQL 17 CI integration tests；
- 完整 OAuth authorize/callback/token/refresh smoke tests；
- repository tree/file read 與 file create/update/delete tools；
- MR approve/unapprove/discussion tools；
- pipeline create/retry/cancel tools；
- Docker Compose PostgreSQL profile 與 migration 文件。

## v0.5.1 — Initial workspace binding helper

已完成：

- live remote MCP doctor，驗證 Protected Resource Metadata、Authorization Server Metadata 與未登入 `/mcp` OAuth challenge；
- public HTTPS `/mcp` URL validation 與 unsafe target rejection；
- initial workspace-specific `.app.json` binding generator；
- 保留 local Codex 使用的 localhost `.mcp.json`；
- CI 驗證 helper generation 與 unsafe URL rejection。

v0.5.2 重新整理 v0.5.1 引入的產品定位，避免 optional binding helper 被誤解成 personal/Codex 的主要安裝方式，或被誤稱為 OpenAI 原生 App Template。

## v0.5.2 — Direct Codex MCP / OAuth installation UX

已完成：

- personal/Codex remote setup 明確改成 **Add server -> Streamable HTTP -> remote HTTPS `/mcp` -> OAuth discovery/authentication**；
- direct remote OAuth 不再需要 `.app.json`、workspace App / connector ID 或 `build_chatgpt_variant.py`；
- portable `plugins/gitlab/.mcp.json` 保留 `http://127.0.0.1:3333/mcp`，作為 same-host local fallback；
- helper input 從 `app-template/.app.json.example` 移到 `workspace-binding/.app.json.example`，消除 App Template 命名歧義；
- `build_chatgpt_variant.py` 重新定位成 optional **workspace binding helper**，且要求 existing workspace App / connector ID；
- generated helper metadata 與 CI validation 明確聲明 output 不是 OpenAI managed App Template；
- managed workspace App Templates 獨立說明為 administrator / platform feature，而不是本 repo 提供的 template；
- 同步英文 / 繁中 README、ChatGPT/Codex setup docs、setup skill、capability matrix、roadmap、CHANGELOG；
- `VERSION`、plugin manifest、MCP package 與 MCP runtime version 同步到 `0.5.2`。

## v0.6 — Policy、observability、compatibility

候選項目：

- per-tool allow/deny policy；
- 更細的 group/project scoped policy；
- OAuth sign-in、write、destructive、merge audit events；
- Prometheus / OpenTelemetry operational metrics；
- rate-limit / backpressure visibility；
- GitLab Self-Managed version fixtures 與 capability probing；
- labels、milestones、releases、members 與更多 CI/CD operations；
- hosted deployment 的 secret / encryption-key rotation procedures。

## Compatibility and quality

持續進行：

- GitLab.com 與代表性 Self-Managed 版本的 live OAuth interoperability tests；
- API capability probing；
- tool schema / OAuth endpoint contract tests；
- authorization、CIMD metadata fetch、encrypted persistence、write boundary security review；
- 英文 / 繁中核心文件 parity。

GitLab native MCP 仍是 optional alternative，不是 dependency。
