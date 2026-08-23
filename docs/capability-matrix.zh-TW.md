# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## v0.5.7 Server capabilities

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

| Capability | v0.5.7 |
| --- | --- |
| Marketplace-root direct MCP binding | 支援 | `mcpServers: "./.mcp.json"` |
| Marketplace-root hosted endpoint | 支援 | `https://gitlab-mcp.blacmarcs.com/mcp` |
| Remote HTTPS MCP + OAuth 作為正常安裝流程 | 支援 | 不需要 local MCP / build variant / 第二個 repo |
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
| localhost development fallback | 支援 | Generated local variant 覆寫為 `http://127.0.0.1:3333/mcp` |
| Optional custom remote override | 支援 | `build_personal_variant.py` 驗證並覆寫 HTTPS `/mcp` URL |
| Optional existing-App binding helper | 支援 | `build_chatgpt_variant.py`；root install 不需要 |
| Repository helper 是 OpenAI managed App Template | 不是 | Managed template 是另一個平台功能 |
| Remote URL validator / live MCP doctor | 支援 | 驗證 HTTPS `/mcp`、discovery metadata、未登入 challenge、DNS/public-address |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| ChatGPT / Codex 正常安裝 | Repository marketplace root -> `GitLab Self-Hosted` -> `https://gitlab-mcp.blacmarcs.com/mcp` -> OAuth discovery |
| Local development | 產生 `gitlab-self-hosted@ademkao-gitlab-local` -> `http://127.0.0.1:3333/mcp` |
| 明確需要既有 MCP App/connection 的 managed workspace | Optional App-bound helper；generated plugin 會移除 source direct MCP binding |
| 其他 MCP client | 依 client 能力使用 `/mcp` + shared bearer 或 OAuth discovery / CIMD / DCR |

Repository root package 本身即可直接使用 `https://gitlab-mcp.blacmarcs.com/mcp`。localhost、custom remote 與 App-bound package 都是明確 alternative，不是 prerequisite。

Client 產品可用性、plan limit、approval UI、managed-app 功能與 write permission 由各 MCP client / 平台控制，可能獨立於本 repo 改變。

## Policy layers

Write 需要 server policy；OAuth mode 還要 `gitlab:write`。Project allowlist 一直有效。MR merge 額外要求 `GITLAB_MERGE_ENABLED=true`。GitLab 本身的 project permission 永遠是最後一層授權。

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際 compatibility 取決於 GitLab version 與各 tool/authentication mode 使用的 REST / OAuth endpoint 是否存在。
