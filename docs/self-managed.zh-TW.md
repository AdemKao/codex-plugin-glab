# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

Bundled MCP Server 直接呼叫 GitLab REST API v4，因此不綁定 `gitlab.com`。

## 設定 Host

```bash
GITLAB_HOST=https://gitlab.example.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

`GITLAB_HOST` 填 GitLab base URL，不要加 `/api/v4`；Server 會自行加入 API prefix。

## Authentication

使用 target GitLab instance 與所需 APIs 支援的 token type。Personal access token 是最直接的初始設定；若 deployment 只需要有限 projects，可使用 project/group access token 縮小 scope。

OAuth access token：

```bash
GITLAB_TOKEN_TYPE=bearer
```

## TLS 與 private network

Production 建議 GitLab 與 MCP endpoint 都使用 HTTPS。若 Self-Managed GitLab 使用內部 CA，請正確設定 Node/container trust store，不要關閉 TLS verification。

如果 GitLab 或 MCP Server 位於 private/on-premises network，請使用支援的 private tunnel、VPN、reverse proxy 或 gateway，不要為了 MCP 直接把內部服務廣泛公開。

## Version compatibility

目前 tools 使用常見 GitLab REST API v4 endpoints，涵蓋 projects、groups、issues、merge requests、repository branches/commits 與 CI pipelines/jobs。

Self-Managed 不同版本的欄位與 endpoint behavior 可能有差異。如果遇到 incompatibility，請以 issue 提供 GitLab version 與去除敏感資料後的 error response。

## Project scoping

Shared Self-Managed instance 建議明確設定 allowlist：

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

所有 project-level API call 都會先檢查 allowlist，project discovery 也會同步過濾。

## Native GitLab MCP

GitLab 官方 MCP 若環境可用仍可獨立使用，但從 v0.3.0 起已不是本專案 dependency。
