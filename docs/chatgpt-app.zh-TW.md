# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

多人 ChatGPT 使用時，建議部署 bundled MCP Server 的 **per-user OAuth mode**。每個使用者授權自己的 GitLab identity；ChatGPT 取得的是 MCP credential，不是 GitLab PAT。

Portable source plugin 會刻意保留 `plugins/gitlab/.mcp.json` 指向 `http://127.0.0.1:3333/mcp`，供 local Codex 使用。ChatGPT Custom MCP App 則必須指向公開 HTTPS `/mcp` endpoint。

## Flow

```text
Local Codex
  -> source plugin
  -> http://127.0.0.1:3333/mcp

ChatGPT
  -> 明確建立 / 連接 Custom MCP App 與 consent
  -> https://gitlab-mcp.example.com/mcp
  -> OAuth discovery（支援時 CIMD，否則 DCR fallback）
  -> GitLab OAuth
  -> GitLab REST API v4
```

## 1. 建立 GitLab OAuth Application

在 target GitLab instance 建 OAuth Application，callback：

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

## 3. 執行 ChatGPT MCP doctor

建立 workspace App 前，先驗證部署好的 endpoint：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會驗證 public HTTPS URL、DNS 解析只指向 public address、Protected Resource Metadata、Authorization Server Metadata、issuer 一致性，以及未登入 `/mcp` 是否回 `401` 並帶有 `WWW-Authenticate: ... resource_metadata=...`。

Doctor 失敗時不要繼續，也不要為了讓它通過而把 localhost/private endpoint 暴露成不安全設定。

## 4. 明確建立 / 連接 ChatGPT Custom MCP App

在目前支援 Custom MCP App 的 ChatGPT workspace / surface：

1. 需要時開啟 Developer Mode；
2. 明確建立 Custom MCP App；
3. 填入 `https://gitlab-mcp.example.com/mcp`；
4. 讓 ChatGPT discover tools / OAuth；
5. 在 GitLab browser 完成 authorization；
6. 先驗證 harmless read。

本 repo **不宣稱安裝 plugin 就能靜默自動建立 arbitrary workspace Custom MCP App**。App creation 與 authorization 仍是 ChatGPT user / workspace admin 必須明確完成的 consent boundary。

Smoke test：

```text
列出我可以存取的 GitLab groups 和 projects。
```

結果必須反映真正完成 OAuth 的 GitLab account。

## 5. 建立 workspace-bound plugin variant

取得 workspace App / connector ID 後，不需要手動改 source：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_WORKSPACE_APP_ID \
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

Generated `.app.json` 會依照 `plugins/gitlab/app-template/.app.json.example` 的 source semantics 產生；copy 出來的 `plugin.json` 會加入 `apps: "./.app.json"`。`.chatgpt-setup.json` 會記錄預期 remote MCP URL，並明確保留 workspace App 必須由使用者/管理員建立的界線。

Source plugin、source template、local `.mcp.json` 都不會被修改。`dist/` 已忽略，workspace-specific ID 不應 commit。

## Remote URL safety

ChatGPT variant builder 會拒絕：

- 非 HTTPS URL；
- localhost / `.localhost`；
- loopback、private、link-local、multicast、reserved、unspecified literal IP；
- URL 內嵌 username/password；
- query string / fragment；
- 不是 `/mcp` 的 endpoint。

Live doctor 還會額外做 DNS resolve，在任何 HTTP request 前拒絕解析到 non-public address 的 hostname。

## CIMD / DCR

v0.5+ 對支援 URL client metadata 的 MCP client 優先使用 CIMD。Server 會驗證 metadata 並預設阻擋 private-network SSRF target。舊 client 仍可透過 DCR 相容。

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
