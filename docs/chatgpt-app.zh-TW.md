# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Self-hosted GitLab 整合應先把 bundled MCP Server 部署在 HTTPS 後方。使用 per-user OAuth mode 時，每個使用者授權自己的 GitLab identity；MCP client 取得 MCP credential，而不是 GitLab PAT。

## 最重要的差異

這裡其實有兩個不同 integration layer：

1. **Codex / native MCP server 設定** — 直接新增 `https://gitlab-mcp.example.com/mcp`，會讓 remote MCP server 本身可以被 client 使用。
2. **ChatGPT `@GitLab` plugin binding** — plugin 必須明確綁定到擁有該 remote MCP connection 的 ChatGPT App / connector。

你在 MCP settings 裡另外新增並完成 OAuth 的 remote MCP server，**不會自動取代** portable source plugin packaged 的 localhost MCP dependency。

因此可能會出現：OAuth 成功、plugin 與 skills 都看得到，但 ChatGPT conversation 仍然沒有任何 GitLab tools。

## 我應該使用哪一條設定路徑？

### Codex / native MCP：直接新增 remote server

當你要直接使用 remote MCP capability 時走這條：

```text
Codex / native MCP client
  -> Add server
  -> Streamable HTTP
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
  -> GitLab REST API v4
```

這條 direct MCP 路徑**不需要** `.app.json` 或 `scripts/build_chatgpt_variant.py`。

### ChatGPT `@GitLab`：使用 App-bound plugin variant

當你要透過 GitLab plugin mention 與 skills 使用 remote MCP tools 時走這條：

```text
ChatGPT plugin
  -> .app.json binding
  -> existing ChatGPT App / connector
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> GitLab REST API v4
```

App / connector 必須已經存在並指向 remote MCP endpoint。用該 App / connector ID 產生 workspace-bound plugin copy。產生出的 ChatGPT variant 會移除 source `mcpServers` 與 copied `.mcp.json`，避免 localhost fallback 繼續成為 competing dependency。

### Local development：localhost fallback

Portable source plugin 刻意保留：

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

只有 bundled MCP Server 和 Codex client 跑在同一台機器時才使用這條 local fallback。Local working tree、commit、push 仍由 `git` / `glab` 負責。

### Managed workspace：平台 App 管理流程

Managed ChatGPT workspace 可能有獨立的 App administration、publish、RBAC 與 App Template 流程。這些平台管理功能和下面的 repository helper 是兩件不同的事。

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

Doctor 與 OAuth 成功只代表 remote MCP authentication path 正常，**不代表**已安裝的 ChatGPT plugin 一定綁定到這個 remote server。

## 4. 在 Codex / native MCP 直接新增 server

1. 開啟 **MCP servers**；
2. 選 **Add server**；
3. 選 **Streamable HTTP**；
4. 輸入 `https://gitlab-mcp.example.com/mcp`；
5. 儲存，client 要求時 restart；
6. Client 顯示 OAuth sign-in 時選 **Authenticate**；
7. 在 browser 完成 GitLab authorization；
8. 開 write policy 前先驗證 harmless read。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

結果應反映真正完成 OAuth 的 GitLab account。

## 5. 把 remote server 綁定到 ChatGPT 的 `@GitLab`

單獨新增 remote MCP server 不足以取代 source plugin packaged 的 dependency。

先透過平台 UI 建立/連線一個指向 remote MCP endpoint 的 ChatGPT App / connector 並完成 OAuth。取得既有 App / connector ID 後，再產生 bound plugin variant：

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

Generated variant 與 portable source plugin 的差異：

- `.codex-plugin/plugin.json` 有 `apps: "./.app.json"`；
- `.codex-plugin/plugin.json` **沒有** `mcpServers`；
- generated directory **沒有** `.mcp.json`；
- `.chatgpt-setup.json` 會記錄 `binding_mode: "app"` 與 `source_local_mcp_removed: true`。

Source plugin 不會被修改，仍保留 Codex localhost fallback。

## 6. Troubleshooting：OAuth 成功但 `@GitLab` 沒有 tools

如果以下情況都成立：

- remote MCP server 在 MCP settings 中可見；
- OAuth 已成功；
- GitLab plugin 與 skills 已安裝；
- conversation 仍無法呼叫 GitLab tools；

請先檢查 plugin binding，不要先去改 OAuth。

常見 broken state：

```text
Plugin @GitLab
  -> packaged mcpServers
  -> http://127.0.0.1:3333/mcp

Separate MCP entry
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth succeeds
```

這兩個是不同 binding。可用的 remote MCP entry 不會自動覆蓋 plugin 的 localhost dependency。

ChatGPT-bound package 應該是：

```text
Plugin @GitLab
  -> apps: ./.app.json
  -> existing connected App / connector
  -> https://gitlab-mcp.example.com/mcp
```

如果 generated ChatGPT plugin 仍顯示 packaged MCP server，或 generated directory 還有 `.mcp.json`，請先用目前版本的 helper 重新 build，再繼續排 OAuth。

## 7. Managed workspace App Templates

OpenAI managed workspace **App Template** 是獨立的平台管理功能，主要給 workspace 管理者使用。Managed template 可以提供 guided configuration、建立 workspace draft app，再讓 workspace admin review、publish，並管理 access / actions。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。Repository 的 `.app.json.example` 與 `build_chatgpt_variant.py` 不應被描述成 App Template。

如果 target workspace 有 OpenAI-managed GitLab App Template，請走該 workspace 的 Apps / administration 流程。

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

Native loopback client 可能在 metadata 裡宣告沒有 port 的 redirect URI，例如 `http://127.0.0.1/callback/<client-id>` 或 `http://localhost/callback/<client-id>`，實際 authorization request 再動態選一個 ephemeral port。Server 只有在 registered URI 沒有 port、兩邊都是 `http`、loopback host 與 path 完全一致、requested port 是合法非 0 port，而且兩邊都沒有 credentials、query string、fragment 時，才允許這個 dynamic-port matching。Public redirect URI，以及註冊時已明確指定 port 的 loopback URI，仍維持 exact match。

Authorization transaction 會保存實際使用的完整 dynamic redirect URI，因此 authorization-code exchange 必須再帶回同一個完整 URI，包含當次選到的 port。

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

哪些 OpenAI plan、workspace role、ChatGPT / Codex surface 提供 MCP server config、managed Apps、App Templates 與 write-capable tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新平台文件。
