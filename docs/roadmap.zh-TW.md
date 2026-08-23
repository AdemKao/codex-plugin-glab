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

## v0.5.1 — ChatGPT remote App binding UX

已完成：

- Issue #8 的 first-class remote ChatGPT binding generator；
- workspace binding 必須提供 `--app-id` + `--mcp-url`；
- public HTTPS `/mcp` URL validation 與 unsafe target rejection；
- live ChatGPT MCP doctor，驗證 Protected Resource Metadata、Authorization Server Metadata 與未登入 `/mcp` OAuth challenge；
- 產生 `.app.json` 與 `.chatgpt-setup.json`，不修改 portable source plugin；
- 保留 local Codex 使用的 localhost `.mcp.json`；
- CI 建立 fake ChatGPT-bound variant 並驗證 unsafe URL rejection；
- 文件明確說明 ChatGPT Custom MCP App creation / consent boundary。

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
