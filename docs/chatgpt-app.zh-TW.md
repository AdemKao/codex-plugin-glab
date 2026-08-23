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

Portable package 刻意維持 **endpoint-unbound**：只包含 workflow skills 與 metadata，不包含 `mcpServers`、不自動載入 `.mcp.json`，也沒有 user/workspace-specific 的 ChatGPT MCP connection binding。

明確產生的 variants：

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

## 最重要的差異

請把以下四層分開：

1. **Portable plugin** — 只有 workflow skills / metadata，不選擇 MCP endpoint。
2. **Codex / native MCP connection** — 直接新增 local/remote MCP server，或產生明確的 local/remote plugin variant。
3. **ChatGPT MCP App / connection** — 持有 remote MCP endpoint 與 OAuth session。
4. **ChatGPT connection-bound plugin variant** — 透過 `.app.json` 綁定上述 existing MCP connection 的 platform-generated technical ID。

「安裝 repository plugin」與「建立／授權 remote MCP connection」是兩個不同的 operation。看得到 `@GitLab Self-Hosted` **不代表** plugin 已自動找到並綁定使用者自己的 MCP connection。

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

這條路徑不需要 `.app.json`，也不需要 generated ChatGPT plugin variant。

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

### ChatGPT：existing MCP connection + connection-bound plugin

```text
ChatGPT MCP App / connection
  -> configured endpoint: https://gitlab-mcp.example.com/mcp
  -> OAuth
  -> scanned GitLab tools
  -> platform-generated technical ID

GitLab Self-Hosted plugin
  -> gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> .app.json
  -> existing MCP connection technical ID
```

Generated plugin 使用 `apps: "./.app.json"`，但不包含 direct MCP server definition。

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

Doctor 與 OAuth 成功代表 remote MCP authentication path 正常，但**不代表**某個 plugin reference 已經綁定這個 connection。

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

Custom MCP 的實際 UI 名稱與可用性由 ChatGPT plan / workspace 控制，也可能獨立於本 repo 改變。當平台提供 custom MCP App / connection 時，依下列順序：

1. 在 ChatGPT platform UI 建立／連接 remote MCP endpoint。
2. 輸入 public HTTPS endpoint，例如 `https://gitlab-mcp.example.com/mcp`。
3. 完成 OAuth。
4. Scan / refresh tools，確認 underlying connection 能 expose GitLab tools。
5. 完整複製該 MCP App / connection 的 platform-generated **technical ID**。不要拿 plugin name、marketplace name、MCP URL 或 GitLab OAuth client ID 代替。
6. 產生 connection-bound marketplace：

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_CHATGPT_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

為了 backwards compatibility，`--app-id` 仍可作為 `--connection-id` 的 alias。

`--mcp-url` 會被驗證並記錄成 existing connection 預期使用的 endpoint；真正的 plugin dependency 是 connection technical ID。

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
- 使用 namespaced `gitlab-self-hosted` binding key；
- `.chatgpt-setup.json` 同時記錄 `connection_id` 與 expected MCP URL；
- metadata 明確標示它不會建立 connection，也不會執行 OAuth。

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
  -> 沒有 implicit MCP endpoint 或 connection binding

Local:
  gitlab-self-hosted@ademkao-gitlab-local
  -> http://127.0.0.1:3333/mcp

Remote direct:
  gitlab-self-hosted@ademkao-gitlab-remote
  -> 使用者明確指定的 HTTPS /mcp

ChatGPT connection-bound:
  gitlab-self-hosted@ademkao-gitlab-chatgpt
  -> existing MCP App / connection technical ID
  -> endpoint / OAuth 屬於該 connection
```

Browser 顯示 `Authentication complete. You may close this window.` 代表 OAuth callback 已成功回到 MCP client，但仍不代表 portable plugin 已綁到該 authenticated connection。

如果 OAuth 成功，但 conversation 還是沒有 GitLab tools：

1. 確認 underlying MCP connection 本身確實 scan / expose 預期的 GitLab tools；
2. 確認 technical ID 是從同一個 connection 複製；
3. 檢查 generated `plugins/gitlab-self-hosted/.app.json`，其 `id` 必須完全一致；
4. 確認實際安裝的是 `gitlab-self-hosted@ademkao-gitlab-chatgpt`，不是 portable `@ademkao-codex-plugins`；
5. 如果 portable plugin 先前已安裝，請明確 import/install generated marketplace。

只重跑 OAuth 不會替 portable package 新增 binding。

## 7. Managed workspace App Templates

Managed workspace App Template 是獨立的平台功能。本 repo **目前沒有提供，也不宣稱自己是 managed App Template**。`.app.json.example` 與 `build_chatgpt_variant.py` 只是 connection-binding helper。

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

哪些 OpenAI plan、workspace role、ChatGPT / Codex surface 提供 custom MCP App / connection、managed template 與 write-capable tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新 OpenAI product documentation。