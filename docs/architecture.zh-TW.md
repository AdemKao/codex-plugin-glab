# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` 有兩個一等公民：

1. **Plugin layer**：Codex/ChatGPT workflow guidance、routing、安全規則，以及 local `git` / `glab` fallback。
2. **Self-hosted MCP server**：透過 HTTP MCP 暴露明確 GitLab tools，並直接呼叫 GitLab REST API v4。

```text
ChatGPT / Codex / MCP client
            |
            | MCP + shared bearer 或 OAuth
            v
+---------------------------------------+
| Self-hosted MCP server                |
| packages/mcp-server                   |
|                                       |
| OAuth / shared-token auth boundary    |
| request-scoped GitLab identity        |
| tool schemas + validation             |
| project allowlist                     |
| read/write/merge policy               |
| GitLab REST API client                |
+-------------------+-------------------+
                    |
                    | HTTPS / GitLab REST API v4
                    v
          GitLab.com / Self-Managed
```

GitLab native MCP 是 optional，bundled server 不依賴它。

## Authentication architecture

### Shared-token mode

```text
MCP client
   | MCP_AUTH_TOKEN
   v
MCP server
   | GITLAB_TOKEN
   v
GitLab
```

整個 deployment 共用一個設定好的 GitLab identity，保留 v0.3 operational model。

### Per-user OAuth mode

```text
MCP client
   |
   | OAuth discovery / PKCE
   v
MCP OAuth gateway
   |
   | GitLab OAuth / 獨立 PKCE
   v
GitLab authorization server
   |
   | user-scoped GitLab access + refresh token
   v
Encrypted OAuth store
   |
   | 透過 AsyncLocalStorage 提供 request-scoped credential
   v
GitLab REST client
```

MCP Server 同時扮演 protected resource 與 downstream authorization server/gateway，透過 Protected Resource Metadata 讓 MCP client 自動 discover authorization，而不是取得 GitLab PAT。

完成 authorization 後，GitLab credential 會透過 Node `AsyncLocalStorage` 綁到目前 MCP request。Tool layer / GitLab client 因此可以使用目前使用者的 identity，而不用把 user identity 存在 global mutable state。

## OAuth persistence

v0.4 built-in store 會持久化：

- dynamically registered MCP OAuth clients；
- pending authorization transactions；
- one-time authorization codes；
- MCP sessions；
- encrypted GitLab OAuth access / refresh tokens。

整份 store 使用 AES-256-GCM 加密；MCP bearer token 與 authorization code 只保存 hash。

File store 刻意定位成 single-node。Multi-replica / HA deployment 不應共用一份 writable JSON；後續需要 transactional shared storage adapter。

## Trust boundaries

### MCP client -> MCP server

Shared-token mode 使用 `MCP_AUTH_TOKEN` 或其他可信外層 boundary。

OAuth mode 下，未登入 `/mcp` 會回 OAuth discovery 資訊；client 完成 authorization-code + PKCE 後，取得這台 server 發出的 MCP access token。

### MCP server -> GitLab

Shared-token mode 使用設定的 GitLab token。

OAuth mode 使用目前使用者的 GitLab OAuth token，必要時自動 refresh。GitLab credential 不會放進 plugin package，也不會作為 MCP data 回傳給 client。

Server 只呼叫已註冊 tool 需要的 REST API route，不提供任意 GitLab API proxy。

## Policy layers

設定 `GITLAB_ALLOWED_PROJECTS` 時，project operations 都要先通過 allowlist。

Write operation 需要 server setting：

```text
GITLAB_WRITE_ENABLED=true
```

OAuth mode 還另外需要：

```text
gitlab:write
```

Merge 另外要求：

```text
GITLAB_MERGE_ENABLED=true
```

GitLab 自己的 project permission 是最後一層。因此只有 client scope、deployment policy、project allowlist 與 GitLab identity 全部允許時，request 才會成功。

## Local repository workflow

MCP Server 處理 remote GitLab state；local commit / push 仍屬於 plugin/client environment：

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local GitLab CLI fallback  -> glab
```

這樣 remote credential / API operation 不會和 local filesystem mutation 混在一起。

## Registration compatibility

v0.4 支援 Dynamic Client Registration，以維持目前 MCP clients 的相容性。新版 MCP 規格正往 Client ID Metadata Documents（CIMD）移動；OAuth registration 與 tool execution 已分離，因此後續可以增加 CIMD，而不需要重寫 GitLab tools。
