# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Self-hosted GitLab 整合應先把 bundled MCP Server 部署在 HTTPS 後方。使用 per-user OAuth mode 時，每個使用者授權自己的 GitLab identity；MCP client 取得 MCP credential，而不是 GitLab PAT。

## Package identity

從 v0.5.4 開始，本 repo 的第三方 plugin identifier 是：

```text
gitlab-self-hosted
```

不要再使用 `gitlab@ademkao-codex-plugins`；generic `gitlab` identifier 可能解析到 OpenAI curated GitLab plugin。

Portable reference：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Portable package 現在刻意維持 **endpoint-unbound**：只包含 workflow skills 與 metadata，不包含 `mcpServers`、不會自動載入 `.mcp.json`，也沒有 workspace-specific App binding。

明確產生的 variants：

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

## 最重要的差異

請把以下三層分開：

1. **Portable plugin** — 只有 workflow skills / metadata，不選擇 MCP endpoint。
2. **Codex / native MCP connection** — 直接新增 local/remote MCP server，或產生明確的 local/remote plugin variant。
3. **ChatGPT custom MCP App** — App 持有 remote MCP endpoint 與 OAuth connection；generated ChatGPT plugin 透過 App / connector ID 綁定該 App。

這樣可避免 `@GitLab Self-Hosted` 看得到，但 runtime 卻偷偷嘗試 `127.0.0.1`，而不是使用者真正部署在 OCI 或其他位置的 MCP server。

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

這條路徑不需要 `.app.json`，也不需要 generated plugin variant。

### 明確的 local Codex variant

Bundled MCP server 與 Codex 跑在同一台機器時：

```bash
python3 scripts/build_local_variant.py
```

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-local
```

只有這個 generated artifact 會包含：

```text
.mcp.json -> http://127.0.0.1:3333/mcp
```

### 明確的 remote MCP plugin variant

如果 plugin reference 本身要載入使用者指定的 remote MCP server：

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-remote
```

Helper 會驗證 public HTTPS `/mcp` endpoint，並只把 URL 寫到 generated artifact，不修改 committed portable plugin。

### ChatGPT：custom MCP App + App-bound plugin

```text
ChatGPT custom MCP App
  -> configured endpoint: https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> GitLab REST API v4

GitLab Self-Hosted plugin
  -> gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> .app.json
  -> existing App/connector ID
```

MCP URL 設定在 ChatGPT App / connector。Generated plugin 使用 `apps: "./.app.json"`，但不包含 direct MCP server definition。

## 1. 建立 GitLab OAuth Application

在 target GitLab instance 建立 OAuth Application，callback：

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

Doctor 會檢查 public HTTPS URL、DNS public address、Protected Resource Metadata、Authorization Server Metadata、issuer consistency，以及未登入 `/mcp` 是否回 `401` 並在 `WWW-Authenticate` 中帶 `resource_metadata`。

Doctor 與 OAuth 成功代表 remote MCP authentication path 正常，但不代表某個特定 plugin reference 已經綁定這台 server。

## 4. 在 Codex / native MCP 直接新增 server

1. 開啟 **MCP servers**；
2. 選 **Add server**；
3. 選 **Streamable HTTP**；
4. 輸入 `https://gitlab-mcp.example.com/mcp`；
5. 儲存，client 要求時 restart；
6. 顯示 OAuth sign-in 時選 **Authenticate**；
7. 在 browser 完成 GitLab authorization；
8. 開 write policy 前先驗證 harmless read。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

## 5. 設定 ChatGPT 並綁定 plugin

ChatGPT custom MCP 使用情境下，先透過平台 UI 建立/連線 App / connector，並在該 App 設定你要使用的 remote HTTPS `/mcp` endpoint。Scan tools 並完成 OAuth。

取得既有 App / connector ID 後，產生 App-bound marketplace：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--mcp-url` 會被驗證並記錄成 referenced App 預期已設定的 endpoint；真正的 plugin dependency 是 App / connector ID。

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

使用：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Generated ChatGPT plugin：

- 有 `apps: "./.app.json"`；
- 沒有 `mcpServers`；
- 沒有 `.mcp.json`；
- `.app.json` 使用 namespaced `gitlab-self-hosted` binding key；
- `.chatgpt-setup.json` 記錄 expected MCP URL 與 explicit import/install boundary。

只執行 builder 不會修改已安裝的 plugin；必須明確 import/install generated marketplace。

## 6. Troubleshooting：plugin 看得到但沒有 GitLab tools

先檢查 package 與 binding path，不要只是不斷重跑 OAuth。

```text
Deprecated:
  gitlab@ademkao-codex-plugins
  -> generic id，可能解析到 curated GitLab

Portable:
  gitlab-self-hosted@ademkao-codex-plugins
  -> workflow plugin only
  -> 沒有 implicit MCP endpoint

Local:
  gitlab-self-hosted@ademkao-gitlab-local
  -> http://127.0.0.1:3333/mcp

Remote direct:
  gitlab-self-hosted@ademkao-gitlab-remote
  -> 使用者明確指定的 HTTPS /mcp

ChatGPT App-bound:
  gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> existing App/connector ID
  -> endpoint 設定在該 App
```

如果 separate MCP connection 的 OAuth 正常，但 conversation 還是沒有 GitLab tools，請確認目前 selected plugin 確實透過預期的 connection path 綁定。

## 7. Managed workspace App Templates

OpenAI managed workspace **App Template** 是獨立的平台管理功能，可以提供 guided configuration（包含組織專屬 managed MCP server URL 等值）、建立 workspace draft app，再由 workspace admin review、publish 與管理 access/actions。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。`.app.json.example` 與 `build_chatgpt_variant.py` 仍只是 workspace binding helper。

## Remote URL safety

Remote 與 ChatGPT binding helpers 會拒絕非 HTTPS URL、localhost/private target、embedded credentials、query/fragment，以及不是 `/mcp` 的 endpoint。Live doctor 還會做 DNS resolve，在 HTTP request 前拒絕 non-public address。

## CIMD / DCR

v0.5+ 對支援 URL client metadata 的 MCP client 優先使用 Client ID Metadata Documents (CIMD)。Dynamic Client Registration (DCR) 保留作 compatibility fallback。

Native loopback client 可以宣告沒有 port 的 redirect URI，例如 `http://127.0.0.1/callback/<client-id>` 或 `http://localhost/callback/<client-id>`，實際 authorization request 再選 ephemeral port。Server 只有在 registered URI 沒有 port、兩邊都是 `http`、loopback host/path 完全一致、requested port 合法且非 0，而且沒有 credentials/query/fragment 時才允許 dynamic-port matching。Public redirect URI 與已指定 port 的 loopback URI 仍維持 exact match。

## Read / write

Read-only deployment：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

開啟 write 使用 `GITLAB_WRITE_ENABLED=true`，user 也必須授權 `gitlab:write`。MR merge 在 `GITLAB_MERGE_ENABLED=true` 前仍 disabled。OAuth scope、deployment policy、project allowlist 與 GitLab permission 必須全部允許 action。

## Product support

哪些 OpenAI plan、workspace role、ChatGPT / Codex surface 提供 MCP server config、managed Apps、App Templates 與 write-capable tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新平台文件。
