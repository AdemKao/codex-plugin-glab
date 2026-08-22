# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

這份 matrix 用來區分「這個 repo 可以實作的能力」與「OpenAI / GitLab 平台目前實際開放的能力」。

> Snapshot date：**2026-08-23**。正式環境決策前請重新確認平台最新文件。

| 能力 | Codex + source plugin | ChatGPT Web + Custom MCP App | ChatGPT mobile |
| --- | --- | --- | --- |
| 安裝／使用 GitLab workflow skills | 可以 | Workspace 以 plugin 方式提供後可以 | 依平台支援狀況 |
| 連 GitLab 官方 remote MCP | 可以，使用 bundled `.mcp.json` | 可以，透過 Custom MCP App | 目前 custom MCP apps 不支援 mobile |
| GitLab OAuth | 可以，透過 MCP client flow | 可以，透過 Custom MCP App flow | 目前 custom MCP apps 不可用 |
| 讀 projects/repositories | 可以，依 GitLab MCP/version/access | 可以 | 目前無法透過這條 custom app 路徑 |
| 讀 issues/MRs | 可以 | 可以 | 目前無法透過這條 custom app 路徑 |
| 建立／更新 issues/MRs | MCP 有提供時直接使用；本機 Codex workflow 可用 `glab` fallback | 完整 MCP write 需要符合資格的 workspace/plan 並啟用對應 tools | 目前無法透過這條 custom app 路徑 |
| 檢查 pipelines/jobs | 可以 | tools 有提供時可以 | 目前無法透過這條 custom app 路徑 |
| 修改 local working tree | 可以，透過本機 Codex execution environment | ChatGPT 遠端預設沒有你的 local working tree | 不行 |
| `git add` / local commit | 可以 | 除非另外接 execution environment，否則不行 | 不行 |
| 從 local checkout `git push` | 可以 | 預設沒有 local checkout；有 write tools 時改走 GitLab MCP | 不行 |
| 把 workspace app 綁定到 plugin | 可選，用 generated variant | 可以，使用實際 workspace app/connector ID | Binding 可以存在，但 mobile 目前不能呼叫 custom MCP app |

## Plan 說明

目前 OpenAI 文件表示：

- 完整 MCP（包含 write/modify）正以 beta 形式提供給 Business、Enterprise、Edu。
- Pro 可在 Developer Mode 使用 custom MCP apps，但主要受限於 read/fetch，而不是完整 write/modify。
- Custom MCP Apps 目前只支援 Web。

這些限制屬於 ChatGPT 平台，不是 GitLab 或本 repo 的限制。

## Backend ownership

| Layer | Owner |
| --- | --- |
| GitLab API | GitLab |
| GitLab 官方 MCP Server | GitLab |
| GitLab MCP integration 使用的 OAuth | GitLab / MCP client flow |
| GitLab workflow skills | `codex-plugin-glab` |
| Local commit/push fallback | Codex environment + `git` / `glab` |
| ChatGPT workspace app registration | ChatGPT workspace admin / OpenAI platform |
| Custom MCP Apps 的 mobile support | OpenAI platform |

## 結論

多架一台 MCP Server 無法解決目前 ChatGPT mobile 的限制。最容易維護的架構是直接使用 GitLab 官方 MCP，讓本 repo 專注在 workflow skills、安全 routing、plugin packaging、validation 與 app binding。
