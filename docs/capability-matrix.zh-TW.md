# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## v0.4.0 Server capabilities

| Capability | Bundled MCP Server | 說明 |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity 或目前 OAuth user |
| Groups | Read | 列出目前 GitLab identity 可見 groups |
| Projects | Read | Membership projects，可選 allowlist filter |
| Branches | Read / create | Create 需要 write policy；OAuth mode 還需 write scope |
| Commits | Read | 可指定 ref |
| Issues | Read / create / update / comment | Write 預設關閉 |
| Merge requests | Read / create / update / comment | Write 預設關閉 |
| MR diffs | Read | 使用 GitLab paginated API |
| Merge MR | Optional write | 需要 write flag、merge flag、OAuth write scope（適用時）與 GitLab permission |
| Pipelines | Read | Project pipeline inspection |
| Pipeline jobs | Read | 包含 job trace/log read |
| 任意 GitLab API proxy | 不支援 | 只提供明確 tools |
| Local working tree | 不處理 | 由 client/plugin 的 local `git` 負責 |
| Local commit/push | 不處理 | 由 client/plugin 的 `git` / `glab` 負責 |
| Shared GitLab service identity | 支援 | `MCP_AUTH_MODE=shared-token` |
| Per-user GitLab OAuth mapping | 支援 | `MCP_AUTH_MODE=oauth` |
| MCP OAuth discovery | 支援 | Protected Resource + authorization-server metadata |
| Downstream PKCE | 支援 | 必須使用 S256 |
| GitLab OAuth PKCE | 支援 | 獨立 S256 verifier/challenge |
| MCP refresh-token rotation | 支援 | Refresh token 使用後 rotation |
| GitLab token refresh | 支援 | OAuth session 需要時自動刷新 |
| Dynamic Client Registration | 支援 | Compatibility path；CIMD 後續加入 |
| Multi-replica OAuth store | 尚未 | Built-in store 是 single-node/file-based |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex | Plugin + bundled local/remote MCP；必要時使用 local `git` / `glab` fallback |
| ChatGPT | Remote HTTPS MCP；多人 deployment 建議在 workspace 支援 Custom MCP App 時使用 built-in OAuth |
| 其他 MCP client | 連 `/mcp`；依 deployment mode 使用 shared bearer 或 OAuth discovery |

Client 的產品可用性、plan limit、approval UI 與 write permission 都由各 MCP client 控制，可能獨立於此 repo 改變。

## Authentication matrix

| Boundary | v0.4.0 |
| --- | --- |
| `MCP_AUTH_MODE=shared-token` | 支援 |
| Shared MCP fixed bearer | 支援 (`MCP_AUTH_TOKEN`) |
| Shared unauthenticated loopback | 支援 |
| Shared unauthenticated public bind | 只能明確 opt-in，不建議 |
| GitLab `PRIVATE-TOKEN` | Shared mode 支援 |
| Server-wide OAuth-style GitLab bearer | Shared mode 支援 |
| `MCP_AUTH_MODE=oauth` | 支援 |
| Per-user OAuth identity | 支援 |
| Protected Resource Metadata | 支援 |
| OAuth authorization-server metadata | 支援 |
| DCR | 支援 |
| PKCE S256 | OAuth mode 必須 |
| `gitlab:read` / `gitlab:write` | 支援 |
| Encrypted OAuth persistence | 支援，single-node file store |
| CIMD | 規劃中 |

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際 compatibility 取決於 GitLab version 與各 tool/authentication mode 使用的 REST / OAuth endpoint 是否存在。
