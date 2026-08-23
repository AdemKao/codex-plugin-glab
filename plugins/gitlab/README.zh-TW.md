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

## 重要：Codex MCP 與 ChatGPT plugin binding 是不同層

Portable source plugin 會保留 `./.mcp.json -> http://127.0.0.1:3333/mcp`，作為同機 Codex 的 local fallback。

你在 MCP settings 裡另外新增並完成 OAuth 的 remote MCP server，**不會自動取代** `@GitLab` plugin 內 packaged 的 localhost dependency。若要在 ChatGPT 透過 `@GitLab` 使用 remote MCP，必須先建立/連線對應的 ChatGPT App / connector，再用 `scripts/build_chatgpt_variant.py` 產生並安裝 workspace-bound variant。產生出的 ChatGPT variant 只保留 App binding，並移除 source localhost MCP dependency。

完整設定與 troubleshooting 請看 `docs/chatgpt-app.zh-TW.md`。
