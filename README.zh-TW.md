# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。Repo 現在有兩個一等公民：

1. GitLab Plugin：負責 workflow skills、安全 routing 與本機 `git` / `glab` fallback；
2. Self-hosted GitLab MCP Server：直接呼叫 GitLab REST API。

> **狀態：** v0.3.0 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 為什麼改成自架 MCP Server

GitLab 有官方 MCP，但實際可用性與 prerequisite 可能讓部分 GitLab.com group 或 Self-Managed 環境無法使用。因此 `codex-plugin-glab` 從 v0.3.0 起不再依賴 GitLab native MCP。

Bundled MCP Server 使用標準 GitLab REST API，所以同一套程式可以連 GitLab.com、GitLab Self-Managed 或 GitLab Dedicated；實際能力取決於 GitLab 版本與設定 token 的權限。

## 架構

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP
            v
+-------------------------------+
| codex-plugin-glab MCP server  |
| - tool schemas                |
| - auth boundary               |
| - read/write policy           |
| - project allowlist           |
+---------------+---------------+
                |
                | GitLab REST API v4
                v
      GitLab.com / Self-Managed
```

Codex Plugin 仍會提供 GitLab-specific skills；當任務需要 local working tree、commit 或 push 時，仍可使用 `git` / `glab` fallback。

## 快速開始：啟動 MCP Server

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
```

至少設定：

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

啟動：

```bash
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

Local MCP endpoint：

```text
http://127.0.0.1:3333/mcp
```

若要讓 ChatGPT 從遠端連線，將同一個 container 部署到 HTTPS endpoint，再把 `https://.../mcp` 設定到 ChatGPT Custom MCP App。不要把內含 server-side GitLab token 的 MCP endpoint 以 unauthenticated public service 方式直接暴露。

## 安全預設

MCP Server 預設 read-only：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

可選擇限制允許操作的 project：

```bash
GITLAB_ALLOWED_PROJECTS=123,group/backend,group/frontend
```

一般 write tool 需要 `GITLAB_WRITE_ENABLED=true`；MR merge 還要再另外設定 `GITLAB_MERGE_ENABLED=true`。因此開啟 issue/MR 寫入，不會順便把 merge 權限一起開啟。

非 loopback bind 預設需要 `MCP_AUTH_TOKEN`。只有當你明確設定 `MCP_ALLOW_INSECURE_NO_AUTH=true` 時才允許無 MCP auth 對外 bind；這個模式只應使用在外層已經有 authentication 的 private tunnel / gateway。

## 支援的 MCP Tools

### Read

- 目前 GitLab user
- groups / projects
- project metadata
- branches / commits
- issues
- merge requests / diffs
- pipelines
- pipeline jobs / job traces

### Write

- 建立、更新、留言 issue
- 建立、更新、留言 merge request
- 建立 branch
- merge merge request（需額外 merge flag）

Server 不提供任意 GitLab API proxy，因此 MCP client 只能呼叫已明確定義與驗證的 tools。

## GitLab Authentication

v0.3.0 先支援 server-side GitLab token：

```bash
GITLAB_TOKEN_TYPE=private-token
GITLAB_TOKEN=...
```

或：

```bash
GITLAB_TOKEN_TYPE=bearer
GITLAB_TOKEN=...
```

請使用能滿足所啟用 tools 的最小權限 token。Per-user OAuth passthrough 會放到後續版本；v0.3.0 主要定位是 single-user 或 trusted-workspace deployment。

## ChatGPT

ChatGPT 需要連 remote MCP server。將本 repo 的 MCP Server 部署成 HTTPS endpoint、配置支援的 authentication layer，接著在 ChatGPT 建立 Custom MCP App 並 Scan Tools。

ChatGPT plan / workspace 能力由 OpenAI 控制，可能獨立於此 repo 改變。整合流程與安全注意事項請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

## Codex Plugin

Portable plugin 位於：

```text
plugins/gitlab/
```

預設 `.mcp.json` 會連 bundled local MCP：

```text
http://127.0.0.1:3333/mcp
```

Local development：

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

接著將 `.agents/plugins/marketplace.json` 裡的 `gitlab` entry 加入個人 marketplace 設定並重啟 Codex。

## Repo 結構

```text
.agents/plugins/marketplace.json
plugins/gitlab/                 # ChatGPT/Codex plugin assets 與 skills
packages/mcp-server/            # self-hosted GitLab MCP server
Dockerfile
docker-compose.yml
.env.example
docs/
scripts/validate_plugin.py
VERSION
```

## Development

Repo validation：

```bash
python3 scripts/validate_plugin.py
```

MCP test + build：

```bash
cd packages/mcp-server
npm install
npm run check
```

Production image：

```bash
docker build -t codex-plugin-glab .
```

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT App setup](docs/chatgpt-app.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Support](SUPPORT.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest 與 MCP package version 必須一致，CI 會在 merge 前驗證。User-visible 變更記錄在 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT，請看 [LICENSE](LICENSE)。
