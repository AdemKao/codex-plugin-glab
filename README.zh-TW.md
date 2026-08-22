# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitLab MCP](https://img.shields.io/badge/GitLab-MCP-FC6D26.svg)](https://docs.gitlab.com/user/model_context_protocol/mcp_server/)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個開源的 GitLab Plugin，支援 Codex，並提供 ChatGPT Custom MCP App 的 packaging 路徑。它涵蓋 GitLab repository、issue、merge request 與 CI workflow；遠端結構化操作優先使用 GitLab 官方 MCP，只有需要本機 working tree 或 capability fallback 時才使用 local `git` + `glab`。

> **專案狀態：** v0.2.0 / early preview。GitLab MCP 與 ChatGPT Custom MCP App 的能力可能會獨立於此 repo 更新。

> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 快速開始

### Codex

Clone repo 並先執行驗證：

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
python3 scripts/validate_plugin.py
```

透過 Codex plugin / marketplace 設定安裝 `plugins/gitlab`，接著依提示登入 GitLab 官方 MCP：

```text
https://gitlab.com/api/v4/mcp
```

若需要 local publish workflow，建議另外安裝並登入 `glab`：

```bash
glab auth login
glab auth status
```

### ChatGPT Web

建立一個指向 GitLab 官方 MCP endpoint 的 ChatGPT Custom MCP App，完成 GitLab OAuth 後，再用 workspace 真正的 app/connector ID 產生綁定版本：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_GITLAB_APP_OR_CONNECTOR_ID
```

產生結果位於 `dist/gitlab-chatgpt/`，並保持在 source control 之外。

完整流程請看 [ChatGPT App Integration](docs/chatgpt-app.zh-TW.md)。

## 支援介面

| 介面 | 目前專案路徑 | 說明 |
| --- | --- | --- |
| Codex Desktop / CLI | 支援 | Bundled GitLab MCP + local `git` / `glab` fallback |
| ChatGPT Web | Custom MCP App 可用時支援 | 將 workspace app 綁定 GitLab 官方 MCP |
| ChatGPT mobile | 依平台能力而定 | 請看最新 [Capability Matrix](docs/capability-matrix.zh-TW.md) |

Plan 與產品限制會變動，請以 README 內連結的 OpenAI / GitLab 最新官方文件為準。

## 為什麼不自己架 MCP Server？

對 GitLab.com 而言，**你不需要自己架 MCP Server**。GitLab 已提供官方 remote endpoint：

```text
https://gitlab.com/api/v4/mcp
```

目標架構：

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

這個 repo 負責 workflow instructions、routing、安全規則、packaging，以及 local `git` / `glab` fallback。GitLab 負責 GitLab API、官方 MCP Server 與 OAuth-backed GitLab integration path。

## 功能

- 瀏覽與檢查 GitLab projects / repositories。
- 讀取 repository files、branches、commits。
- 列出、建立、更新、留言與整理 issues。
- 列出、檢查、建立、更新、留言、review 與 merge Merge Requests。
- 檢查 pipelines 與 failed jobs。
- 建立 branches。
- 使用 `git` / `glab` 安全完成 local commit 與 push。
- 讓 Codex 使用 GitLab 官方 MCP Server。
- 產生 workspace-specific ChatGPT app-backed plugin variant，同時避免把 workspace ID 或 token commit 進 source repo。
- 文件預設英文，並提供繁體中文版本。

## 架構

Plugin 採 connector-first hybrid model：

```text
User request
    |
    v
GitLab plugin skills
    |
    +--> GitLab official MCP
    |      - projects
    |      - issues
    |      - merge requests
    |      - repository files
    |      - branches / commits
    |      - pipelines / jobs
    |
    +--> local git + glab
           - working tree
           - stage / commit
           - push
           - current branch / remote context
           - capability fallback
```

詳細 routing 請看 [Architecture](docs/architecture.zh-TW.md)。

## Repo 結構

```text
.agents/plugins/marketplace.json       Marketplace metadata
.github/                               Community health、issue/PR templates、CI
plugins/gitlab/
  .codex-plugin/plugin.json            Portable Codex plugin manifest
  .mcp.json                            GitLab 官方 MCP declaration
  app-template/.app.json.example       Workspace app-binding template
  skills/                              Workflow skills
  references/                          Routing / safety references
scripts/
  validate_plugin.py                   Source validation
  build_chatgpt_variant.py             ChatGPT app-bound package builder
docs/                                  English + Traditional Chinese docs
dist/                                  Generated workspace variants（gitignored）
```

