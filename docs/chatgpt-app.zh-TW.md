# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

多人 ChatGPT 使用時，建議部署 bundled MCP Server 的 **per-user OAuth mode**。每個使用者授權自己的 GitLab identity；ChatGPT 取得的是 MCP credential，不是 GitLab PAT。

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP + OAuth discovery
        | 支援時使用 CIMD，否則 DCR fallback
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

OAuth sessions
  單一 replica -> encrypted file
  多 replicas  -> PostgreSQL
```

## 1. 建立 GitLab OAuth Application

在 target GitLab instance 建 OAuth Application，callback：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Application ID/secret 與 `OAUTH_ENCRYPTION_KEY` 放在 deployment secret manager，不要放進 plugin 或 prompt。

## 2. 部署 OAuth mode

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

單一 replica：

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Production / multi-replica：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

PostgreSQL backend 會保證跨 replica 的 OAuth state / authorization code single-use，以及 refresh-token atomic rotation。

## 3. 先驗證 OAuth discovery

檢查：

```text
GET https://gitlab-mcp.example.com/.well-known/oauth-protected-resource
GET https://gitlab-mcp.example.com/.well-known/oauth-authorization-server
```

CIMD 開啟時 authorization metadata 應包含：

```json
"client_id_metadata_document_supported": true
```

`OAUTH_DCR_ENABLED=true` 時仍會提供 `/oauth/register` 作 compatibility fallback。

未登入呼叫 `/mcp` 必須回 `401`，並由 `WWW-Authenticate` 指向 Protected Resource Metadata。

## 4. 連接 ChatGPT

在目前支援 Custom MCP App 的 ChatGPT workspace / surface：

1. 需要時開啟 Developer Mode；
2. 建立 Custom MCP App；
3. 填 `https://gitlab-mcp.example.com/mcp`；
4. 讓 client discover tools / OAuth；
5. 在 GitLab browser 完成 authorization；
6. 先驗證 harmless read。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

結果必須反映真正完成 OAuth 的 GitLab account。

## CIMD / DCR

v0.5 對支援 URL client metadata 的 MCP client 優先使用 CIMD。Server 會驗證 metadata 並預設阻擋 private-network SSRF target。舊 client 仍可透過 DCR 相容。

## Read / write

Read-only deployment：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

開啟 write：

```bash
GITLAB_WRITE_ENABLED=true
```

User 還必須授權 `gitlab:write`；MR merge 直到 `GITLAB_MERGE_ENABLED=true` 前仍 disabled。

OAuth scope、deployment policy、project allowlist 與 GitLab permission 必須全部允許 action。

## ChatGPT 不會取得什麼

ChatGPT / MCP client 不需要 GitLab OAuth Application secret、`OAUTH_ENCRYPTION_KEY`、PostgreSQL credential 或 raw PAT。GitLab OAuth access / refresh token 只會加密保存在 server-side store。

## Shared-token fallback

Personal / trusted environment 仍可使用 `MCP_AUTH_MODE=shared-token`。Untrusted multi-user workspace 不應拿 shared-token 取代 per-user authorization。

## Product support

哪些 OpenAI plan、workspace role、ChatGPT surface 可以使用 Custom MCP App / write-capable MCP tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新 OpenAI 文件。
