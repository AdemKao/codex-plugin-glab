# ChatGPT App 整合

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

使用預設 GitLab.com 整合時，這個專案**不需要再自行架設一套 GitLab MCP Server**。GitLab 已經提供官方遠端 MCP endpoint：

```text
https://gitlab.com/api/v4/mcp
```

目標架構如下：

```text
Codex / ChatGPT
      |
      +-- codex-plugin-glab skills
      |
      +-- GitLab MCP / ChatGPT app binding
                  |
                  v
      https://gitlab.com/api/v4/mcp
                  |
                OAuth
                  |
                  v
                GitLab
```

## Codex 路徑

原始 plugin 已包含 `plugins/gitlab/.mcp.json`，所以 Codex 可以直接連 GitLab 官方 MCP Server 並使用這個 repo 提供的 GitLab skills。這條路徑不需要 ChatGPT workspace app ID。

## ChatGPT Web 路徑

ChatGPT 會把外部 MCP 整合視為一個 **App**。Workspace 部署方式：

1. 使用支援 Custom MCP Apps / Developer Mode 的 ChatGPT workspace。
2. 在 ChatGPT Web 的 Apps 設定中，依你的 workspace role 開啟 Developer Mode。
3. 建立 Custom MCP App，endpoint 設為：

   ```text
   https://gitlab.com/api/v4/mcp
   ```

4. 完成 GitLab OAuth。不要把 GitLab access token 貼到 plugin 檔案或聊天訊息裡。
5. 先測試無副作用的 read 操作，例如列出可存取 project 或讀取一個 issue/MR。
6. 如果 workspace 有啟用 write/modify tools，先在測試 project 驗證後再用於正式環境。
7. 依 workspace policy 把 App 發佈／開放給指定使用者。

OpenAI 目前明確說明 Custom MCP Apps **只支援 Web**，尚未支援 ChatGPT mobile。因此多架一台 server 並不能讓手機版繞過這個限制。

## 把 workspace App 綁進 Plugin variant

OpenAI Plugin 的 App binding 使用 `.app.json`，其中需要一個實際存在、且目標 workspace 可用的 app/connector ID。這個 repo 不會提交某個 workspace 專屬 ID。

建立好 GitLab Custom MCP App 並取得可用的 app/connector ID 後，執行：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_GITLAB_APP_OR_CONNECTOR_ID
```

Script 會建立：

```text
dist/gitlab-chatgpt/
  .app.json
  .codex-plugin/plugin.json
  .mcp.json
  skills/
  references/
```

產生的 manifest 會增加：

```json
{
  "apps": "./.app.json"
}
```

而 `.app.json` 會把 `gitlab` app name 綁定到你提供的 workspace app/connector ID。

`dist/` 會被 git ignore，避免 workspace-specific ID 被誤 commit。

## 為什麼 source plugin 不直接放 `.app.json`

如果 source repo 放一個假的 placeholder app ID，安裝包看起來像已設定完成，實際上卻不可用。因此 source plugin 保持為有效的 Codex + MCP plugin；等真的有 workspace app/connector ID 後，再由 script 產生 app-backed variant。

OpenAI 的 role-based plugin 範例也是類似概念：App-backed plugin 要綁定目標 workspace 可用的 ID，而不是複製別人的 workspace ID。

## 目前方案與 Surface 限制

截至 2026-08-23，OpenAI 文件列出的限制包括：

- Custom MCP Apps 目前只支援 ChatGPT Web，不支援 mobile。
- 完整 MCP write/modify 功能目前以 beta 形式提供給 Business、Enterprise、Edu。
- Pro 可在 Developer Mode 使用 custom MCP，但主要受到 read/fetch 能力限制，沒有完整 write/modify。
- ChatGPT 需要連遠端 MCP Server；GitLab.com 官方 MCP endpoint 已符合這個需求。

這些都是平台能力，可能會獨立於本 repo 更新。正式上線前請重新確認 OpenAI 最新文件。

## 未來 Mobile 遷移

當 OpenAI 未來支援 mobile Custom MCP Apps 時，GitLab 端理論上不需要重新設計：

```text
ChatGPT mobile
      |
      v
installed GitLab plugin + enabled GitLab app
      |
      v
GitLab official MCP
      |
      v
GitLab
```

在 mobile 支援之前，請使用 Codex 或 ChatGPT Web。

## Production checklist

- GitLab 認證優先使用 OAuth，不把 PAT commit 進 repo。
- 寫入前確認 GitLab identity、project、branch、issue/MR 目標。
- 保留 protected branch 規則。
- 高影響或破壞性操作必須有明確使用者意圖。
- Repository 內容、issue、MR、CI log 都視為 untrusted input。
- App 僅開放給真正需要的 users/roles。
- GitLab MCP 或 ChatGPT 平台更新後重新測試 tools。

## References

- GitLab MCP Server: https://docs.gitlab.com/user/model_context_protocol/mcp_server/
- OpenAI Developer Mode and MCP Apps: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta
- OpenAI Plugins in ChatGPT and Codex: https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex
- OpenAI ChatGPT App Templates: https://help.openai.com/en/articles/20001247-chatgpt-app-templates
