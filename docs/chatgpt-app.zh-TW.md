# Remote MCP / ChatGPT Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

Remote 多人使用時，建議部署 bundled MCP Server 的 **per-user OAuth mode**。每個使用者授權自己的 GitLab identity；MCP client 取得的是 MCP credential，不是 GitLab PAT。

本 repo 支援幾種 client 安裝 surface，但刻意分開處理：

1. **Personal / Codex remote MCP** — 直接使用 **Add server -> remote HTTPS `/mcp` -> OAuth discovery** 加入部署好的 server。
2. **Local Codex fallback** — 當 Codex 與 MCP Server 在同一台機器時，保留 portable `plugins/gitlab/.mcp.json` 指向 `http://127.0.0.1:3333/mcp`。
3. **Managed ChatGPT workspace** — 若平台提供，使用 workspace/admin 的 App 或 App Template provisioning flow。本 repo 不定義也不產生 OpenAI-native managed workspace App Template。

## Flow

```text
Personal / Codex remote
  -> Add server
  -> https://gitlab-mcp.example.com/mcp
  -> 401 + Protected Resource Metadata
  -> OAuth discovery / CIMD or DCR
  -> browser GitLab OAuth
  -> GitLab REST API v4

Local Codex fallback
  -> source plugin .mcp.json
  -> http://127.0.0.1:3333/mcp

Managed ChatGPT workspace
  -> platform/admin App provisioning 或 managed App Template（若平台提供）
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery
  -> GitLab OAuth
```

## 1. 建立 GitLab OAuth Application

在 target GitLab instance 建立 OAuth Application，callback：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

Application ID/secret 與 `OAUTH_ENCRYPTION_KEY` 放 deployment secret manager，不要放進 plugin 或 prompt。

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

## 3. 驗證 remote OAuth MCP endpoint

把 server 加到 client / workspace 前，先驗證部署好的 endpoint：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會驗證 public HTTPS URL、DNS 只解析到 public address、Protected Resource Metadata、Authorization Server Metadata、issuer 一致性，以及未登入 `/mcp` 是否回 `401` 並帶有 `WWW-Authenticate: ... resource_metadata=...`。

不要為了通過 remote check 而把 localhost/private endpoint 不安全地暴露出去。

## 4. Personal / Codex remote 安裝

Personal Codex 要連這個 self-hosted server 時：

1. 開啟 MCP server 設定 UI；
2. 選 **Add server**；
3. 選 remote HTTP/HTTPS MCP；
4. 填入 `https://gitlab-mcp.example.com/mcp`；
5. 讓 client 從 MCP `401` challenge 與 metadata endpoints 進行 OAuth discovery；
6. 在 browser 完成 GitLab authorization；
7. 先用列出 groups/projects 等 harmless read 驗證。

這條 remote 路徑**不需要**把 source `.mcp.json` 改成 remote URL。Remote client configuration 與 portable local fallback 是兩件事。

## 5. Local Codex fallback

Source plugin 刻意保留：

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

當 MCP Server 跟 Codex 跑在同一台機器時使用。Local working tree、commit、push 仍由 local `git` / `glab` 負責。

## 6. Managed ChatGPT workspace App / App Template

如果 managed ChatGPT workspace 有 admin-controlled App 或 App Template provisioning 功能，請透過 **OpenAI workspace/admin surface** 建立/佈署 integration，並讓它指向同一個已驗證的 public HTTPS `/mcp` endpoint。

Provisioning lifecycle、template format、plan availability、approval policy 與 admin consent 都由 OpenAI 平台控制。本 repo 只說明相容路徑，**不會 publish、generate 或 emulate OpenAI-native managed workspace App Template**。

## 7. 已存在 App/connector 的 workspace binding helper

只有在 target ChatGPT workspace 已經有 App/connector 且取得它的 ID 後，才使用這個 helper：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_ID \
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

Generated `.app.json` 會從 `plugins/gitlab/workspace-binding/.app.json.example` 產生。這個 source 檔案只是 **workspace binding example**，不是 OpenAI App Template specification。

Generated `.chatgpt-setup.json` 會記錄：

- App/connector 必須已經存在；
- 該 App/connector 預期設定相同 remote HTTPS `/mcp` endpoint；
- 本 repo 沒有建立 managed workspace App Template。

`dist/` 已忽略，workspace-specific ID 不應 commit。

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

v0.5+ 對支援 URL client metadata 的 MCP client 優先使用 Client ID Metadata Documents（CIMD）。Server 會驗證 metadata 並預設阻擋 private-network SSRF target。Dynamic Client Registration（DCR）保留作為 compatibility fallback。

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

## Remote client 不會取得什麼

Codex / ChatGPT / MCP client 不需要 GitLab OAuth Application secret、`OAUTH_ENCRYPTION_KEY`、PostgreSQL credential 或 raw PAT。GitLab OAuth access / refresh token 只會加密保存在 server-side store。

## Shared-token fallback

Personal / trusted environment 仍可使用 `MCP_AUTH_MODE=shared-token`。Untrusted multi-user workspace 不應拿 shared-token 取代 per-user authorization。

## Product support

哪些 OpenAI product、plan、workspace role 與 surface 提供 remote MCP server configuration、managed Apps/App Templates、write-capable MCP tools，是平台能力，可能獨立於本 repo 改變；部署時請確認最新平台文件。
