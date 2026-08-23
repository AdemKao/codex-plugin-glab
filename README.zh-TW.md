# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。同一個 repo 同時包含：

1. `GitLab Self-Hosted` workflow plugin；
2. 可部署在 HTTPS 後方、支援 per-user OAuth 的 GitLab MCP Server。

> **狀態：** v0.5.9 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 建議的 ChatGPT 安裝：Registered MCP App

Portable marketplace package：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Public source plugin 刻意保持 **endpoint-neutral**：它包含可重用 skills 與 metadata，但不會放 active workspace-specific `.app.json`、不會內建 maintainer MCP hostname，也不會自動選 localhost。

ChatGPT plugin 建議流程：

1. 把 MCP Server 部署到 public HTTPS `/mcp` endpoint。
2. 開啟 ChatGPT Developer mode，將該 MCP endpoint 註冊成 App / connection。
3. 完成 OAuth，並確認 connection 能 expose 預期的 GitLab tools。
4. 複製平台產生的 technical ID；它會以 `plugin_asdk_app_` 開頭。
5. 產生 App-bound marketplace variant：

   ```bash
   python3 scripts/build_chatgpt_app.py \
     --app-id plugin_asdk_app_REPLACE_ME \
     --mcp-url https://gitlab-mcp.example.com/mcp
   ```

6. Import / 安裝 generated marketplace，並使用：

   ```text
   gitlab-self-hosted@ademkao-gitlab-chatgpt
   ```

Generated plugin 會包含 `.app.json`，manifest 會宣告：

```json
{
  "apps": "./.app.json"
}
```

Generated marketplace 使用 `authentication: ON_INSTALL`，讓 registered App connection 成為 plugin installation flow 的一部分。

完整流程請見 [ChatGPT / Codex App 整合](docs/chatgpt-app.zh-TW.md)。

### 為什麼 App ID 不 commit 到 public repo

Registered ChatGPT MCP App ID 是平台產生的 technical ID，通常屬於特定 user / workspace connection。Public Git repo 無法在 install-time 安全地猜出或動態繼承每位使用者自行建立的 App ID。

因此本 repo 明確分成兩層：

- **Portable source plugin**：公開 skills / metadata，不包含 workspace-specific App ID。
- **Generated App-bound plugin**：針對某個 registered `plugin_asdk_app_...` connection 產生 `.app.json` 與 `apps: "./.app.json"`。

這樣可以避免把 placeholder 當 active dependency 發布，也避免所有使用者被默默導向 maintainer-controlled MCP deployment。

## Direct remote MCP fallback

對直接支援 custom MCP server 的 Client，仍可自行設定 remote HTTPS endpoint，例如：

```text
https://gitlab-mcp.example.com/mcp
```

這條路保留給 development、troubleshooting 與 MCP client 測試。中性 reference 位於：

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

不要把 organization-specific MCP endpoint、App ID、GitLab token 或 OAuth secret commit 到 portable public plugin。

## localhost 只保留作開發 fallback

如果你正在同一台 Codex 主機上開發 bundled MCP Server，請明確產生 local variant：

```bash
python3 scripts/build_local_variant.py
```

這個 development marketplace 才會綁定：

```text
http://127.0.0.1:3333/mcp
```

Repo root marketplace 不會自動選 localhost。

## 部署 bundled MCP Server

只要目標 GitLab instance 提供所需 REST API，bundled server 可支援 GitLab.com、GitLab Self-Managed 與 GitLab Dedicated。

Per-user OAuth 建議部署在 HTTPS 後方，並在 GitLab 建 OAuth Application；callback 使用你自己的 hostname：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

範例環境設定：

```bash
MCP_AUTH_MODE=oauth
MCP_HOST=0.0.0.0
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"

GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

單一 replica：

```bash
OAUTH_STORE_DRIVER=file
OAUTH_STORE_PATH=/data/oauth-store.json
```

Production multi-replica：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

PostgreSQL backend 會讓 OAuth state、authorization code consume 與 MCP refresh-token rotation 在多台 replica 間保持 atomic。

## OAuth discovery

OAuth mode 提供：

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
/oauth/gitlab/callback
/mcp
```

未登入呼叫 `/mcp` 會回 `401` 與 OAuth Protected Resource Metadata，讓相容 Client 自動發現 authorization flow。Server 同時支援 CIMD 與 DCR compatibility。

驗證 remote deployment：

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

## 安全預設

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
GITLAB_ALLOWED_PROJECTS=
```

一般 write 需要 `GITLAB_WRITE_ENABLED=true`；MR merge 另外需要 `GITLAB_MERGE_ENABLED=true`。OAuth mode 的 write 還需要 session 具有 `gitlab:write` scope。Deployment flag、allowlist、OAuth scope 與 GitLab permission 都會獨立檢查。

Server 不提供任意 GitLab API proxy。

## 支援的 MCP Tools

Read workflow 包含 authenticated user、groups、projects、branches、commits、repository tree/files、issues、merge requests/diffs、pipelines、jobs 與 traces。

Write workflow 包含 issue/MR create/update/comment、branch creation、repository-file commit、approval、MR discussion、pipeline actions，以及在獨立 merge safety flag 開啟後的 MR merge。

## Repo 結構

```text
.agents/plugins/marketplace.json
plugins/gitlab-self-hosted/
  .codex-plugin/plugin.json
  workspace-binding/.mcp.remote.json.example   # 中性 remote reference
  workspace-binding/.mcp.local.json.example    # localhost 開發 fallback
  workspace-binding/.app.json.example          # App-binding template input
  skills/
packages/mcp-server/
  src/
  tests/
scripts/
  build_chatgpt_app.py         # 建議的 registered ChatGPT App wrapper
  build_chatgpt_variant.py     # 底層 existing-App binding helper
  build_personal_variant.py    # explicit direct remote artifact helper
  build_local_variant.py       # localhost 開發 marketplace
  chatgpt_mcp_doctor.py
  validate_plugin.py
  validate_oauth.py
  validate_chatgpt_binding.py
  validate_public_config.py
```

## Development / validation

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
python3 scripts/validate_public_config.py

cd packages/mcp-server
npm install
npm run check
```

CI 也會 smoke-test registered-App packaging helper 並 build production Docker image。`validate_public_config.py` 會阻止 public package 不小心 commit 真實 maintainer / organization 的 MCP `/mcp` endpoint。

## 文件

- [ChatGPT / Codex App 整合](docs/chatgpt-app.zh-TW.md)
- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest、MCP package version 與 runtime-reported version 必須一致。CI 會在 merge 前驗證 release metadata。若 [CHANGELOG.md](CHANGELOG.md) 有對應版本段落，release workflow 會使用它；否則會 fallback 到 GitHub-generated notes。

## License

MIT，請見 [LICENSE](LICENSE)。
