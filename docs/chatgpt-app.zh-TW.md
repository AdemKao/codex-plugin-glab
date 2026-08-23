# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Self-hosted GitLab 整合應先把 bundled MCP Server 部署在 HTTPS 後方。使用 per-user OAuth mode 時，每個使用者授權自己的 GitLab identity；MCP client 取得 MCP credential，而不是 GitLab PAT。

## 最重要的差異

這裡其實有三個不能混在一起的部分：

1. **Codex / native MCP server 設定** — 直接新增 `https://gitlab-mcp.example.com/mcp`，會讓 remote MCP server 本身可以被 MCP client 使用。
2. **Portable repo marketplace** — `ademkao-codex-plugins` 安裝的是 `plugins/gitlab`，其中 packaged `.mcp.json` 刻意指向 `http://127.0.0.1:3333/mcp`，作為同機 Codex fallback。
3. **ChatGPT `@GitLab` App binding** — plugin 必須明確依賴擁有該 remote MCP connection 的 ChatGPT App / connector。

因此，你在 MCP settings 裡另外新增並完成 OAuth 的 remote MCP server，**不會自動取代** portable source plugin packaged 的 localhost MCP dependency。OAuth 可以成功，但 `@GitLab` conversation 仍然可能沒有 GitLab tools。

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

### ChatGPT `@GitLab`：generated App-bound marketplace

當你要透過 GitLab plugin mention 與 skills 使用 remote MCP tools 時走這條：

```text
ChatGPT plugin
  -> generated marketplace
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
plugins/gitlab/.mcp.json
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

## 5. 把 remote server 綁定到 ChatGPT 的 `@GitLab`

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
  plugins/gitlab/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

Generated marketplace 名稱是 `ademkao-gitlab-chatgpt`，plugin reference：

```text
gitlab@ademkao-gitlab-chatgpt
```

Generated plugin 與 portable source plugin 的差異：

- `.codex-plugin/plugin.json` 有 `apps: "./.app.json"`；
- `.codex-plugin/plugin.json` **沒有** `mcpServers`；
- generated artifact 裡**沒有** `plugins/gitlab/.mcp.json`；
- `.chatgpt-setup.json` 記錄 `artifact_type: "chatgpt-marketplace"`、`binding_mode: "app"`、generated marketplace/plugin reference，以及 `source_local_mcp_removed: true`。

當你要讓 `@GitLab` 使用 remote App 時，應 import/install **generated marketplace root**。不要用 repo root 的 `ademkao-codex-plugins` marketplace 做這個用途，因為 root marketplace 刻意選 portable localhost-oriented source plugin。

Generated output 是 workspace-specific 且預設被 git ignore；不要把真實 workspace App / connector binding commit 到 public repo。

## 6. Troubleshooting：OAuth 成功但 `@GitLab` 沒有 tools

如果以下都成立：

- remote MCP server 在 MCP settings 中可見；
- OAuth 已成功；
- GitLab plugin 與 skills 已安裝；
- conversation 仍無法呼叫 GitLab tools；

請先檢查**目前安裝的 marketplace / plugin binding**，不要先改 OAuth。

常見 broken state：

```text
Installed: gitlab@ademkao-codex-plugins
  -> packaged mcpServers
  -> http://127.0.0.1:3333/mcp

Separate MCP entry
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth succeeds
```

這兩個是不同 binding。可用的 remote MCP entry 不會自動覆蓋 plugin 的 localhost dependency。

Remote ChatGPT 正確狀態應該是：

```text
Installed: gitlab@ademkao-gitlab-chatgpt
  -> apps: ./.app.json
  -> existing connected App / connector
  -> https://gitlab-mcp.example.com/mcp
```

如果 generated ChatGPT plugin 還有 `mcpServers` 或 `.mcp.json`，請用目前 helper 重新 build。如果 ChatGPT 仍然使用 `gitlab@ademkao-codex-plugins`，應切換/import generated marketplace，而不是一直重跑 separate MCP entry 的 OAuth。

## 7. Managed workspace App Templates

OpenAI managed workspace **App Template** 是獨立的平台管理功能，主要給 workspace 管理者使用。Managed template 可以提供 guided configuration、建立 workspace draft app，再讓 workspace admin review、publish，並管理 access/actions。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。Repository 的 `.app.json.example` 與 `build_chatgpt_variant.py` 只是 workspace binding helper。

如果未來 target workspace 有 OpenAI-managed GitLab App Template，請走該 workspace 的 Apps / administration 流程。

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
