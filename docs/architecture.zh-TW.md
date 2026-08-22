# 架構

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## 設計選擇

本專案不是在 plugin 裡重做一套 GitLab API client，而是參考官方 Codex GitHub Plugin 的 hybrid 方向。

執行分成兩層：

1. **GitLab Hosted MCP**：處理遠端結構化操作。
2. **本機 `git` + `glab`**：處理 working tree，以及本質上屬於 local 或目前 MCP 版本尚未提供的操作。

這樣可以避免重複實作 authentication/API，同時保留 commit/push 能力。

## 各層

### Plugin manifest

`plugins/gitlab/.codex-plugin/plugin.json` 定義 plugin metadata、capabilities、skills 與 MCP companion file。

### MCP

`plugins/gitlab/.mcp.json` 預設指向 GitLab.com Hosted MCP endpoint，由 Codex 處理 MCP OAuth session。

### Skills

Skills 負責 routing、安全規則與重複 workflow。因為 GitLab MCP tools 會隨 GitLab 版本演進，因此不應假設所有版本都有同一組 tools。

### Local fallback

`git` 負責 working tree、stage、commit、push；`glab` 負責 GitLab host/auth context 與 CLI/API fallback。

## 為什麼不是只用 `glab mcp serve`？

GitLab CLI 的確也有 experimental local MCP server，對 Self-Managed 很有價值，但其 tool coverage 與穩定度和 Hosted MCP 不完全一致。因此預設採 Hosted MCP，`glab` 作 compatibility layer。

## 為什麼不自己包 REST API？

自建 REST wrapper 會重複處理 authentication、pagination、API evolution 與 MCP 已經解決的問題。這個 plugin 把重點放在 Codex workflow 與安全 routing。
