# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.1 — foundation

- Codex plugin manifest 與 marketplace metadata。
- GitLab.com 官方 Hosted MCP integration。
- 一般 GitLab routing skill。
- Setup/authentication workflow。
- Commit/push/open-MR workflow。
- MR feedback workflow。
- CI failure workflow。
- 英文 + 繁體中文文件。
- CI validation。

## v0.2 — ChatGPT App integration

- GitLab.com backend 持續使用 GitLab 官方 remote MCP Server。
- 不建立或代管重複的 GitLab MCP proxy。
- 加入 ChatGPT Web Custom MCP App setup 文件。
- 加入 Codex / ChatGPT Web / ChatGPT mobile capability matrix。
- 加入 portable `.app.json` binding template，但不 commit workspace-specific ID。
- 加入 builder，在 gitignored `dist/` 產生 workspace-specific app-bound plugin。
- 記錄目前 OpenAI plan/surface 限制與未來 mobile migration path。

## v0.3 — compatibility, safety, and UX

- 建立 GitLab.com 與代表性 Self-Managed/Dedicated 版本 test matrix。
- 更完整的 capability probing 與 graceful fallback 規則。
- 擴充 issue/MR labels、reviewers、milestones、work items 指南。
- 加入 release/tag workflow。
- 多 remote repository 寫入前提供更強的 target confirmation helpers。
- 加入 plugin evaluation / benchmark fixtures。
- 增加更多 CI/pipeline 修復場景。

## Future — public Plugin Directory distribution

- 等 OpenAI distribution flow 穩定後，準備可發布的 app/plugin package。
- 加入正式 assets、screenshots、privacy/terms metadata 與 submission materials。
- 如果 OpenAI 未來提供 GitLab portable/templated app binding，優先採用；否則 workspace-specific app ID 持續不進 source control。
- OpenAI 開放 Custom MCP Apps mobile support 後重新驗證 mobile distribution。

即使未來有 app-backed ChatGPT distribution，開源 Codex plugin 仍必須可以獨立使用。
