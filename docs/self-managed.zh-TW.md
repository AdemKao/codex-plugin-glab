# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

Bundled MCP Server 直接呼叫 GitLab REST API v4，因此不綁定 `gitlab.com`。

## 設定 Host

```bash
GITLAB_HOST=https://gitlab.example.com
```

`GITLAB_HOST` 填 GitLab base URL，不要加 `/api/v4`；Server 會自行加入 API prefix。

## Shared-token authentication

```bash
MCP_AUTH_MODE=shared-token
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

使用 target GitLab instance 與所需 APIs 支援的 token type。Personal access token 是最直接的設定；若 deployment 只需要有限 projects，可使用 project/group token 縮小 scope。既有 OAuth access token 也可搭配 `GITLAB_TOKEN_TYPE=bearer` 使用。

## Per-user OAuth authentication

v0.4 支援對 Self-Managed / Dedicated GitLab 使用 per-user OAuth。

OAuth Application 必須建立在 `GITLAB_HOST` 指向的**同一台 GitLab instance**，並註冊 MCP Server callback，例如：

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

Target GitLab version 必須支援所需 OAuth authorization/token endpoint、PKCE、refresh token 與 tools 使用的 REST endpoints。Production rollout 前請在實際 GitLab version 完整測試 authorization flow。

## TLS 與 private network

Production 建議 GitLab 與 MCP endpoint 都使用 HTTPS。若 Self-Managed GitLab 使用內部 CA，請正確設定 Node/container trust store，不要關閉 TLS verification。

若 GitLab 或 MCP Server 位於 private/on-premises network，只把必要 OAuth/MCP routes 透過 authenticated reverse proxy、VPN、private ingress 或支援的 tunnel 暴露出去。不要為了 MCP 關閉 TLS 或把 GitLab API 廣泛公開。

`PUBLIC_BASE_URL` 是 browser/client 看得到的 OAuth origin；`GITLAB_HOST` 是 GitLab instance，兩者不必是同一個 hostname。

## Version compatibility

目前 tools 使用常見 GitLab REST API v4 endpoints，涵蓋 projects、groups、issues、merge requests、repository branches/commits 與 CI pipelines/jobs。

Self-Managed 不同版本的欄位、endpoint behavior、OAuth feature 與 refresh-token semantics 可能不同。如果遇到 incompatibility，請以 issue 提供 GitLab version 與去除敏感資料後的 error response。

## Project scoping

Shared Self-Managed instance 建議明確設定 allowlist：

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

所有 project-level API call 都會先檢查 allowlist，project discovery 也會過濾。OAuth mode 下即使某個 GitLab user 還能看到其他 projects，allowlist 仍然對所有 user 生效。

## OAuth store deployment

v0.4 built-in OAuth store 有加密，但目前是 single-node/file-based。Store 要放 persistent storage，encryption key 要分開保護，而且不要讓多個 MCP replicas 同時 read-write 同一個 store file。

## Native GitLab MCP

GitLab native MCP 若環境可用仍可獨立使用，但不是本專案 dependency。
