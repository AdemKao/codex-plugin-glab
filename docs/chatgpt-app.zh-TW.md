# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Self-hosted GitLab 整合應先把 bundled MCP Server 部署在 HTTPS 後方。使用 per-user OAuth mode 時，每個使用者授權自己的 GitLab identity；MCP client 取得 MCP credential，而不是 GitLab PAT。

## 我應該使用哪一條設定路徑？

### Personal / Codex：直接新增 remote MCP server

這是 personal Codex host 的主要路徑：

```text
Codex / ChatGPT desktop host
  -> Add server
  -> Streamable HTTP
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
  -> GitLab REST API v4
```

這條路徑**不需要** `.app.json`、`scripts/build_chatgpt_variant.py` 或 managed workspace App Template。

### Local development：localhost fallback

Portable plugin 刻意保留：

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

只有 bundled MCP Server 和 Codex client 跑在同一台機器時才使用這條 local fallback。Local working tree、commit、push 仍由 `git` / `glab` 負責。

### Managed workspace：平台 App 管理流程

Managed ChatGPT workspace 可能有獨立的 App administration、publish、RBAC 與 App Template 流程。這些平台管理功能和下面的 repository workspace binding helper 是兩件不同的事。

### Optional repository workspace binding helper

`plugins/gitlab/workspace-binding/.app.json.example` 與 `scripts/build_chatgpt_variant.py` 只用來把**已經存在**的 workspace App / connector ID 綁進 ignored plugin copy。它們不是 OpenAI 原生或 managed App Template，不會建立 App，也不是 personal/Codex direct MCP 路徑的必要步驟。

## 1. 建立 GitLab OAuth Application

在 target GitLab instance 建 OAuth Application，callback：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Application ID/secret 與 `OAUTH_ENCRYPTION_KEY` 應放 deployment secret manager，不要放進 plugin 或 prompt。

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

## 3. 驗證 remote endpoint

Client 連線前先驗證 deployment：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會檢查 public HTTPS URL、DNS 是否只解析到 public address、Protected Resource Metadata、Authorization Server Metadata、issuer consistency，以及未登入 `/mcp` 是否回 `401` 並在 OAuth `WWW-Authenticate` challenge 中帶 `resource_metadata`。

不要為了讓 remote check 通過而把 localhost/private endpoint 暴露出去。

## 4. 在 personal / Codex 新增 server

在 ChatGPT desktop / Codex 的 MCP settings：

1. 開啟 **MCP servers**；
2. 選 **Add server**；
3. 選 **Streamable HTTP**；
4. 輸入 `https://gitlab-mcp.example.com/mcp`；
5. 儲存，client 要求時 restart；
6. Client 顯示 OAuth sign-in 時選 **Authenticate**；
7. 在 browser 完成 GitLab authorization；
8. 開 write policy 前先驗證 harmless read。

MCP Server 支援標準 discovery chain。未登入 `/mcp` 會回 Protected Resource Metadata 資訊；Authorization Server Metadata 再提供 OAuth endpoint。支援的 client 可走 CIMD，DCR 則保留作 compatibility fallback。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

結果應反映真正完成 OAuth 的 GitLab account。

## 5. localhost `.mcp.json` fallback

Source plugin 會保留：

```json
{
  "mcpServers": {
    "gitlab": {
      "type": "http",
      "url": "http://127.0.0.1:3333/mcp"
    }
  }
}
```

這是刻意保留的 local fallback。不要把 portable source file 改成 maintainer-specific public deployment URL。

## 6. Optional workspace binding helper

只有 target workspace **已經有** App / connector ID，而且 plugin copy 需要 reference 該 ID 時才使用這一段。

產生 copy：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

預設輸出：

```text
dist/gitlab-chatgpt/
  .app.json
  .chatgpt-setup.json
  .codex-plugin/plugin.json
  ...
```

Generated `.app.json` 來自 `plugins/gitlab/workspace-binding/.app.json.example`。Copied `plugin.json` 會加入 `apps: "./.app.json"`。

`.chatgpt-setup.json` 會明確記錄：

- 這只是 workspace-binding-helper output；
- App / connector 必須已經存在；
- helper **不是** OpenAI managed App Template；
- App creation / authorization 仍屬於平台明確的 consent boundary。

Source plugin、workspace-binding helper input 與 local `.mcp.json` 都不會被修改。`dist/` 已忽略，workspace-specific ID 不應 commit。

## 7. Managed workspace App Templates

OpenAI managed workspace **App Template** 是獨立的平台管理功能，主要給 workspace 管理者使用。Managed template 可以提供 guided configuration、建立 workspace draft app，再讓 workspace admin review、publish，並管理 access / actions。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。Repository 的 `.app.json.example` 與 `build_chatgpt_variant.py` 不應被描述成 App Template。

如果 target workspace 有 OpenAI-managed GitLab App Template，請走該 workspace 的 Apps / administration 流程；不要拿本 repo 的 binding helper 取代它。Personal workspace 與 direct Codex MCP 在支援時仍應走 **Add server** 主流程。

## Remote URL safety

Workspace binding helper 會拒絕：

- 非 HTTPS URL；
- localhost / `.localhost`；
- loopback、private、link-local、multicast、reserved、unspecified literal IP；
- URL 內嵌 username/password；
- query string / fragment；
- 不是 `/mcp` 的 endpoint。

Live doctor 還會額外做 DNS resolve，在任何 HTTP request 前拒絕解析到 non-public address 的 hostname。

## CIMD / DCR

v0.5+ 對支援 URL client metadata 的 MCP client 優先使用 Client ID Metadata Documents (CIMD)。Server 會驗證 metadata 並預設阻擋 private-network SSRF target。Dynamic Client Registration (DCR) 則保留作 compatibility fallback。

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

## MCP client 不會取得什麼

MCP client 不需要 GitLab OAuth Application secret、`OAUTH_ENCRYPTION_KEY`、PostgreSQL credential 或 raw PAT。GitLab OAuth access / refresh token 只會加密保存在 server-side store。

## Shared-token fallback

Personal / trusted service-identity environment 仍可使用 `MCP_AUTH_MODE=shared-token`。Untrusted multi-user workspace 不應拿 shared-token 取代 per-user authorization。

## Product support

哪些 OpenAI plan、workspace role、ChatGPT / Codex surface 提供 MCP server config、managed apps、App Templates 與 write-capable tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新平台文件。
