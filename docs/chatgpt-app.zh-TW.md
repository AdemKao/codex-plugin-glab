# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

v0.4 若要提供多人 ChatGPT 使用，建議使用 bundled MCP Server 的 **per-user OAuth mode**。ChatGPT 連到你的 HTTPS `/mcp` endpoint，每個使用者再透過 server 內建 OAuth flow 分別授權自己的 GitLab account。

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP + OAuth discovery
        v
https://gitlab-mcp.example.com/mcp
        |
        | built-in OAuth gateway
        v
GitLab OAuth
        |
        | per-user GitLab token
        v
GitLab REST API v4
```

## 1. 建立 GitLab OAuth Application

在 MCP Server 要連的 GitLab instance 建立一個 OAuth Application。

Callback URI：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Application ID 與 secret 請放 deployment secret manager，不要放進 plugin package 或 ChatGPT prompt。

## 2. 以 OAuth mode 部署 MCP Server

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

請部署在 HTTPS 後面。`PUBLIC_BASE_URL` 必須和 user / MCP client 實際可以連線的 public origin 一致。

Root Docker Compose 會持久化 `/data` 裡的 encrypted OAuth store。Encryption key 要和 volume 分開保護。

## 3. 加到 ChatGPT 前先驗證 OAuth discovery

可以檢查：

```text
GET https://gitlab-mcp.example.com/.well-known/oauth-protected-resource
GET https://gitlab-mcp.example.com/.well-known/oauth-authorization-server
```

未登入呼叫：

```text
https://gitlab-mcp.example.com/mcp
```

應該得到 `401`，而且 `WWW-Authenticate` 要包含 `resource_metadata=...`。

OAuth mode 如果 `/mcp` 可以匿名存取，不應視為部署完成。

## 4. 建立 ChatGPT Custom MCP App

在目前支援所需 custom MCP capability 的 ChatGPT workspace / surface：

1. 依需求開啟 Developer Mode。
2. Create Custom MCP App。
3. 填入 `https://gitlab-mcp.example.com/mcp`。
4. Scan / discover tools。
5. 依提示開始 authentication flow。
6. 在 GitLab browser consent screen 授權 GitLab account。
7. 回到 ChatGPT，先用 harmless read operation 驗證。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

MCP tools 應該以完成 OAuth 的 GitLab identity 執行，而不是共用 server token。

## Read / write authorization

Deployment 預設 read-only：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

這時 OAuth flow 只提供 `gitlab:read`。

若要開啟部分 write tools：

```bash
GITLAB_WRITE_ENABLED=true
```

User 仍然必須另外授權 `gitlab:write`。Merge 直到下面設定開啟前都維持 disabled：

```bash
GITLAB_MERGE_ENABLED=true
```

OAuth scope、server policy、project allowlist 與 GitLab user 本身的 GitLab permission 必須全部允許，action 才能成功。

## ChatGPT 不會取得什麼

Per-user OAuth 模式下，ChatGPT / MCP client 取得的是這台 MCP Server 發出的 MCP access / refresh token。Client 不需要也不應取得 deployment 的 GitLab OAuth application secret、`OAUTH_ENCRYPTION_KEY` 或 raw PAT。

使用者真正的 GitLab OAuth access / refresh token 只保存在 server-side encrypted OAuth store。

## Shared-token fallback

Personal / trusted single-user 環境仍可使用 `MCP_AUTH_MODE=shared-token`。這個模式讓整個 deployment 共用一顆 GitLab token，並可用 `MCP_AUTH_TOKEN` 保護 MCP endpoint。

Untrusted multi-user ChatGPT workspace 不應拿 shared-token mode 取代 per-user authorization。

## 目前 storage 限制

v0.4 built-in OAuth store 是 single-node / file-based。每個 store 只應由一個 writable MCP Server instance 使用。沒有 external locking / transactional backend 前，不要把同一份 OAuth store file 掛到多個 replicas。

## ChatGPT plan / surface

哪些 plan、workspace role 與 ChatGPT surface 可以建立或使用 Custom MCP App、write-capable MCP tools，是 OpenAI 平台能力，可能獨立於本 repo 改變。部署時請確認 OpenAI 最新文件。

## Plugin packaging

`scripts/build_chatgpt_variant.py` 仍保留，供需要 workspace-specific plugin/app packaging 的情境使用；實際 GitLab data 與 OAuth path 都由 self-hosted MCP Server 負責。
