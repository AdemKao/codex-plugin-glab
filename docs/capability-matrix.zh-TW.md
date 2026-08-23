# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## v0.5.2 Server capabilities

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

| Capability | v0.5.2 |
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
| Remote HTTPS `/mcp` validator | 支援 | 拒絕不安全 local/private literal target |
| Live remote OAuth MCP doctor | 支援 | 驗證 OAuth metadata 與未登入 challenge |
| Personal/Codex **Add server -> remote HTTPS `/mcp` -> OAuth discovery** | 支援 | Remote self-host 建議安裝路徑 |
| Localhost `.mcp.json` | 支援 | Local Codex fallback：`http://127.0.0.1:3333/mcp` |
| Workspace-specific `.app.json` binding helper | 支援 | 需要已存在的 ChatGPT App/connector ID |
| OpenAI-native managed workspace App Template generator | 不支援 | 這是平台/admin 功能；本 repo 不定義也不模擬 |
| 安裝 plugin 時自動建立任意 ChatGPT App | 不支援 | 平台 consent/admin boundary |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Personal / Codex remote | **Add server** -> remote HTTPS `/mcp` -> OAuth discovery -> GitLab browser authorization |
| Codex local fallback | Portable plugin `.mcp.json` -> `http://127.0.0.1:3333/mcp`；working tree 由 local `git` / `glab` 處理 |
| ChatGPT existing App/connector | Public HTTPS `/mcp` -> 明確 App/connector provisioning -> 可選 `build_chatgpt_variant.py` workspace binding helper |
| ChatGPT managed workspace App Template | 使用平台/admin provisioning 功能（若 workspace 提供）；指向已驗證 HTTPS `/mcp`；不是由本 repo 產生 |
| 其他 MCP client | `/mcp` + shared bearer 或 OAuth discovery / CIMD / DCR |

Portable source `.mcp.json` 保留 `http://127.0.0.1:3333/mcp` 作為 local fallback。Personal/Codex remote 安裝不需要修改這個檔案：直接在 client **Add server** 加入公開 HTTPS endpoint，讓 OAuth discovery 從 MCP `401` challenge 開始。

`scripts/build_chatgpt_variant.py` 與 `plugins/gitlab/workspace-binding/.app.json.example` 是針對**既有** ChatGPT App/connector 的 workspace binding helper，不是 OpenAI-native App Template implementation。

Client 產品可用性、plan limit、approval UI、managed workspace provisioning 與 write permission 由各 MCP client / platform 控制，可能獨立於本 repo 改變。

## Policy layers

Write 需要 server policy；OAuth mode 還要 `gitlab:write`。Project allowlist 一直有效。MR merge 額外要求 `GITLAB_MERGE_ENABLED=true`。GitLab 本身的 project permission 永遠是最後一層授權。

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際 compatibility 取決於 GitLab version 與各 tool/authentication mode 使用的 REST / OAuth endpoint 是否存在。
