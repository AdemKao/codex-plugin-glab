# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` 有兩個 runtime 核心：

1. **Plugin layer**：Codex/ChatGPT workflow guidance、routing、安全規則與 local `git` / `glab` fallback。
2. **Self-hosted MCP server**：透過明確 GitLab MCP tools 呼叫 GitLab REST API v4。

```text
ChatGPT / Codex / MCP client
            |
            | MCP + OAuth 或 shared bearer
            v
+-------------------------------------------+
| Self-hosted MCP server                    |
|                                           |
| Protected Resource Metadata               |
| OAuth Authorization Server                |
| CIMD resolver + DCR compatibility         |
| request-scoped GitLab identity            |
| tool schemas + project/write policy       |
+---------------------+---------------------+
                      |
                      | GitLab REST API v4
                      v
            GitLab.com / Self-Managed

OAuth persistence
  單一 replica -> AES-GCM encrypted file
  多 replicas  -> PostgreSQL + encrypted payloads
```

GitLab native MCP 是 optional；bundled server 不依賴它。

## Authentication architecture

### Shared-token

```text
MCP client --MCP_AUTH_TOKEN--> MCP server --GITLAB_TOKEN--> GitLab
```

整個 deployment 共用一個 GitLab identity。

### Per-user OAuth

```text
MCP client
   |
   | OAuth discovery
   | CIMD client_id metadata 或 DCR
   | authorization code + PKCE
   v
codex-plugin-glab OAuth gateway
   |
   | 獨立 GitLab authorization code + PKCE
   v
GitLab OAuth
   |
   | user-scoped access / refresh token
   v
OAuth store
   |
   | AsyncLocalStorage request-scoped credential
   v
GitLab REST client
```

Server 同時是 MCP protected resource 與 downstream authorization server；MCP client 不需要取得 GitLab credential。

## Client registration

v0.5 優先支援 **CIMD (Client ID Metadata Documents)**，同時保留 **DCR** 作 compatibility fallback。

CIMD metadata resolution 與 tool execution 分離，並建立 SSRF boundary：只接受 HTTPS、exact `client_id`、禁止 redirect、限制 size/time、支援 host allowlist，且預設阻擋 private-network target。

## OAuth storage abstraction

OAuth gateway 只依賴 `OAuthStoreBackend`，不綁定某個 persistence implementation。

### File backend

Encrypted file store 刻意定位為 single-process / single-node。使用 AES-256-GCM、atomic file replacement，並透過 defensive copy 避免 application code 在 explicit store operation 前直接修改 stored object。

### PostgreSQL backend

Production backend 把 encrypted payload 存進 PostgreSQL，token lookup 欄位只存 hash，支援多 MCP replicas。

跨 replica single-use 語意由 DB 保證：

```text
OAuth state         -> DELETE ... RETURNING
Authorization code  -> DELETE ... RETURNING
Refresh rotation    -> old refresh-token hash 條件 UPDATE
```

不依賴 process-local mutex。

## Request identity

OAuth 驗證完成後，GitLab access token 與 MCP scopes 透過 Node `AsyncLocalStorage` 綁到目前 request。原本 core tools 與 v0.5 新增的 repository/MR/pipeline tools 都使用相同 request-scoped `GitLabClient`。

## Policy layers

Write 只有在所有相關層都允許時才成功：

1. OAuth mode 下 session 有 `gitlab:write`；
2. `GITLAB_WRITE_ENABLED=true`；
3. 若設定 `GITLAB_ALLOWED_PROJECTS`，project 必須被允許；
4. GitLab user 本身有相對應權限；
5. MR merge 還額外要求 `GITLAB_MERGE_ENABLED=true`。

Repository file delete 與 pipeline cancel 標記為 destructive。Server 只暴露明確 operations，不提供 generic GitLab API proxy。

## Local repository workflow

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local commit/push          -> git / glab
```

Remote credential/API operation 因此不會和 local filesystem mutation 混在一起。

## Operational scaling

單一 replica 可使用 `OAUTH_STORE_DRIVER=file`；HA / horizontal scaling 請使用 `OAUTH_STORE_DRIVER=postgres`，所有 replicas 使用相同 `OAUTH_ENCRYPTION_KEY`。Encryption key 必須和 PostgreSQL backup 分開保存。
