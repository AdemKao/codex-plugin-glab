# GitLab Self-Hosted Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

Plugin reference：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

## Remote-first 設定

這個公開 plugin 刻意保持 endpoint-neutral。它會提供 GitLab workflow skills，但不會 commit 自動載入的 remote MCP URL、maintainer-specific MCP hostname，或私人 ChatGPT App / connection ID。

正常使用時，請在 ChatGPT、Codex 或實際提供 GitLab tools 的 MCP Client 中設定**由使用者自己決定的 remote HTTPS** endpoint，例如：

```text
https://gitlab-mcp.example.com/mcp
```

接著完成 OAuth，再先驗證 harmless read。

正常路徑不需要在使用者電腦執行 MCP Server、不需要產生 remote build variant，也不需要第二個 repo。MCP Server 可以直接使用同一個 `codex-plugin-glab` repo 部署到任何可連線的 HTTPS host。

## 為什麼 public plugin 不直接包含 `.mcp.json`

Agent Plugin 的 HTTP MCP 設定使用 literal absolute URL。`${GITLAB_MCP_URL}` 這類 placeholder 並不是 install-time URL substitution。若直接 commit `.mcp.json`，不是會把某一位 operator 的 endpoint 寫死，就是讓每次安裝都連到無效 placeholder。

中性 reference 檔案：

```text
workspace-binding/.mcp.remote.json.example
```

可以參考它的格式設定自己的 MCP Client，但真實 organization endpoint 應留在 public source plugin 之外。

## ChatGPT binding 限制

完成 OAuth 的 MCP App / connection 與 plugin package 是不同物件。如果某個 ChatGPT surface 要求 plugin-backed tools 必須有 explicit app dependency，endpoint-neutral plugin 無法動態得知任意 workspace connection technical ID。

Client 能直接提供 custom MCP tools 時，使用 user/workspace 自己的 connection。Managed workspace 若平台有合適的 App Template，也可以由 admin 填 workspace-specific 設定。Repo 的 legacy `build_chatgpt_variant.py` 只保留給確實必須綁定既有 technical ID 的相容情境。

## Local 開發 fallback

`localhost` 與公開 package 明確分離：

```bash
python3 ../../scripts/build_local_variant.py
```

產生的 local development marketplace 才會綁定：

```text
http://127.0.0.1:3333/mcp
```

Root marketplace 不會隱性選 localhost。

## Security

MCP deployment 建議從 read-only 開始：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

可用 `GITLAB_ALLOWED_PROJECTS` 限制 project。OAuth mode 的 write action 還需要 `gitlab:write`。

不要把 GitLab PAT、OAuth secret、organization-specific MCP URL 或 workspace-specific App / connection ID commit 到這個 plugin。

## Validation

在 repo root：

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
python3 scripts/validate_public_config.py
```

`validate_public_config.py` 會在公開 setup content 出現真實、非 example 的 `/mcp` endpoint 時直接失敗。
