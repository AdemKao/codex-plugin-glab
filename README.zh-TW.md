# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。Repo 有兩個一等公民：

1. GitLab Plugin：負責 workflow skills、安全 routing 與 local `git` / `glab` fallback；
2. Self-hosted GitLab MCP Server：直接透過 GitLab REST API 操作 GitLab。

> **狀態：** v0.4.0 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 為什麼要 self-host

GitLab native MCP 的可用性與 group / instance prerequisite 不一定適合每個 GitLab.com 或 Self-Managed 環境，因此本專案直接提供自己的 MCP Server；GitLab native MCP 改成 optional，而不是必要依賴。

Bundled server 可連 GitLab.com、GitLab Self-Managed 與 GitLab Dedicated；實際支援能力取決於目標 GitLab 版本是否提供相對應 REST API。

## 架構

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP + OAuth 或 shared bearer
            v
+-----------------------------------+
| codex-plugin-glab MCP server      |
| - MCP tool schemas                |
| - OAuth / auth boundary           |
| - read/write/merge policy         |
| - project allowlist               |
+----------------+------------------+
                 |
                 | per-user OAuth token
                 | 或 shared service token
                 v
       GitLab REST API v4
                 |
                 v
       GitLab.com / Self-Managed
```

Codex Plugin 在需要 local working tree、commit 或 push 時，仍可使用 `git` / `glab`。

## Authentication 模式

### 1. Shared-token mode

與 v0.3 相容。整個 MCP deployment 共用一個 GitLab identity。

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

適合單一使用者、CI/service integration，或明確希望整個 trusted workspace 使用同一個 service identity 的情境。

### 2. Per-user OAuth mode

每個 ChatGPT / Codex / MCP user 都授權自己的 GitLab identity；MCP Server 不再需要共用的 `GITLAB_TOKEN`。

先在 GitLab 建立 OAuth Application，callback 設為：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

接著設定：

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
OAUTH_STORE_PATH=/data/oauth-store.json
```

OAuth 流程：

```text
MCP client
   |
   | Protected Resource Metadata
   v
codex-plugin-glab OAuth gateway
   |
   | authorization code + PKCE
   v
GitLab OAuth
   |
   | 該使用者的 GitLab access/refresh token
   v
Encrypted MCP OAuth store
   |
   | MCP access/refresh token
   v
MCP client -> /mcp -> 以該使用者身分呼叫 GitLab
```

Server 在 MCP client 與 GitLab 兩段 authorization-code flow 都使用 PKCE S256。目前 MCP client 可使用 Dynamic Client Registration；後續會補 CIMD，作為新版 MCP registration path。

## Docker 快速開始

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# 編輯 .env，選 shared-token 或 oauth
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

MCP endpoint：

```text
http://127.0.0.1:3333/mcp
```

若要讓 ChatGPT 或其他 remote MCP client 使用，請部署成 HTTPS endpoint，再使用 `https://.../mcp`。

## OAuth endpoints

`MCP_AUTH_MODE=oauth` 時會提供：

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

未登入直接呼叫 `/mcp` 會得到 `401`，`WWW-Authenticate` 會指向 Protected Resource Metadata，讓 MCP client 啟動 OAuth discovery。

## 安全預設

Server 預設 read-only：

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

可選擇限制 project：

```bash
GITLAB_ALLOWED_PROJECTS=123,group/backend,group/frontend
```

一般 write tool 需要 `GITLAB_WRITE_ENABLED=true`；MR merge 還需要 `GITLAB_MERGE_ENABLED=true`。

OAuth 還多一層獨立限制：真正送出非 GET GitLab API 前，session 必須具備 `gitlab:write` scope。即使 client 要求更大的 OAuth scope，也無法繞過 server-wide write / merge / project allowlist policy。

## OAuth Security

- Production `PUBLIC_BASE_URL` 必須使用 HTTPS。
- MCP client -> MCP server 使用 PKCE S256。
- MCP server -> GitLab OAuth 同樣使用 PKCE S256。
- GitLab access / refresh token 使用 AES-256-GCM 加密後才持久化。
- MCP authorization code、access token、refresh token 在 store 中只保存 SHA-256 hash。
- Dynamic registration 的 confidential client secret 只保存 scrypt hash。
- OAuth state 與 authorization code 都是 single-use 且短效。
- MCP refresh token 每次使用都會 rotation。
- GitLab access token 到期前會自動 refresh。
- Docker Compose 會把 encrypted store 持久化在 `/data`；`OAUTH_ENCRYPTION_KEY` 必須和該 volume 分開保護。

目前 built-in OAuth store 是單 process / 單節點檔案型 store。不要把同一個 store file 直接掛給多個 MCP replicas；若要做 HA / horizontal scaling，後續應改成支援 locking/transaction 的共享儲存 backend。

## 支援的 MCP Tools

### Read

- 目前 authenticated GitLab user
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
- merge merge request（需額外 merge safety flag）

Server 不提供任意 GitLab API proxy，只允許已定義並驗證的 MCP tools。

## ChatGPT

若要讓不同 ChatGPT 使用者各自使用自己的 GitLab 權限，建議以 `MCP_AUTH_MODE=oauth` 部署到 HTTPS endpoint，然後建立指向 `/mcp` 的 Custom MCP App。使用者應透過 OAuth 登入 GitLab，而不是把 PAT 提供給 ChatGPT 或其他 MCP client。

OpenAI 的 plan/workspace availability 可能獨立於本 repo 改變。完整說明請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

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

接著把 `.agents/plugins/marketplace.json` 裡的 `gitlab` entry 加到個人 marketplace 設定並重啟 Codex。

## Repo 結構

```text
.agents/plugins/marketplace.json
plugins/gitlab/                 # ChatGPT/Codex plugin assets 與 skills
packages/mcp-server/            # self-hosted GitLab MCP server
  src/auth-context.ts
  src/oauth-crypto.ts
  src/oauth-store.ts
  src/oauth-gateway.ts
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

CI 在 merge 前必須通過 repository validation、全部 MCP unit tests、TypeScript strict build 與 production Docker build。

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
