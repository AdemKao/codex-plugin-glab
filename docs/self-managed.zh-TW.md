# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

Bundled MCP Server 直接呼叫 GitLab REST API v4，因此不綁定 `gitlab.com`。

## 設定 Host

```bash
GITLAB_HOST=https://gitlab.example.com
```

請填 GitLab base URL，不要加 `/api/v4`。

## Shared-token authentication

```bash
MCP_AUTH_MODE=shared-token
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

可依 target GitLab instance / endpoint 使用 personal、project、group token；既有 OAuth access token 可搭配 `GITLAB_TOKEN_TYPE=bearer`。

## Per-user OAuth

OAuth Application 必須建立在 `GITLAB_HOST` 指向的**同一台 GitLab instance**，callback：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

設定：

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Target GitLab version 必須支援 OAuth authorization/token flow、PKCE、refresh token 與已啟用 tools 所使用的 REST APIs。Production 前請在實際 GitLab version 完整測試。

## OAuth persistence

單一 MCP instance：

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Multiple replicas / HA：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

所有 replicas 必須使用同一個 `OAUTH_ENCRYPTION_KEY`。PostgreSQL backend 會提供跨 instance 的 atomic state/code consume 與 refresh-token rotation。

## Private network 的 CIMD

v0.5 支援 CIMD，但 metadata fetch 預設阻擋 private / loopback / link-local target，這是 public MCP endpoint 的安全預設。

如果企業 Self-Managed 環境刻意把 MCP client metadata 放在 private network，請盡可能縮小設定：

```bash
OAUTH_CIMD_ALLOWED_HOSTS=approved-client-metadata.internal.example.com
OAUTH_CIMD_ALLOW_PRIVATE_NETWORK=true
```

只有 MCP Server network boundary 可信時才開 private-network CIMD，並優先使用明確 hostname allowlist，而不是允許任意 private target。

舊 client 不支援 CIMD 時，可保留 DCR：

```bash
OAUTH_DCR_ENABLED=true
```

## TLS / networking

GitLab 與 MCP endpoint 都應使用 HTTPS。內部 CA 請設定 Node/container trust store，不要關閉 TLS verification。

`PUBLIC_BASE_URL` 是 browser / MCP client 看得到的 OAuth origin；`GITLAB_HOST` 是 GitLab instance，兩者可使用不同 hostname。

只透過 authenticated reverse proxy、private ingress、VPN 或支援的 tunnel 暴露必要 MCP/OAuth routes；不要為了 MCP 把 GitLab API 廣泛公開。

## Version compatibility

v0.5 使用 GitLab REST API v4 操作 projects/groups/issues/MRs、repository branches/commits/files、MR approvals/discussions、CI pipelines/jobs。Self-Managed 不同版本可能有欄位、OAuth behavior、endpoint availability 差異。

若遇到 mismatch，請提供實際 GitLab version 與去除敏感資訊的 response/error。

## Project scoping

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

OAuth mode 下，即使某個 GitLab user 可以看到更多 projects，allowlist 仍對所有 users 生效。

## Native GitLab MCP

GitLab native MCP 若環境可用仍可獨立使用，但不是本專案 dependency。
