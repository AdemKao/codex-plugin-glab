# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## v0.5.1 Server capabilities

| Capability | Bundled MCP Server | 說明 |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity 或目前 OAuth user |
| Groups / projects | Read | 支援 project allowlist filtering |
| Branches | Read / create | Create 需要 write authorization |
| Commits | Read | 可指定 ref |
| Repository tree | Read | 支援 path/ref/recursive/pagination |
| Repository files | Read / create / update / delete | Write 會建立 Git commit；delete 為 destructive |
| Issues | Read / create / update / comment | Write 預設關閉 |
| Merge requests | Read / create / update / comment | Write 預設關閉 |
| MR diffs | Read | Paginated GitLab API |
| MR approve/unapprove | Write | 需 write policy/scope 與 GitLab permission |
| MR discussions | Create | 建立 discussion thread |
| Merge MR | Optional write | 需 write + merge flags 與 GitLab permission |
| Pipelines | Read / create / retry / cancel | Cancel 為 destructive |
| Pipeline jobs/traces | Read | 包含 job trace/log |
| 任意 GitLab API proxy | 不支援 | 只提供明確 tools |
| Local working tree | 不處理 | 由 client/plugin local `git` 負責 |
| Local commit/push | 不處理 | 由 client/plugin `git` / `glab` 負責 |

## Authentication / deployment

| Capability | v0.5.1 |
| --- | --- |
| Shared service identity | 支援 (`MCP_AUTH_MODE=shared-token`) |
| Per-user GitLab OAuth | 支援 (`MCP_AUTH_MODE=oauth`) |
| Protected Resource Metadata | 支援 |
| Authorization Server Metadata | 支援 |
| Downstream PKCE S256 | OAuth mode 必須 |
| GitLab OAuth PKCE S256 | 支援 |
| `gitlab:read` / `gitlab:write` | 支援 |
| CIMD | 支援，新版建議路徑 |
| DCR | 支援，compatibility fallback |
| CIMD SSRF controls | HTTPS/no redirect/private-network block/size+timeout/host allowlist |
| Encrypted file OAuth store | 支援，single-node |
| PostgreSQL OAuth store | 支援，multi-replica |
| 跨 replica atomic state/code consume | 支援 |
| Atomic refresh-token rotation | 支援 |
| GitLab token 自動 refresh | 支援 |
| Docker Compose PostgreSQL profile | 支援 |
| PostgreSQL CI integration tests | 支援 |
| ChatGPT remote URL validator | 支援 | 只允許安全的 HTTPS `/mcp` remote profile |
| ChatGPT live MCP doctor | 支援 | 驗證 OAuth metadata 與未登入 challenge |
| Workspace-specific `.app.json` generator | 支援 | 需要已由 ChatGPT workspace 建立的 App/connector ID |
| 安裝 plugin 時自動建立任意 ChatGPT Custom MCP App | 不支援 | 這是平台 consent/admin boundary，不應由 repo 靜默繞過 |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex | Portable plugin + localhost/remote bundled MCP；必要時 local `git` / `glab` fallback |
| ChatGPT | Public HTTPS MCP -> 明確 Custom MCP App creation/consent -> generated workspace app-bound plugin variant |
| 其他 MCP client | `/mcp` + shared bearer 或 OAuth discovery / CIMD / DCR |

Portable source `.mcp.json` 會保留 `http://127.0.0.1:3333/mcp` 給 local Codex。ChatGPT remote binding 透過 `scripts/chatgpt_mcp_doctor.py` 與 `scripts/build_chatgpt_variant.py --app-id ... --mcp-url https://.../mcp` 完成，不修改 source localhost 設定。

Client 產品可用性、plan limit、approval UI 與 write permission 由各 MCP client 控制，可能獨立於本 repo 改變。

## Policy layers

Write 需要 server policy；OAuth mode 還要 `gitlab:write`。Project allowlist 一直有效。MR merge 額外要求 `GITLAB_MERGE_ENABLED=true`。GitLab 本身的 project permission 永遠是最後一層授權。

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際 compatibility 取決於 GitLab version 與各 tool/authentication mode 使用的 REST / OAuth endpoint 是否存在。
