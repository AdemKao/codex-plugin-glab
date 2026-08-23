# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。Repo 有兩個核心：

1. GitLab Self-Hosted Plugin：workflow skills、安全 routing 與 local `git` / `glab` fallback；
2. Self-hosted GitLab MCP Server：直接透過 GitLab REST API 操作 GitLab。

> **狀態：** v0.5.4 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## Package identity

從 v0.5.4 開始，本 repo 的 plugin internal identifier 改為 `gitlab-self-hosted`，不再使用 generic `gitlab`。Generic `gitlab` 可能在平台解析時命中 OpenAI curated GitLab plugin，因此第三方 package 現在讓 marketplace entry、folder 與 `plugin.json.name` 都固定使用獨立 ID。

Portable/local reference：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Generated ChatGPT App-bound reference：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

v0.5.4 之後，舊的 `gitlab@ademkao-codex-plugins` 不再代表本 repo 的正確安裝 reference。

## 為什麼要 self-host

GitLab native MCP 的可用性與 group / instance prerequisite 不一定適合每個 GitLab.com 或 Self-Managed 環境，因此本專案直接提供自己的 MCP Server；GitLab native MCP 是 optional，而不是必要依賴。

Bundled server 可連 GitLab.com、GitLab Self-Managed 與 GitLab Dedicated；實際能力取決於目標 GitLab 是否提供相關 REST API。

## 架構

```text
ChatGPT / Codex / MCP client
            |
            | MCP over Streamable HTTP
            | OAuth 或 shared bearer
            v
+---------------------------------------+
| codex-plugin-glab MCP server          |
| - MCP tools + schemas                 |
| - OAuth / auth boundary               |
| - CIMD + DCR client registration      |
| - read/write/merge policy             |
| - project allowlist                   |
+-------------------+-------------------+
                    |
                    | per-user OAuth token
                    | 或 shared service token
                    v
             GitLab REST API v4

OAuth persistence：
  單節點      -> encrypted file store
  多 replicas -> PostgreSQL store
```

Codex Plugin 在需要 local working tree、commit 或 push 時，仍使用 local `git` / `glab`。

## Authentication 模式

### Shared-token

整個 MCP deployment 共用一個 GitLab identity：

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

適合 trusted single-user、CI/service integration，或刻意共享 service identity 的環境。

### Per-user OAuth

每個 ChatGPT / Codex / MCP user 授權自己的 GitLab identity。先在 GitLab 建 OAuth Application，callback：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

設定：

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

單一 MCP replica 可使用 encrypted file store：

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Production horizontal scaling 建議 PostgreSQL：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

PostgreSQL backend 會讓 OAuth state、authorization code consume 與 MCP refresh-token rotation 在多台 replica 間保持 atomic。

## MCP OAuth Client Registration

v0.5+ 同時支援：

- **CIMD (Client ID Metadata Documents)**：新版 MCP client 建議路徑；
- **DCR (Dynamic Client Registration)**：保留作為 compatibility fallback。

CIMD 以 HTTPS metadata URL 當 `client_id`。Server 會驗證 exact client ID、redirect URI、grant/response type，並預設阻擋 private / loopback / link-local metadata target。

## Docker 快速開始

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# 編輯 .env
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

Bundled PostgreSQL profile：

```bash
# .env: MCP_AUTH_MODE=oauth, OAUTH_STORE_DRIVER=postgres
# 設定 POSTGRES_PASSWORD，OAUTH_DATABASE_URL host 使用 `postgres`
docker compose --profile postgres up -d --build
```

Local endpoint 是 `http://127.0.0.1:3333/mcp`。Remote client 應使用可連線的 HTTPS endpoint，例如 `https://gitlab-mcp.example.com/mcp`。

## Personal / Codex 的主要 remote MCP 安裝路徑

對 personal Codex host 而言，self-hosted OAuth 的主要路徑是**直接新增部署好的 MCP Server**。這條路徑不需要 `.app.json`、`build_chatgpt_variant.py`，也不需要 managed workspace App Template。

1. 以 `MCP_AUTH_MODE=oauth` 部署 bundled server，並透過 HTTPS 暴露。
2. 先驗證：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

3. 在 ChatGPT desktop / Codex 的 MCP 設定中選 **Add server**。
4. 選 **Streamable HTTP**，填入 remote endpoint：

```text
https://gitlab-mcp.example.com/mcp
```

5. 依 client 提示儲存 / restart，看到 OAuth 時選 **Authenticate**。
6. 讓 client 依 server 的 OAuth discovery metadata 完成 discovery，接著完成 GitLab authorization，最後先跑 harmless read 驗證。

OAuth mode 下，未登入呼叫 `/mcp` 會回 `401`，`WWW-Authenticate` 會指向 Protected Resource Metadata；server 再提供 Authorization Server Metadata 與 CIMD/DCR 相容能力。

## localhost `.mcp.json` fallback

Portable source plugin 刻意保留：

```text
plugins/gitlab-self-hosted/.mcp.json -> http://127.0.0.1:3333/mcp
```

這是 bundled server 跑在同一台 Codex host 時使用的 **local fallback**。不要為了 remote OAuth 而把 source `.mcp.json` 改成 maintainer 私有或固定公開 URL。

Repo root marketplace（`ademkao-codex-plugins`）指向這份 portable source plugin。因此安裝 root marketplace **不會**把另外新增並完成 OAuth 的 remote MCP connection 自動變成 plugin tool binding。

