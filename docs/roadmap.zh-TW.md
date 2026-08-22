# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.3.0 — Self-hosted MCP foundation

已完成：

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

## v0.4.0 — Per-user identity and OAuth

已完成：

- built-in MCP Protected Resource Metadata 與 OAuth authorization-server discovery；
- per-user GitLab OAuth identity / token mapping；
- downstream authorization-code + PKCE S256；
- 獨立的 upstream GitLab authorization-code + PKCE S256；
- Dynamic Client Registration compatibility；
- MCP access / refresh token issuance 與 rotation；
- GitLab refresh token 自動處理；
- encrypted persistent OAuth state；
- `gitlab:read` / `gitlab:write` 獨立授權，而且 server-side policy 仍是最高限制；
- Docker persistent encrypted single-node OAuth store；
- 保留 backward-compatible shared-token mode。

## v0.5 — OAuth interoperability 與更深 GitLab workflows

候選項目：

- Client ID Metadata Documents（CIMD），並保留現有 DCR compatibility path；
- transactional/shared OAuth storage backend，支援 HA / multiple replicas；
- repository file reads/writes；
- 適合時透過 GitLab API 建立 commit；
- MR approval/review APIs；
- pipeline retry/cancel/trigger tools；
- labels、milestones、releases、members；
- 更細緻的 project/tool policy。

## Compatibility and quality

持續進行：

- GitLab Self-Managed version fixtures；
- GitLab.com 與代表性 Self-Managed 版本的 live OAuth interoperability tests；
- API capability probing；
- tool schema / OAuth endpoint contract tests；
- authorization、encrypted persistence、write boundary security review；
- 英文與繁中核心文件同步。

GitLab native MCP 仍可作為 optional alternative/backend path，但不是 dependency。
