# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Self-hosted GitLab 整合應先把 bundled MCP Server 部署在 HTTPS 後方。使用 per-user OAuth mode 時，每個使用者授權自己的 GitLab identity；MCP client 取得 MCP credential，而不是 GitLab PAT。

## Package identity migration

從 v0.5.4 開始，本 repo 的第三方 plugin identifier 是：

```text
gitlab-self-hosted
```

舊的 generic `gitlab` identifier 可能在平台解析時命中 OpenAI curated GitLab plugin。因此本 repo 的 marketplace entry、plugin folder 與 `.codex-plugin/plugin.json` name 都改成 `gitlab-self-hosted`。

Portable/local reference：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Generated ChatGPT App-bound reference：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

v0.5.4 之後，不要再用 `gitlab@ademkao-codex-plugins` 代表本 repo。

## 最重要的差異

這裡有三個不能混在一起的部分：

1. **Codex / native MCP server 設定** — 直接新增 `https://gitlab-mcp.example.com/mcp`，會讓 remote MCP server 本身可被 MCP client 使用。
2. **Portable repo marketplace** — `ademkao-codex-plugins` 安裝 `plugins/gitlab-self-hosted`，其中 packaged `.mcp.json` 刻意指向 `http://127.0.0.1:3333/mcp` 作為同機 Codex fallback。
3. **ChatGPT App binding** — generated self-hosted plugin 必須明確依賴擁有 remote MCP connection 的 ChatGPT App / connector。

因此，你在 MCP settings 裡另外新增並完成 OAuth 的 remote MCP server，**不會自動取代** portable source plugin packaged 的 localhost MCP dependency。OAuth 可以成功，但已安裝的 plugin 仍可能沒有 remote GitLab tools。

## 我應該使用哪一條設定路徑？

### Codex / native MCP：直接新增 remote server

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

### ChatGPT：generated App-bound marketplace

```text
ChatGPT plugin
  -> gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> .app.json binding
  -> existing ChatGPT App / connector
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> GitLab REST API v4
```

App / connector 必須已經存在並指向 remote MCP endpoint。Generated ChatGPT marketplace 會移除 source `mcpServers` 與 copied `.mcp.json`，避免 localhost fallback 和 App binding 競爭。

### Local development：localhost fallback

Portable source plugin 刻意保留：

```text
plugins/gitlab-self-hosted/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

只有 bundled MCP Server 和 Codex client 跑在同一台機器時才使用這條 local fallback。Local working tree、commit、push 仍由 `git` / `glab` 負責。

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

## 5. 把 remote server 綁定到 self-hosted ChatGPT plugin

單獨新增 remote MCP server 不足以取代 source plugin packaged 的 dependency。

先透過平台 UI 建立/連線一個指向 remote MCP endpoint 的 ChatGPT App / connector 並完成 OAuth。取得既有 App / connector ID 後，再產生 workspace-specific marketplace artifact：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

預設輸出：

```text
dist/gitlab-chatgpt-marketplace/
  .agents/plugins/marketplace.json
  README.md
  plugins/gitlab-self-hosted/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

Generated marketplace 名稱是 `ademkao-gitlab-chatgpt`，plugin reference：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Generated plugin 與 portable source plugin 的差異：

- `.codex-plugin/plugin.json` 有 `name: "gitlab-self-hosted"` 與 `apps: "./.app.json"`；
- `.codex-plugin/plugin.json` **沒有** `mcpServers`；
- generated artifact 裡**沒有** `plugins/gitlab-self-hosted/.mcp.json`；
- `.app.json` 使用 namespaced `gitlab-self-hosted` binding key；
- `.chatgpt-setup.json` 記錄 namespaced plugin ID/reference 與 explicit import/install boundary。

當你要讓 self-hosted plugin 使用 remote App 時，應 import/install **generated marketplace root**。只執行 builder 產生目錄並不會修改已安裝的 plugin。

Generated output 是 workspace-specific 且預設被 git ignore；不要把真實 workspace App / connector binding commit 到 public repo，除非它的 portability 已被明確確認。

## 6. Troubleshooting：OAuth 成功但沒有 GitLab tools

先檢查 **package resolution**，再檢查 App binding。

Deprecated / collision-prone state：

```text
Reference: gitlab@ademkao-codex-plugins
  -> generic `gitlab` id
  -> 可能解析到 OpenAI curated GitLab，而不是本 repo
```

Portable self-hosted state：

```text
Installed: gitlab-self-hosted@ademkao-codex-plugins
  -> packaged localhost MCP fallback
  -> http://127.0.0.1:3333/mcp
```

Remote ChatGPT 正確狀態：

```text
Installed: gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> apps: ./.app.json
  -> existing connected App / connector
  -> https://gitlab-mcp.example.com/mcp
```

如果 separate MCP entry 的 OAuth 正常，但 conversation 還是無法呼叫 GitLab tools，先確認 installed plugin 是 `gitlab-self-hosted`，不是 generic `gitlab`；再確認 generated App-bound marketplace 已經真的被 import/install。一直重跑 OAuth 無法修正 package identity mismatch。

## 7. Managed workspace App Templates

OpenAI managed workspace **App Template** 是獨立的平台管理功能，主要給 workspace 管理者使用。Managed template 可以提供 guided configuration、建立 workspace draft app，再讓 workspace admin review、publish，並管理 access/actions。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。Repository 的 `.app.json.example` 與 `build_chatgpt_variant.py` 只是 workspace binding helper。

## Remote URL safety

Workspace binding helper 會拒絕非 HTTPS URL、localhost/private target、embedded credentials、query/fragment，以及不是 `/mcp` 的 endpoint。Live doctor 還會做 DNS resolve，在任何 HTTP request 前拒絕 non-public address。

## CIMD / DCR

v0.5+ 對支援 URL client metadata 的 MCP client 優先使用 Client ID Metadata Documents (CIMD)。Dynamic Client Registration (DCR) 保留作 compatibility fallback。

Native loopback client 可以在 metadata 裡宣告沒有 port 的 redirect URI，例如 `http://127.0.0.1/callback/<client-id>` 或 `http://localhost/callback/<client-id>`，實際 authorization request 再動態選 ephemeral port。Server 只有在 registered URI 沒有 port、兩邊都是 `http`、loopback host/path 完全一致、requested port 合法且非 0，而且沒有 credentials/query/fragment 時才允許 dynamic-port matching。Public redirect URI 與已明確指定 port 的 loopback URI 仍維持 exact match。

## Read / write

Read-only deployment：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

開啟 write 使用 `GITLAB_WRITE_ENABLED=true`，user 也必須授權 `gitlab:write`。MR merge 到 `GITLAB_MERGE_ENABLED=true` 前仍 disabled。OAuth scope、deployment policy、project allowlist 與 GitLab permission 必須全部允許 action。

## Product support

哪些 OpenAI plan、workspace role、ChatGPT / Codex surface 提供 MCP server config、managed Apps、App Templates 與 write-capable tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新平台文件。
