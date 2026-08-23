# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## 建議使用路徑

一般 ChatGPT / Codex 使用者直接安裝 repository marketplace root，使用：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Installed plugin 會直接載入 committed MCP binding：

```text
plugins/gitlab-self-hosted/.mcp.json
  -> https://gitlab-mcp.blacmarcs.com/mcp
```

Transport 是 remote HTTPS MCP；authentication 由 MCP Server 的 OAuth discovery 與 GitLab authorization flow 處理。

一般使用者**不需要**：

- 在自己的電腦啟動 MCP Server；
- 手動新增另一個 localhost MCP Server；
- 執行 `build_personal_variant.py` 或 `build_chatgpt_variant.py`；
- 維護另一個 marketplace repo；
- 或取得 ChatGPT MCP App / connection technical ID。

## 安裝與登入流程

```text
GitHub marketplace root
  -> GitLab Self-Hosted plugin
  -> .codex-plugin/plugin.json
  -> mcpServers: "./.mcp.json"
  -> https://gitlab-mcp.blacmarcs.com/mcp
  -> OAuth discovery
  -> GitLab OAuth authorization
  -> GitLab REST API v4
```

安裝後選擇或呼叫 **GitLab Self-Hosted**。如果 client 尚未有 MCP OAuth session，應依 server discovery metadata 顯示 authentication flow。

第一個 smoke test 應使用 read-only 操作：

```text
列出我可以存取的 GitLab groups 和 projects。
```

不要用 create、merge、cancel 或 delete 來驗證第一次連線。

## OAuth discovery

OAuth mode 下，未登入呼叫 `/mcp` 會回 `401`，`WWW-Authenticate` challenge 會指向 Protected Resource Metadata。Server 同時提供 Authorization Server Metadata，支援 CIMD，並保留 DCR compatibility。

Relevant endpoints：

```text
https://gitlab-mcp.blacmarcs.com/.well-known/oauth-protected-resource
https://gitlab-mcp.blacmarcs.com/.well-known/oauth-authorization-server
https://gitlab-mcp.blacmarcs.com/oauth/register
https://gitlab-mcp.blacmarcs.com/oauth/authorize
https://gitlab-mcp.blacmarcs.com/oauth/token
https://gitlab-mcp.blacmarcs.com/oauth/gitlab/callback
https://gitlab-mcp.blacmarcs.com/mcp
```

GitLab credential 由 MCP/OAuth Server 處理；不要要求使用者把 GitLab PAT 貼到 prompt 裡。

## Package identity

Package identifier：

```text
gitlab-self-hosted
```

不要再使用舊的 generic `gitlab@ademkao-codex-plugins`，因為 generic identifier 可能和 OpenAI curated GitLab integration 衝突。

## localhost development fallback

localhost 刻意只保留給 development / same-host testing。

產生 local override：

```bash
python3 scripts/build_local_variant.py
```

使用：

```text
gitlab-self-hosted@ademkao-gitlab-local
```

Generated plugin 仍然使用 direct MCP binding，但會把 hosted URL 覆寫成：

```text
http://127.0.0.1:3333/mcp
```

Repository root 仍固定使用 `https://gitlab-mcp.blacmarcs.com/mcp`。

## Custom remote endpoint override

如果 operator 想用另一個 public HTTPS deployment，可選擇產生 custom remote marketplace：

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

這不是使用 hosted default 的必要步驟；helper 只是在驗證 URL 是合法 public HTTPS `/mcp` endpoint 後，覆寫 copied `.mcp.json`。

## Optional existing-App / connection binding

部分 managed workspace 可能明確希望使用既有 ChatGPT MCP App / connection binding，而不是 direct `mcpServers` dependency。本 repo 仍保留 `scripts/build_chatgpt_variant.py` 處理這個 compatibility 情境。

例如：

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_EXISTING_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--app-id` 仍保留作 `--connection-id` 的 backwards-compatible alias。

Generated plugin 會：

- 移除 source `mcpServers`；
- 移除 copied source `.mcp.json`；
- 新增 `apps: "./.app.json"`；
- 記錄 existing connection technical ID；
- 不會建立 connection，也不會自己執行 OAuth。

這個 helper **不是 normal root install 的必要步驟**，也**不是** OpenAI managed App Template。

## Troubleshooting

### Plugin 看得到，但沒有 GitLab tools

依序檢查：

1. Installed reference 是否為 `gitlab-self-hosted@ademkao-codex-plugins`，而不是 collision-prone generic `gitlab` package。
2. 是否真的安裝 repository-root package，且 manifest 有 `mcpServers: "./.mcp.json"`。
3. `.mcp.json` 是否指向 `https://gitlab-mcp.blacmarcs.com/mcp`。
4. 如果 client 顯示 MCP Server 需要 OAuth，重新開啟 authentication。
5. Authentication 完成後用 harmless read 驗證。

正常 root install 不要用「建立第二個 generated marketplace」或「改指向 localhost」作為 troubleshooting 的第一步。

### 你刻意安裝 local variant

確認 MCP Server 真的 listening 在：

```text
http://127.0.0.1:3333/mcp
```

Local variant 無法連到只跑在另一台機器上的 server。

### 你刻意安裝 App-bound generated variant

此時 direct root MCP 規則不適用；請分別驗證 generated `.app.json` technical ID 與 underlying ChatGPT MCP connection。

## Read / write policy

Hosted 或自行部署的 server 建議從 read-only 開始：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Write operation 必須同時通過 deployment policy、OAuth `gitlab:write`、project allowlist（如果有設定）與 GitLab permission。Merge 另外需要 merge safety flag。

## Product surface 說明

OpenAI 控制 UI 名稱、plan/workspace availability，以及 MCP authentication 在產品中的呈現方式，這些可能獨立於本 repo 改變。Repo 自己的 invariant 很明確：root `GitLab Self-Hosted` package 會直接 binding 到 `https://gitlab-mcp.blacmarcs.com/mcp`；需要 authentication 時由 client 使用 server 提供的 OAuth discovery。
