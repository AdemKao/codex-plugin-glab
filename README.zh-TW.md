# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。Repo 有兩個核心：

1. GitLab Plugin：workflow skills、安全 routing 與 local `git` / `glab` fallback；
2. Self-hosted GitLab MCP Server：直接透過 GitLab REST API 操作 GitLab。

> **狀態：** v0.5.1 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 為什麼要 self-host

GitLab native MCP 的可用性與 group / instance prerequisite 不一定適合每個 GitLab.com 或 Self-Managed 環境，因此本專案直接提供自己的 MCP Server；GitLab native MCP 是 optional，而不是必要依賴。

Bundled server 可連 GitLab.com、GitLab Self-Managed 與 GitLab Dedicated；實際能力取決於目標 GitLab 是否提供相關 REST API。

## 架構

```text
ChatGPT / Codex / MCP client
            |
            | MCP over HTTP + OAuth 或 shared bearer
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

Codex Plugin 在需要 local working tree、commit 或 push 時，仍可使用 `git` / `glab`。

## Authentication 模式

### Shared-token

整個 MCP deployment 共用一個 GitLab identity：

```bash
MCP_AUTH_MODE=shared-token
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=your-token
MCP_AUTH_TOKEN=a-long-random-secret
```

適合單一使用者、CI/service integration，或刻意共享 service identity 的 trusted workspace。

### Per-user OAuth

每個 ChatGPT / Codex / MCP user 都授權自己的 GitLab identity。先在 GitLab 建 OAuth Application，callback：

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

單一 MCP replica 可繼續使用 encrypted file store：

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Production horizontal scaling 建議使用 PostgreSQL：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

PostgreSQL backend 會讓 OAuth state、authorization code 的 consume，以及 MCP refresh-token rotation 在多台 replica 間保持 atomic。

## MCP OAuth Client Registration

v0.5+ 同時支援：

- **CIMD (Client ID Metadata Documents)**：新版 MCP client 建議路徑。
- **DCR (Dynamic Client Registration)**：保留作為相容 fallback。

CIMD 以 HTTPS metadata URL 當 `client_id`。Server 會驗證 exact client ID、redirect URI、grant/response type，並預設阻擋 private / loopback / link-local metadata target，降低 SSRF 風險。

## Docker 快速開始

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# 編輯 .env
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

若要使用 bundled PostgreSQL profile：

```bash
# .env: MCP_AUTH_MODE=oauth, OAUTH_STORE_DRIVER=postgres
# 設定 POSTGRES_PASSWORD，OAUTH_DATABASE_URL host 使用 `postgres`
docker compose --profile postgres up -d --build
```

Local MCP endpoint 是 `http://127.0.0.1:3333/mcp`。ChatGPT / remote MCP deployment 請透過 HTTPS 暴露。

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

未登入呼叫 `/mcp` 會回 `401`，`WWW-Authenticate` 會指向 Protected Resource Metadata。

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

## ChatGPT remote binding

Portable plugin 的 local Codex MCP 設定會刻意保留：

```text
http://127.0.0.1:3333/mcp
```

ChatGPT 無法把這個 loopback endpoint 當 remote workspace App 使用。ChatGPT 必須先把 bundled MCP Server 部署成公開 HTTPS，例如：

```text
https://gitlab-mcp.example.com/mcp
```

先檢查 live OAuth deployment：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會確認：

- remote URL 使用 HTTPS，而且 DNS 只解析到 public address；
- Protected Resource Metadata 可取得；
- Authorization Server Metadata 可取得且 issuer 一致；
- 未登入 `/mcp` 回 OAuth `401` challenge，並包含 `resource_metadata`。

接著在目前支援 Custom MCP App 的 ChatGPT workspace / surface 中，**明確建立或連接**指向同一個 HTTPS `/mcp` 的 Custom MCP App，完成平台要求的 user/admin consent 與 GitLab OAuth。

本 repo **不宣稱安裝 plugin 後就能靜默自動建立 arbitrary ChatGPT Custom MCP App**。這個 App creation/authorization boundary 仍屬於 ChatGPT 平台的明確使用者/管理員操作。

取得 workspace App / connector ID 後，再建立綁定 variant：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_WORKSPACE_APP_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

預設會產生 ignored `dist/gitlab-chatgpt/`：

- `.app.json`：workspace App binding；
- patched `plugin.json`：加入 `apps: "./.app.json"`；
- `.chatgpt-setup.json`：記錄預期 remote MCP URL 與 explicit App-creation boundary。

Source plugin、source `.app.json.example`、localhost `.mcp.json` 都不會被修改。Builder 會拒絕 HTTP、localhost、loopback、link-local/private literal IP、URL 內嵌 credential、query/fragment，以及不是 `/mcp` 的 endpoint。

OpenAI plan、workspace role 與 surface availability 可能獨立於本 repo 改變。請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)，部署時也要確認平台最新要求。

## Codex Plugin

Portable plugin 位於 `plugins/gitlab/`，預設 `.mcp.json` 指向 `http://127.0.0.1:3333/mcp`。

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

接著把 `.agents/plugins/marketplace.json` 裡的 `gitlab` entry 加到個人 marketplace 設定並重啟 Codex。

## Repo 結構

```text
plugins/gitlab/
packages/mcp-server/
  src/oauth-gateway.ts                 # MCP OAuth、CIMD/DCR、GitLab OAuth
  src/oauth-store.ts                   # encrypted file backend + store contract
  src/postgres-oauth-store.ts          # multi-replica PostgreSQL backend
  src/register-tools.ts                # core GitLab tools
  src/register-v05-tools.ts            # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
scripts/build_chatgpt_variant.py       # workspace App binding generator
scripts/chatgpt_binding.py             # remote URL validation
scripts/chatgpt_mcp_doctor.py          # live OAuth/MCP deployment doctor
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

CI 會實際 build fake ChatGPT remote variant、驗證 unsafe remote URL rejection，另外啟動 PostgreSQL 17 執行 multi-replica OAuth integration test，再做 TypeScript strict build 與 production Docker build。

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT App setup](docs/chatgpt-app.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest 與 MCP package version 必須一致，CI 會在 merge 前驗證。User-visible 變更記錄在 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT，請看 [LICENSE](LICENSE)。
