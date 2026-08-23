# GitLab Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

這個 plugin 結合本 repo 自帶的 self-hosted GitLab MCP Server 與本機 `git` / `glab` workflow。

Project、issue、MR、branch、commit、repository file、pipeline 等結構化資料優先使用 MCP；working tree 修改、commit、push，或 GitLab instance 尚未提供對應 MCP tool 時，再使用本機工具 fallback。

主要 skills：

- `gitlab` — 一般 GitLab routing 與 triage。
- `gitlab-setup` — authentication、host 與 capability 設定。
- `glab-publish` — branch、stage、test、commit、push、建立 MR。
- `glab-address-comments` — 處理 MR review feedback 並 push 修正。
- `glab-fix-ci` — 分析 GitLab pipeline/job failure 並發布修正。

## 重要：portable marketplace 與 ChatGPT App binding

Portable source plugin 會保留 `./.mcp.json -> http://127.0.0.1:3333/mcp`，作為同機 Codex 的 local fallback。Repo root marketplace `ademkao-codex-plugins` 安裝的就是這份 portable source package。

你在 MCP settings 裡另外新增並完成 OAuth 的 remote MCP server，**不會自動取代** `@GitLab` packaged 的 localhost dependency。

若要讓 `@GitLab` 使用 remote MCP：

1. 建立/連線指向 remote HTTPS `/mcp` 的 ChatGPT App / connector；
2. 完成該 App / connector 的 OAuth；
3. 取得既有 App / connector ID；
4. 用該 ID 與 remote MCP URL 執行 `scripts/build_chatgpt_variant.py`；
5. import/install generated marketplace root。

Generated marketplace 名稱是 `ademkao-gitlab-chatgpt`，因此 plugin reference 是：

```text
gitlab@ademkao-gitlab-chatgpt
```

Generated plugin 使用 `apps: "./.app.json"`，而且不包含 `mcpServers` 與 `.mcp.json`，避免 localhost fallback 和 remote App binding 競爭。

完整設定與 troubleshooting 請看 `docs/chatgpt-app.zh-TW.md`。
