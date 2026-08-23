# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。Repo 有兩個核心：

1. GitLab Plugin：workflow skills、安全 routing 與 local `git` / `glab` fallback；
2. Self-hosted GitLab MCP Server：直接透過 GitLab REST API 操作 GitLab。

> **狀態：** v0.5.2 / early preview。
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

Codex Plugin 在需要 local working tree、commit 或 push 時，仍使用 local `git` / `glab`。

## 安裝路徑

### Personal / Codex remote MCP — 建議的 remote 路徑

Bundled MCP Server 部署成公開 HTTPS 後，直接在 Codex 加入 remote server：

1. 選 **Add server**；
2. 選 remote HTTP/HTTPS MCP；
3. 填入完整 endpoint，例如 `https://gitlab-mcp.example.com/mcp`；
4. 讓 Codex 從未登入 MCP `401` challenge 與 Protected Resource Metadata 進行 OAuth discovery；
5. 在 browser 完成 GitLab OAuth；
6. 開啟 write 前先做 harmless read 驗證。

OAuth mode 下不需要把 GitLab PAT 貼進 Codex。MCP Server 負責 GitLab OAuth boundary，GitLab credential 保存在 server side。

### Local Codex fallback

Portable plugin 刻意保留：

```text
plugins/gitlab/.mcp.json
  -> http://127.0.0.1:3333/mcp
```

當 Codex 與 MCP Server 跑在同一台機器時使用。不要為了 remote client，把 source `.mcp.json` 改成 maintainer/private remote URL。

### Managed ChatGPT workspace

如果 managed ChatGPT workspace 提供 admin-controlled App 或 App Template provisioning 功能，請使用該 **platform/admin** 流程，並讓它指向已驗證的 public HTTPS `/mcp` endpoint。

本 repo **不會 publish、generate 或 emulate OpenAI-native managed workspace App Template**。Template/provisioning format、lifecycle、plan availability、approval 與 consent 都由 OpenAI 平台控制。

若 workspace 已經有 App/connector 並提供 ID，本 repo 有 optional workspace binding helper；請看[既有 ChatGPT App/connector 的 workspace binding helper](#既有-chatgpt-appconnector-的-workspace-binding-helper)。

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

每個 remote MCP user 授權自己的 GitLab identity。先在 GitLab 建 OAuth Application，callback：

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

Production horizontal scaling 建議使用 PostgreSQL：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

PostgreSQL backend 會讓 OAuth state、authorization code consume，以及 MCP refresh-token rotation 在多台 replica 間保持 atomic。

## MCP OAuth Client Registration

v0.5+ 同時支援：

- **CIMD (Client ID Metadata Documents)**：新版 MCP client 建議路徑。
- **DCR (Dynamic Client Registration)**：保留作為相容 fallback。

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

使用 bundled PostgreSQL profile：

```bash
# .env: MCP_AUTH_MODE=oauth, OAUTH_STORE_DRIVER=postgres
# 設定 POSTGRES_PASSWORD，OAUTH_DATABASE_URL host 使用 `postgres`
docker compose --profile postgres up -d --build
```

Local MCP endpoint 是 `http://127.0.0.1:3333/mcp`。Remote client 必須使用 public HTTPS endpoint。

## 驗證 remote OAuth MCP deployment

把 remote server 加到 Codex / ChatGPT 或 managed workspace 前先執行：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會確認：

- URL 使用 HTTPS，而且 DNS 只解析到 public address；
- Protected Resource Metadata 可取得；
- Authorization Server Metadata 可取得且一致；
- 未登入 `/mcp` 回 OAuth `401` challenge 並包含 `resource_metadata`。

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

## 既有 ChatGPT App/connector 的 workspace binding helper

只有在 target workspace App/connector 已存在，而且你已取得其 ID 後才使用：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

預設產生 ignored `dist/gitlab-chatgpt/`：

- `.app.json`：綁定已存在的 workspace App/connector；
- patched `plugin.json`：加入 `apps: "./.app.json"`；
- `.chatgpt-setup.json`：記錄 remote MCP endpoint 與明確 provisioning boundary。

Source example 是 `plugins/gitlab/workspace-binding/.app.json.example`。它只是 **workspace binding helper input**，不是 OpenAI-native App Template。

Source plugin 與 localhost `.mcp.json` 都不會被修改。Builder 會拒絕 HTTP、localhost、loopback、link-local/private literal IP、URL 內嵌 credential、query/fragment，以及非 `/mcp` endpoint。

詳細區分 personal/Codex remote、local fallback、managed workspace provisioning 與既有 App binding helper，請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

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

## Codex Plugin

Portable plugin 位於 `plugins/gitlab/`。Checked-in `.mcp.json` 是 localhost fallback，不是 personal remote server 的設定來源。

Local plugin development：

```bash
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

接著把 `.agents/plugins/marketplace.json` 裡的 `gitlab` entry 加到個人 marketplace 設定並重啟 Codex。

Remote self-host deployment 請透過 Codex **Add server** 設定，不要 patch portable `.mcp.json`。

## Repo 結構

```text
plugins/gitlab/                         # ChatGPT/Codex plugin assets and skills
  .mcp.json                            # localhost Codex fallback
  workspace-binding/.app.json.example # existing-App workspace binding example
packages/mcp-server/
  src/oauth-gateway.ts                 # MCP OAuth、CIMD/DCR、GitLab OAuth
  src/oauth-store.ts                   # encrypted file backend + store contract
  src/postgres-oauth-store.ts          # multi-replica PostgreSQL backend
  src/register-tools.ts                # core GitLab tools
  src/register-v05-tools.ts            # repository/MR/pipeline tools
  migrations/001_oauth_postgres.sql
scripts/build_chatgpt_variant.py       # existing-App workspace binding helper
scripts/chatgpt_binding.py             # remote URL validation
scripts/chatgpt_mcp_doctor.py          # live remote OAuth/MCP deployment doctor
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

CI 會 build fake existing-App workspace binding variant、驗證 unsafe remote URL rejection，啟動 PostgreSQL 17 執行 multi-replica OAuth integration tests，再做 TypeScript strict build 與 production Docker build。

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [Remote MCP / ChatGPT setup](docs/chatgpt-app.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest、MCP package version 與 runtime version 必須一致；CI 會在 merge 前驗證 release sources。User-visible 變更記錄在 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT，請看 [LICENSE](LICENSE)。
