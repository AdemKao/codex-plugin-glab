# GitLab Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

這個 plugin 結合 GitLab Hosted MCP Server 與本機 `git` / `glab` workflow。

Project、issue、MR、branch、commit、repository file、pipeline 等結構化資料優先使用 MCP；working tree 修改、commit、push，或 GitLab instance 尚未提供對應 MCP tool 時，再使用本機工具 fallback。

主要 skills：

- `gitlab` — 一般 GitLab routing 與 triage。
- `gitlab-setup` — authentication、host 與 capability 設定。
- `glab-publish` — branch、stage、test、commit、push、建立 MR。
- `glab-address-comments` — 處理 MR review feedback 並 push 修正。
- `glab-fix-ci` — 分析 GitLab pipeline/job failure 並發布修正。

預設 MCP endpoint 是 GitLab.com。Self-Managed 請看 repo 的 `docs/self-managed.zh-TW.md`。