Local working-tree state、commit、push 仍由 local `git` / `glab` 負責。

## ChatGPT App-bound marketplace helper

`plugins/gitlab-self-hosted/workspace-binding/.app.json.example` 與 `scripts/build_chatgpt_variant.py` 只處理一個特定情境：你**已經有**指向 remote MCP server 的 ChatGPT workspace App / connector ID，現在要產生一個真正可安裝、且明確綁定該 App 的 plugin marketplace。

它們**不是 OpenAI 原生 App Template**，也不是 personal/Codex direct MCP 安裝所需步驟，更不會建立或 publish ChatGPT App。

已有 App / connector 後才使用：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

預設輸出：

```text
dist/gitlab-chatgpt-marketplace/
  .agents/plugins/marketplace.json
  plugins/gitlab-self-hosted/
    .app.json
    .chatgpt-setup.json
    .codex-plugin/plugin.json
    skills/...
```

Generated marketplace 名稱是 `ademkao-gitlab-chatgpt`，所以 plugin reference 是：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Generated ChatGPT plugin 會保留 `apps: "./.app.json"`，但**不包含** `mcpServers`，也**不包含** `.mcp.json`，避免 portable localhost fallback 和 connected App binding 競爭。

當你要讓 self-hosted plugin 使用 remote App 時，應 import/install **generated marketplace root**，而不是 repo root 的 portable marketplace。Source plugin 與 source localhost `.mcp.json` 都不會被修改。

Generated output 是 workspace-specific，而且預設在 gitignored `dist/`。除非你清楚知道 workspace binding 的影響，否則不要把它 commit 到 public source repo。

## Managed workspace App Template 是另一個平台功能

OpenAI managed workspace **App Template** 是提供 workspace admin / owner 使用的獨立平台流程。Managed template 可以用 guided setup 收集組織專屬設定、建立 workspace draft app，再由管理員 review / publish / 設定存取與 action 控制。

本 repo **目前沒有提供，也不宣稱自己是 OpenAI managed App Template**。未來如果 OpenAI 平台 / plugin directory 提供 GitLab 對應 template，應依 managed workspace 流程設定，和本 repo 的 optional binding helper 分開看待。

完整差異請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

## OAuth endpoints

OAuth mode 提供：

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register          # DCR compatibility
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

## 安全預設

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
GITLAB_ALLOWED_PROJECTS=
```

一般 write 需要 `GITLAB_WRITE_ENABLED=true`；MR merge 還需要 `GITLAB_MERGE_ENABLED=true`。OAuth mode 下，真正送出非 GET GitLab API 前，session 還必須有 `gitlab:write` scope。

Server **不提供任意 GitLab API proxy**。

## 支援的 MCP Tools

### Read

- authenticated GitLab user
- groups / projects / project metadata
- branches / commits
- repository tree / files
- issues
- merge requests / diffs
- pipelines / jobs / traces

### Write

- 建立、更新、留言 issue
- 建立、更新、留言 merge request
- 建立 branch
- repository file create/update/delete，並建立 commit
- approve / unapprove merge request
- 建立 MR discussion
- create / retry / cancel pipeline
- merge merge request（需額外 merge safety flag）

Repository file delete 與 pipeline cancel 會標示為 destructive MCP tool。

## OAuth Security

- Production `PUBLIC_BASE_URL` 必須 HTTPS。
- MCP OAuth 與 GitLab OAuth 都使用 PKCE S256。
- GitLab access / refresh token 使用 AES-256-GCM 加密持久化。
- MCP authorization code、access token、refresh token 只保存 hash。
- OAuth state / authorization code 都是 single-use 且有 TTL。
- MCP refresh token 使用後會 rotation。
- PostgreSQL atomic operation 可避免同一 state/code/refresh token 在兩台 replica 同時成功。
- CIMD fetch 預設拒絕 redirect 與 private-network target，並有 size/time limit。
- `OAUTH_ENCRYPTION_KEY` 必須和 OAuth database / volume 分開保管。

## Repo 結構

```text
plugins/gitlab-self-hosted/
  .mcp.json                              # localhost fallback
  workspace-binding/.app.json.example   # optional existing-app binding helper input
packages/mcp-server/
  src/oauth-gateway.ts                  # MCP OAuth、CIMD/DCR、GitLab OAuth
  src/oauth-store.ts                    # encrypted file backend + store contract
  src/postgres-oauth-store.ts           # multi-replica PostgreSQL backend
  src/register-tools.ts                 # core GitLab tools
  src/register-v05-tools.ts             # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
scripts/build_chatgpt_variant.py        # 產生 App-bound ChatGPT marketplace artifact
scripts/chatgpt_binding.py              # remote URL validation helpers
scripts/chatgpt_mcp_doctor.py           # live OAuth/MCP deployment doctor
Dockerfile
docker-compose.yml
.env.example
docs/
VERSION
```

## Development

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
cd packages/mcp-server
npm install
npm run check
```

CI 會驗證 repo structure 與 package identity、generated ChatGPT marketplace artifact、generic `gitlab` package 不會重新出現、App binding invariant、unsafe remote URL、PostgreSQL multi-replica OAuth integration test、TypeScript test/build 與 production Docker build。

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT / Codex remote MCP setup](docs/chatgpt-app.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest、MCP package version 與 runtime 回報版本必須一致；CI 會在 merge 前驗證。User-visible 變更記錄在 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT，請看 [LICENSE](LICENSE)。
