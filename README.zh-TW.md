# codex-plugin-glab

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個開源的 GitLab Plugin，支援 Codex，並提供 ChatGPT Custom MCP App 的 packaging 路徑。設計原則接近官方 GitHub Plugin：遠端結構化操作優先使用整合工具；只有需要本機 working tree，或 MCP 尚未覆蓋某項能力時，才使用 local `git` + `glab` fallback。

> 狀態：**v0.2.0 / early preview**。GitLab MCP 與 ChatGPT Custom MCP App 的平台能力可能會獨立更新。

## 最重要的架構決策

對 GitLab.com 而言，**你不需要自己架 MCP Server**。

GitLab 已提供官方 remote MCP endpoint：

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

這個 repo 負責 workflow instructions、routing、安全規則、packaging，以及 local `git`/`glab` fallback。GitLab 負責 GitLab API、官方 MCP Server 與 OAuth-backed integration path。

## 支援範圍

- 瀏覽與檢查 GitLab projects/repositories。
- 讀取 repository files、branches、commits。
- 列出、建立、更新、留言與整理 issues。
- 列出、檢查、建立、更新、留言、review 與 merge Merge Requests。
- 檢查 pipelines 與 failed jobs。
- 建立 branches。
- 使用 `git` / `glab` 安全完成 local commit 與 push。
- 讓 Codex 使用 GitLab 官方 MCP Server。
- 產生 workspace-specific ChatGPT app-backed plugin variant，同時避免把 workspace ID 或 token commit 進 source repo。
- 文件預設英文，並提供繁體中文版本。

## Codex

Source plugin 內建：

```text
plugins/gitlab/.mcp.json
```

它直接指向 GitLab 官方 MCP endpoint。因此一般 Codex 流程是：

```text
install plugin
    -> connect/login to GitLab MCP
    -> GitLab OAuth
    -> use GitLab skills and tools
```

GitLab.com 不需要另外架一台 MCP Server。

需要本機 publish 時，plugin 仍可使用 local `git` / `glab` 處理 working-tree state、commit 與 push。

## ChatGPT Web

ChatGPT 會把外部 MCP 整合視為 **App**。在 ChatGPT Web 中建立 Custom MCP App，endpoint 設成：

```text
https://gitlab.com/api/v4/mcp
```

完成 GitLab OAuth 並在 Developer Mode 測試。取得目標 workspace 可用的 app/connector ID 後，建立 app-bound plugin variant：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_GITLAB_APP_OR_CONNECTOR_ID
```

產生結果：

```text
dist/gitlab-chatgpt/
```

裡面會包含真正的 `.app.json`，以及已加入：

```json
{
  "apps": "./.app.json"
}
```

的 plugin manifest copy。

Source plugin 仍保持 portable，不會 commit 你的 workspace-specific ID。

完整說明：[docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

## ChatGPT mobile

截至 **2026-08-23**，OpenAI 文件明確說明 Custom MCP Apps **只支援 Web**。安裝這個 plugin 或多架一台 MCP proxy 都無法繞過這個平台限制。

未來 OpenAI 開放 mobile Custom MCP Apps 時，預期可以沿用同一套 plugin + GitLab 官方 MCP，不需要重寫 GitLab backend。

請看 [docs/capability-matrix.zh-TW.md](docs/capability-matrix.zh-TW.md)。

## Repo 結構

```text
.agents/plugins/marketplace.json       Marketplace metadata
plugins/gitlab/
  .codex-plugin/plugin.json            Portable Codex plugin manifest
  .mcp.json                            GitLab 官方 MCP declaration
  app-template/.app.json.example       Workspace app-binding template
  skills/                              Workflow skills
  references/                          Routing / safety references
scripts/
  validate_plugin.py                   Source validation
  build_chatgpt_variant.py             ChatGPT app-bound package builder
docs/
  chatgpt-app.md                       ChatGPT Web setup
  capability-matrix.md                 Codex/Web/mobile matrix
dist/                                  Generated workspace variants（gitignored）
```

## Requirements

### Codex

- 支援 plugin / MCP 的新版 Codex。
- 可存取目標 projects 的 GitLab 帳號。
- Local repository workflows 需要 `git`。
- 強烈建議安裝 `glab`，用於 local auth、MR fallback 與 publish flow。

### ChatGPT

- 你的 ChatGPT plan/workspace/role 必須支援你需要的 Custom MCP 能力。
- 建立與測試 Custom MCP App 需要 Developer Mode。
- 建立一個連到 GitLab 官方 MCP endpoint 的 Custom MCP App。
- 完整 write/modify actions 需要符合資格的 workspace/plan，並啟用對應 tools。

## Local development install

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

接著把 `.agents/plugins/marketplace.json` 中的 `gitlab` entry 加到個人 marketplace 設定，然後重新啟動 Codex。

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

本專案也能針對相容的 GitLab Self-Managed/Dedicated MCP endpoint 與 `glab` host 設定。這跟「GitLab.com 是否需要自己架 MCP」是兩件不同的事情；GitLab.com 不需要。

請看 [docs/self-managed.zh-TW.md](docs/self-managed.zh-TW.md)。

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

## Validation

```bash
python3 scripts/validate_plugin.py
```

可以用非敏感 fake ID smoke-test builder：

```bash
python3 scripts/build_chatgpt_variant.py --app-id test_connector_123 --force
```

Builder 只會寫入被 ignore 的 `dist/`。

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT App Integration](docs/chatgpt-app.zh-TW.md)
- [Capability Matrix](docs/capability-matrix.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)

## 貢獻

請看 [CONTRIBUTING.md](CONTRIBUTING.md) 或 [CONTRIBUTING.zh-TW.md](CONTRIBUTING.zh-TW.md)。

## Security

請看 [SECURITY.md](SECURITY.md)。不要在公開 issue 中貼 credentials 或 private repository data。

## License

MIT，請看 [LICENSE](LICENSE)。
