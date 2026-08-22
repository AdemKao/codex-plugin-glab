# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.4.0 支援兩種 authentication model。請明確選擇其中一種；除非正在 migration，否則不要把兩套 credentials 混在一起使用。

## Shared-token mode

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

若 bind 到非 loopback address，還要設定：

```bash
MCP_AUTH_TOKEN=a-long-random-secret
```

這是與 v0.3 相容的模式。設定的 GitLab token 代表整台 MCP Server 的單一 GitLab identity，適合個人 deployment、CI/service account，或刻意讓 trusted workspace 共用 service identity 的情境。

`MCP_ALLOW_INSECURE_NO_AUTH=true` 會關閉 shared mode 的內建 remote-auth guard，只能在外層 gateway / private tunnel 已確實驗證每個 request 時使用。

## Per-user OAuth mode

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json
```

這個模式下，`GITLAB_TOKEN` 與 `MCP_AUTH_TOKEN` 不再是 user identity path。每個 MCP user 會分別授權自己的 GitLab account。

### GitLab OAuth Application

替這個 MCP deployment 在 GitLab 建立一個 OAuth Application，callback 必須精確設定成：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

若使用 GitLab Self-Managed，OAuth Application 要建立在同一台 GitLab instance，`GITLAB_HOST` 也要指向該 instance。

Server 會依 downstream MCP scope 要求對應 GitLab OAuth scopes：

| MCP OAuth scope | GitLab OAuth scopes | 實際能力 |
| --- | --- | --- |
| `gitlab:read` | `read_api read_user` | 只有 read tools |
| `gitlab:write` | `api read_user` | 可寫入，但仍受 server policy 限制 |

`gitlab:read` 一定存在。當 `GITLAB_WRITE_ENABLED=false` 時，client 不能要求 `gitlab:write`。

### MCP OAuth discovery

OAuth mode 會提供：

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
```

未登入直接呼叫 `/mcp` 時，server 回 `401`，並在 `WWW-Authenticate` 指向 Protected Resource Metadata。相容 MCP client 可以藉此自動 discover authorization server 並開始 OAuth。

### Authorization flow

```text
MCP client
  -> Protected Resource Metadata
  -> authorization-server metadata
  -> optional Dynamic Client Registration
  -> /oauth/authorize + PKCE S256
  -> GitLab /oauth/authorize + 獨立 PKCE S256
  -> /oauth/gitlab/callback
  -> one-time MCP authorization code
  -> /oauth/token + downstream PKCE verifier
  -> MCP access + refresh token
  -> /mcp，以該 GitLab user 身分執行
```

Server 會在 downstream authorization response 加上 `iss`。目前 MCP client 可以使用 Dynamic Client Registration；新版 MCP 規格正轉向 Client ID Metadata Documents（CIMD），所以 DCR 在 v0.4 是 compatibility path，而不是長期唯一的 registration 方式。

## Token lifecycle

MCP access token 與 GitLab access token 有各自獨立的 lifetime。

- MCP access token 是短效 token，搭配會 rotation 的 MCP refresh token。
- GitLab access token 到期前，server 會使用該使用者的 GitLab refresh token 自動刷新。
- 若 GitLab refresh token 被 revoke 或無法 refresh，相關 MCP session 會被刪除，使用者必須重新授權。

## OAuth persistence

Built-in store 會把 client registration、pending transaction、authorization code 與 session 持久化到 `OAUTH_STORE_PATH`。

安全特性：

- 整份 store 使用 AES-256-GCM 加密；
- GitLab access / refresh token 只存在 encrypted payload；
- MCP authorization / access / refresh token 在 store 中只保存 SHA-256 hash；
- confidential OAuth client secret 只保存 scrypt hash；
- 寫入採 temporary file + atomic rename；
- filesystem 支援時會設定 `0600` 權限。

`OAUTH_ENCRYPTION_KEY` 必須是 base64 encoded、解碼後正好 32 bytes。不要把 encryption key 跟 OAuth store backup 放在一起。

v0.4 store 是針對單一 MCP process / node 設計。不要把同一個 store file 以 read-write 方式掛到多個 replica；horizontal scaling 需要 transactional shared store / locking backend。

## OAuth scope 不等於 server policy

OAuth scope 不能覆蓋安全設定。

一個 write request 必須同時符合：

1. 使用者已授權 `gitlab:write`；
2. `GITLAB_WRITE_ENABLED=true`；
3. merge 額外要求 `GITLAB_MERGE_ENABLED=true`；
4. 若有設定 `GITLAB_ALLOWED_PROJECTS`，target 必須在 allowlist；
5. GitLab account 本身要有執行該 API action 的權限。

因此 OAuth client 無法透過要求更大的 scope，提升到 MCP deployment 原本不允許的權限。

## Credential handling

- 不要 commit `.env`、GitLab OAuth secret、`OAUTH_ENCRYPTION_KEY`、token 或 OAuth store。
- Production environment variable 建議放 secret manager。
- Backup encrypted store 時，也要另外規劃 encryption key 的安全 recovery。
- Rotation GitLab OAuth application secret 或 encryption key 要有明確 migration 計畫；直接更換 encryption key 會讓既有 encrypted sessions 無法讀取。
- Development 與 production 使用不同 OAuth application / credentials。
