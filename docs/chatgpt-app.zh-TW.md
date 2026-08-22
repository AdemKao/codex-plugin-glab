# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

ChatGPT 必須連到 **remote MCP endpoint**。v0.3.0 請部署本 repo bundled MCP Server，ChatGPT 連這個 endpoint，不再以 GitLab native MCP 作為必要路徑。

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP
        v
https://gitlab-mcp.example.com/mcp
        |
        | GitLab REST API v4
        v
GitLab.com / Self-Managed
```

## 1. 部署 MCP Server

可使用 root Dockerfile 或其他支援 Node 的 hosting。

Server-side GitLab 設定至少需要：

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

一開始建議保持 read-only：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

將 MCP route 透過 HTTPS 對外，例如：

```text
https://gitlab-mcp.example.com/mcp
```

Infrastructure health check 可使用 `/healthz`。

## 2. 保護 remote endpoint

不要把持有 GitLab token 的 server 直接以 unauthenticated public endpoint 方式發布。

內建 server 支援 `MCP_AUTH_TOKEN`，適合能送固定 Authorization bearer header 的 client。若你目前 ChatGPT workspace 的 Custom MCP App authentication 要求 OAuth，請在 MCP server 前加 OAuth-capable gateway，或使用 OpenAI 支援的 secure/private MCP tunnel。

只有外層已經有可信 authentication 時，才使用 `MCP_ALLOW_INSECURE_NO_AUTH=true`。

## 3. 建立 ChatGPT Custom MCP App

在支援 custom MCP app 的 ChatGPT workspace：

1. 依 workspace 要求開啟 Developer Mode。
2. Create custom app。
3. 填入你部署後的 MCP URL，不是 GitLab API URL。
4. 設定 deployment 支援的 authentication。
5. Scan Tools。
6. Create / enable app。
7. 開新對話並選擇此 app。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

正常情況會使用本 repo MCP Server 提供的 `gitlab_list_groups`、`gitlab_list_projects` 等 tools。

## ChatGPT plan / surface

哪些 plan、workspace role 與 ChatGPT surface 可以建立或使用 full custom MCP app，是 OpenAI 平台能力，可能獨立於本 repo 變動。設定時請確認最新 OpenAI 文件。

## v0.3.0 identity limitation

目前整台 MCP Server 使用一個設定好的 GitLab token，適合 personal deployment 或刻意使用 service identity 的 trusted workspace。

Untrusted multi-user environment 不應把單一 shared server token 當成 per-user authorization。Per-user GitLab OAuth passthrough 會放到後續版本。

## Plugin packaging

原本的 `scripts/build_chatgpt_variant.py` 仍保留，供需要 workspace-specific plugin/app packaging 的情況使用；v0.3.0 實際 GitLab data path 改由 self-hosted MCP Server 負責。
