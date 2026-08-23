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

- CIMD + DCR fallback；
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

## v0.5.1–v0.5.6 — Installation / binding experiments

這幾個版本完成：

- remote MCP doctor 與 public HTTPS `/mcp` URL validation；
- direct MCP OAuth installation guidance；
- workspace/App binding helper experiments；
- package identity 改成 `gitlab-self-hosted`；
- local、custom-remote、App-bound generated variants；
- ChatGPT MCP connection-ID compatibility helpers；
- unsafe URL rejection 與 generated binding artifact regression tests。

這些版本也暴露了一個重要 UX 問題：如果 marketplace-root plugin 自己沒有 direct remote MCP binding，使用者仍必須另外設定或產生第二層 binding，plugin 才能真正 expose GitLab tools。

## v0.5.7 — Hosted MCP 成為 marketplace-root 預設

已完成：

- repository-root `gitlab-self-hosted` 直接包含 `mcpServers: "./.mcp.json"`；
- committed `.mcp.json` 直接指向 `https://gitlab-mcp.blacmarcs.com/mcp`；
- 一般 ChatGPT / Codex 安裝流程變成 root marketplace -> remote HTTPS MCP -> OAuth；
- 預設流程不需要 local MCP process、generated marketplace variant、第二個 repo 或 ChatGPT connection technical ID；
- `build_local_variant.py` 保留作 development-only override，指向 `http://127.0.0.1:3333/mcp`；
- `build_personal_variant.py` 保留作 optional custom-remote override；
- `build_chatgpt_variant.py` 保留作 optional existing-App/connection compatibility path，而且 generated output 會移除 source direct MCP binding；
- validator 會鎖定 hosted root endpoint，並測試全部 override invariant；
- 英文 / 繁中安裝文件、capability matrix、setup skill 與 changelog 同步；
- release metadata 同步到 `0.5.7`。

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
