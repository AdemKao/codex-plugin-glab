# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.5.0 支援兩種 authentication model，請明確選擇其中一種。

## Shared-token mode

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
MCP_AUTH_TOKEN=a-long-random-secret
```

整台 MCP Server 使用同一個 GitLab identity。適合個人 deployment、CI/service identity，或刻意共享 service identity 的 trusted workspace。

## Per-user OAuth mode

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

每個 MCP user 都授權自己的 GitLab account。GitLab OAuth Application 必須建立在 `GITLAB_HOST` 指向的同一台 GitLab，callback 精確設定為：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Downstream MCP scope 對應 GitLab scope：

| MCP scope | GitLab scopes | 實際能力 |
| --- | --- | --- |
| `gitlab:read` | `read_api read_user` | read tools |
| `gitlab:write` | `api read_user` | 可寫入，但仍受 server policy 限制 |

`gitlab:read` 一定存在；`GITLAB_WRITE_ENABLED=false` 時不能取得 `gitlab:write`。

## OAuth discovery 與 client registration

OAuth mode 提供 Protected Resource Metadata、Authorization Server Metadata、`/oauth/authorize`、`/oauth/token` 與 GitLab callback。

v0.5 同時支援兩種 client registration。

### CIMD — 建議路徑

新版 MCP client 可以直接把 HTTPS Client ID Metadata Document URL 當 `client_id`。

Server 會驗證：

- 必須是 HTTPS 且 path 不能只有 `/`；
- metadata 內的 `client_id` 必須與 URL 完全相同；
- request redirect URI 必須和 metadata 宣告值完全相符；
- grant / response type；
- v0.5 CIMD 使用 public client (`token_endpoint_auth_method=none`)；
- metadata fetch 不允許 redirect；
- 文件大小與 timeout 有上限；
- DNS/IP 預設不能指向 loopback/private/link-local network。

可選設定：

```bash
OAUTH_CIMD_ENABLED=true
OAUTH_CIMD_ALLOWED_HOSTS=client.example.com
OAUTH_CIMD_ALLOW_PRIVATE_NETWORK=false
OAUTH_CIMD_FETCH_TIMEOUT_MS=5000
```

### DCR — compatibility fallback

需要相容舊 MCP client 時保留：

```bash
OAUTH_DCR_ENABLED=true
```

DCR confidential client secret 只保存 scrypt hash。Client 支援 CIMD 時應優先使用 CIMD。

## Authorization flow

```text
MCP client
  -> Protected Resource Metadata
  -> Authorization Server Metadata
  -> CIMD metadata 或 DCR
  -> /oauth/authorize + PKCE S256
  -> GitLab /oauth/authorize + 獨立 PKCE S256
  -> /oauth/gitlab/callback
  -> one-time MCP authorization code
  -> /oauth/token + PKCE verifier
  -> MCP access + rotating refresh token
  -> /mcp，以該 GitLab user 身分執行
```

## OAuth persistence

可選擇兩個 backend。

### Encrypted file store

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

整份 payload 使用 AES-256-GCM 加密，寫檔採 atomic rename。只適合單一 MCP process / node。

### PostgreSQL store

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

這是 horizontal scaling 建議模式。GitLab credential payload 仍用 `OAUTH_ENCRYPTION_KEY` 加密；lookup 欄位只保存非敏感 identifier 或 token hash。

跨 replica atomic 保證：

- OAuth state：`DELETE ... RETURNING` 單次 consume；
- authorization code：`DELETE ... RETURNING` 單次 consume；
- refresh-token rotation：只在舊 refresh-token hash 仍符合時才 UPDATE；
- GitLab token 同時 refresh 時，可讀取另一 replica 已寫入的更新 session。

## Token lifecycle

- MCP access token 是短效 token。
- MCP refresh token 每次成功 refresh 後都會 rotation，舊 token 不可再用。
- GitLab access token 到期前自動 refresh。
- 上游 GitLab authorization 無法再 refresh 時，相關 MCP session 會失效。

## OAuth scope 不等於 server policy

GitLab write 必須同時滿足：

1. OAuth mode 下 session 有 `gitlab:write`；
2. `GITLAB_WRITE_ENABLED=true`；
3. MR merge 還要 `GITLAB_MERGE_ENABLED=true`；
4. 若有 `GITLAB_ALLOWED_PROJECTS`，project 必須被允許；
5. GitLab account 本身有執行該 API 的權限。

因此 OAuth client 無法藉由要求更大 scope 繞過 deployment policy。

## Credential handling

- 不要 commit `.env`、OAuth secret、encryption key、token 或 OAuth store data。
- `OAUTH_ENCRYPTION_KEY` 要和所保護的 file volume / PostgreSQL backup 分開保存。
- Production 建議使用 secret manager。
- Development / production 使用不同 GitLab OAuth Application。
- 更換 encryption key 必須有明確 migration / re-authorization 計畫，因為舊 encrypted session 無法用新 key 解密。