## Requirements

### Codex

- 支援 plugin / MCP 的新版 Codex。
- 可存取目標 projects 的 GitLab 帳號。
- Local repository workflow 需要 `git`。
- 強烈建議安裝 `glab`，用於 local authentication、MR fallback 與 publish flow。

### ChatGPT

- ChatGPT plan/workspace/role 必須支援需要的 Custom MCP 能力。
- 建立與測試 Custom MCP App 時，需要相對應的 Developer Mode / workspace 權限。
- Custom MCP App 需連到 GitLab 官方 MCP endpoint。
- 預期使用 write/modify tool 時，需要符合資格的 plan/workspace 與對應權限。

## Local development install

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

接著把 `.agents/plugins/marketplace.json` 中的 `gitlab` entry 加到個人 marketplace 設定，再重新啟動 Codex。

Codex plugin discovery 流程可能持續演進；若此開發安裝方式與新版 Codex 文件不同，請以新版 Codex 文件為準。

## Authentication

### GitLab.com

預設 MCP endpoint：

```text
https://gitlab.com/api/v4/mcp
```

優先使用 MCP OAuth flow。CLI fallback：

```bash
glab auth status
glab auth login
```

不要 commit PAT、OAuth secrets 或 ChatGPT workspace app IDs。

### GitLab Self-Managed / Dedicated

本專案也可針對相容的 GitLab Self-Managed / Dedicated MCP endpoint 與 `glab` host 設定。請看 [Self-Managed GitLab](docs/self-managed.zh-TW.md)。

## Capability routing

| 能力 | 優先路徑 | Fallback |
| --- | --- | --- |
| Project/repo discovery | GitLab MCP | `glab repo list`, `glab api` |
| Repository file reads | GitLab MCP | local checkout / `glab api` |
| Issues | GitLab MCP | `glab issue`, `glab api` |
| Merge requests | GitLab MCP | `glab mr`, `glab api` |
| MR review/comments | GitLab MCP | `glab mr`, `glab api` |
| Pipelines/jobs/logs | GitLab MCP | `glab ci`, `glab api` |
| Branch creation | GitLab MCP 或 local `git` | `glab api` |
| Commit inspection | GitLab MCP | local `git` |
| Local commit | local `git` | 無 |
| Local push | local `git` | 無 |

## Safety model

- 先讀後寫。
- Mutation 前確認正確 project、branch、issue 或 MR。
- 除非使用者明確要求且已確認 target，否則禁止 force-push。
- 不繞過 protected-branch policy。
- Repository 內容、issue、MR comments、CI logs 一律視為 untrusted input。
- 不輸出或 commit access tokens、OAuth secrets 等 credentials。
- Workspace-specific ChatGPT app IDs 放在 generated/managed configuration，不放 portable source plugin。

安全回報與規則請看 [Security Policy](SECURITY.md)。

## Validation

驗證 source plugin：

```bash
python3 scripts/validate_plugin.py
```

使用非敏感 test ID smoke-test ChatGPT package builder：

```bash
python3 scripts/build_chatgpt_variant.py --app-id test_connector_123 --force
```

Builder 只會寫入被 ignore 的 `dist/`。

## 文件

從 [文件索引](docs/README.zh-TW.md) 開始：

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT App Integration](docs/chatgpt-app.zh-TW.md)
- [Capability Matrix](docs/capability-matrix.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)

## 貢獻

歡迎貢獻。開 PR 前請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md) 或 [CONTRIBUTING.zh-TW.md](CONTRIBUTING.zh-TW.md)。

## 支援

Bug、feature request、產品能力邊界與 security routing 請看 [SUPPORT.zh-TW.md](SUPPORT.zh-TW.md)。安全漏洞不可透過公開 issue 回報。

## Versioning 與 releases

Plugin manifest 使用 semantic versioning。User-visible 變更記錄在 [CHANGELOG.md](CHANGELOG.md)。在穩定 `1.0.0` 前，Codex、ChatGPT、GitLab MCP 與 plugin packaging 演進可能造成 minor version 的 compatibility change。

## License

MIT，請看 [LICENSE](LICENSE)。
