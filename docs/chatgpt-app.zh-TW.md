# ChatGPT / Codex App 整合

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## 目標

把 GitLab Self-Hosted workflow 封裝成會依賴已註冊 MCP App / connection 的 ChatGPT / Codex plugin，同時避免把 workspace-specific App ID 或真實 MCP endpoint 寫進 public source package。

Public marketplace package 維持：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

它只包含可重用的 skills 與 metadata，不會 commit active `.app.json`，也不會內建 maintainer-specific remote MCP endpoint。

## 建議的 ChatGPT 路徑：Registered MCP App

ChatGPT plugin 建議使用：

```text
GitLab Self-Hosted plugin variant
        |
        | apps: "./.app.json"
        v
Registered ChatGPT MCP App
  plugin_asdk_app_...
        |
        v
https://gitlab-mcp.example.com/mcp
        |
        v
MCP OAuth discovery
        |
        v
GitLab OAuth
        |
        v
GitLab REST API v4
```

### 1. 在 ChatGPT 註冊 MCP server

開啟 Developer mode，新增已部署的 public HTTPS `/mcp` endpoint，完成 OAuth，並確認該 connection 可以 scan / expose GitLab tools。

ChatGPT 建立 connection 後，複製平台產生的 technical ID。目前這類 ChatGPT App ID 會以：

```text
plugin_asdk_app_
```

開頭。

不要自己猜這個值，也不要把 workspace-specific App ID commit 到 portable public plugin。

### 2. 建立 App-bound plugin variant

使用第一級 helper：

```bash
python3 scripts/build_chatgpt_app.py \
  --app-id plugin_asdk_app_REPLACE_ME \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

也支援環境變數：

```bash
export CHATGPT_APP_ID=plugin_asdk_app_REPLACE_ME
export GITLAB_MCP_URL=https://gitlab-mcp.example.com/mcp
python3 scripts/build_chatgpt_app.py
```

Generated marketplace 會輸出到：

```text
dist/gitlab-chatgpt-marketplace/
```

Generated plugin 會包含：

```text
plugins/gitlab-self-hosted/
├── .app.json
└── .codex-plugin/
    └── plugin.json
```

其中 manifest 會宣告：

```json
{
  "apps": "./.app.json"
}
```

`.app.json` 則會把 plugin 的 `gitlab-self-hosted` app key 指向已註冊的 `plugin_asdk_app_...` technical ID。

Generated marketplace 使用 `authentication: ON_INSTALL`，讓 App connection 成為 plugin installation path 的一部分。

### 3. Import 並安裝 generated marketplace

把 generated marketplace source import / 加入目標 ChatGPT 或 Codex workspace，然後安裝：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

除非該 App ID 已明確被平台定義為可跨 workspace 使用，否則 generated artifact 只應該用在擁有該 App / connection 的 workspace。

## 為什麼 public plugin 仍維持 endpoint-neutral

Registered ChatGPT MCP App ID 是平台產生的 technical ID，通常屬於特定 user / workspace connection。Public Git repository 無法在 install-time 安全地猜出或動態取得任意使用者的 App ID。

因此 repo 明確分成兩層：

- **Portable source plugin**：公開的 skills 與 metadata，不包含 workspace-specific App ID。
- **Generated App-bound plugin**：針對某一個 registered ChatGPT MCP App 產生 `.app.json` 與 `apps: "./.app.json"`。

這樣可以避免把 placeholder 當 active dependency 發布，也避免所有使用者被默默導向 maintainer-controlled MCP deployment。

## Direct remote MCP fallback

對直接支援 custom MCP server 的 Client，仍可以手動新增 remote HTTPS `/mcp` endpoint，不需要產生 App-bound marketplace。這條路保留給 development、troubleshooting 與 MCP client 測試。

Reference configuration：

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

Committed example 刻意使用：

```text
https://gitlab-mcp.example.com/mcp
```

不要把 public example 改成 private 或 organization-specific endpoint。

## 驗證 MCP endpoint

在綁定 ChatGPT App 前先驗證 remote deployment：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會檢查 public HTTPS URL、OAuth Protected Resource Metadata、Authorization Server Metadata、DNS safety，以及未登入 `/mcp` 是否回傳正確 OAuth challenge。

## OAuth server endpoints

OAuth mode 下 bundled server 提供：

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

Server 支援 CIMD 與 DCR-compatible registration；downstream MCP OAuth 與 upstream GitLab OAuth 都使用 PKCE S256。

## Local development fallback

localhost 只透過 explicit local variant 使用：

```bash
python3 scripts/build_local_variant.py
```

該 development artifact 會綁：

```text
http://127.0.0.1:3333/mcp
```

Public root marketplace 不會自動選 localhost。

## Compatibility helpers

底層 helper 仍保留：

```text
scripts/build_chatgpt_variant.py
```

`build_chatgpt_app.py` 是建議給 ChatGPT 使用的 wrapper，因為它會驗證目前 `plugin_asdk_app_...` technical-ID 格式，也支援 `CHATGPT_APP_ID` / `GITLAB_MCP_URL` 環境變數。

`scripts/build_personal_variant.py` 則保留給 explicit direct remote-MCP packaging。

## Troubleshooting

如果 plugin 看得到，但沒有 GitLab tools：

1. 先確認 remote MCP connection 本身可以 scan / expose GitLab tools。
2. 確認 OAuth 是針對同一個 connection 完成。
3. 確認複製的 technical ID 以 `plugin_asdk_app_` 開頭。
4. 打開 generated `plugins/gitlab-self-hosted/.app.json`，確認裡面是完全相同的 ID。
5. 確認 generated `plugin.json` 有 `"apps": "./.app.json"`，而且沒有殘留 direct `.mcp.json` dependency。
6. 安裝 generated `gitlab-self-hosted@ademkao-gitlab-chatgpt` package；不要假設已安裝的 portable source plugin 會被原地修改。

## Public configuration guard

CI 會持續保護 portable source 的 endpoint-neutral 設計，並額外 smoke-test registered-App packaging path，確認 unsafe MCP URL 會被拒絕、generated App-bound plugin 真的包含預期 `.app.json` dependency。
