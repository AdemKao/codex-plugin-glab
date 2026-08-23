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

## v0.5.1 — Initial ChatGPT remote binding UX

已完成：

- remote OAuth MCP URL validator 與 live doctor；
- 針對已存在 App/connector 的 workspace-specific `.app.json` binding generation；
- 保留 local Codex 使用的 localhost `.mcp.json`；
- generated binding 與 unsafe URL rejection 的 CI coverage；
- 明確的 platform consent boundary 文件。

## v0.5.2 — Codex remote MCP / OAuth installation UX

已完成：

- Personal/Codex remote self-host 安裝明確改為 **Add server -> remote HTTPS `/mcp` -> OAuth discovery**；
- `plugins/gitlab/.mcp.json` 維持 localhost local fallback，不再拿來承擔 remote deployment 設定；
- `plugins/gitlab/workspace-binding/.app.json.example` 與 `scripts/build_chatgpt_variant.py` 明確定位為「既有 App/connector 的 workspace binding helper」；
- 移除容易誤導的 `app-template/` source path，validator 會防止此語意回歸；
- generated binding metadata 明確要求 workspace App/connector 必須已存在，並標示本 repo 不會產生 OpenAI managed workspace App Template；
- managed workspace App Template / provisioning 改成獨立的 platform/admin 路徑說明；
- remote MCP doctor 語意改成 Codex/ChatGPT 都可用的 OAuth deployment validation；
- README、繁中、ChatGPT docs、setup skill、capability matrix、roadmap、CHANGELOG 同步成相同安裝模型；
- plugin、MCP package、runtime、tooling user agent 與 release version 同步為 `0.5.2`。

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
