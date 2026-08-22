# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## v0.3.0 Server capabilities

| Capability | Bundled MCP Server | 說明 |
| --- | --- | --- |
| Current GitLab user | Read | 目前 token identity |
| Groups | Read | 列出 token 可見 groups |
| Projects | Read | Membership projects，可選 allowlist filter |
| Branches | Read / create | Create 需要開啟 writes |
| Commits | Read | 可指定 ref |
| Issues | Read / create / update / comment | Write 預設關閉 |
| Merge requests | Read / create / update / comment | Write 預設關閉 |
| MR diffs | Read | 使用 GitLab paginated API |
| Merge MR | Optional write | 同時需要 write 與 merge flags |
| Pipelines | Read | Project pipeline inspection |
| Pipeline jobs | Read | 包含 job trace/log read |
| 任意 GitLab API proxy | 不支援 | 只提供明確 tools |
| Local working tree | 不處理 | 由 client/plugin 的 local `git` 負責 |
| Local commit/push | 不處理 | 由 client/plugin 的 `git` / `glab` 負責 |
| Per-user GitLab OAuth mapping | 尚未 | v0.3.0 後續規劃 |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex | Plugin + bundled local/remote MCP；必要時使用 local `git` / `glab` fallback |
| ChatGPT | 將 MCP Server 以 HTTPS remote endpoint 部署，再於 workspace 支援時建立 Custom MCP App |
| 其他 MCP client | 使用 client 支援的 HTTP/auth 設定連 `/mcp` |

Client 的產品可用性、plan limit、approval UI 與 write permission 都由各 MCP client 控制，可能獨立於此 repo 改變。

## Authentication matrix

| Boundary | v0.3.0 |
| --- | --- |
| MCP endpoint fixed bearer | 支援 (`MCP_AUTH_TOKEN`) |
| MCP endpoint unauthenticated loopback | 支援 |
| MCP endpoint unauthenticated public bind | 只能明確 opt-in，不建議 |
| GitLab `PRIVATE-TOKEN` | 支援 |
| GitLab OAuth-style bearer token | 支援 |
| Per-user OAuth passthrough | 規劃中 |

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

實際 compatibility 取決於 GitLab version 與各 tool 使用的 REST API endpoint 是否存在。
