# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities

| Capability | Bundled MCP server | Notes |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity 或目前 OAuth user |
| Groups / projects | Read | 可搭配 project allowlist |
| Branches | Read / create | Create 需要 write authorization |
| Commits | Read | 可指定 ref |
| Repository tree/files | Read / create / update / delete | Write 會建立 Git commit；delete 為 destructive |
| Issues | Read / create / update / comment | 預設關閉 write |
| Merge requests | Read / create / update / comment | 預設關閉 write |
| MR diffs / approvals / discussions | Read / write | 受 GitLab permission 與 write policy 限制 |
| Merge MR | Optional write | 需要 write + merge flags |
| Pipelines | Read / create / retry / cancel | Cancel 為 destructive |
| Pipeline jobs/traces | Read | Job trace/log read |
| Arbitrary GitLab API proxy | No | 只提供明確 tools |
| Local working tree | No | 使用 local `git` / `glab` |

## Authentication / deployment

| Capability | Status |
| --- | --- |
| Shared service identity | Yes (`MCP_AUTH_MODE=shared-token`) |
| Per-user GitLab OAuth | Yes (`MCP_AUTH_MODE=oauth`) |
| Protected Resource Metadata | Yes |
| Authorization Server Metadata | Yes |
| Downstream PKCE S256 | OAuth mode 必須 |
| GitLab OAuth PKCE S256 | Yes |
| `gitlab:read` / `gitlab:write` | Yes |
| Client ID Metadata Documents (CIMD) | Yes |
| Dynamic Client Registration (DCR) | Compatibility fallback |
| Encrypted file OAuth store | Yes，單節點 |
| PostgreSQL OAuth store | Yes，多 replicas |
| User/workspace 自行設定 remote MCP | Yes |
| Public source plugin 內嵌 maintainer MCP endpoint | No |
| Public source plugin 自動載入 localhost | No |
| Localhost development variant | Yes，explicit generated fallback |
| Existing-App binding helper | Yes，僅 compatibility |
| Repo helper 是 OpenAI managed App Template | No |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex / 支援 custom remote MCP 的 Client | 安裝 plugin + 設定 user/workspace 自己的 HTTPS `/mcp` endpoint + OAuth |
| 直接提供 user-configured MCP tools 的 ChatGPT surface | 直接使用已 authenticate 的 user/workspace MCP connection |
| 要求 explicit plugin app dependency 的 ChatGPT surface | 優先使用可攜的 platform app/template binding；必要時才用 legacy existing-connection helper |
| Local development | 使用 `scripts/build_local_variant.py` 產生 localhost variant |

Repository-root plugin 刻意保持 endpoint-neutral。中性範例在 `plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example`；真實 organization endpoint 應存在 user/workspace 設定，而不是 public plugin。

## Policy layers

Write operation 需要 server policy；OAuth mode 還需要 `gitlab:write`。Project allowlist 仍具有最高限制；MR merge 另外需要 `GITLAB_MERGE_ENABLED=true`。GitLab 自身 permission 是最後一道 authorization。

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際相容性取決於 GitLab version 與各 tool 所需 REST/OAuth endpoint 是否可用。
