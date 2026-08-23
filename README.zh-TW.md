# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與其他 MCP Client** 使用的開源 GitLab 整合。同一個 repo 同時包含：

1. `GitLab Self-Hosted` workflow plugin；
2. 可部署在 HTTPS 後方、支援 per-user OAuth 的 GitLab MCP Server。

> **狀態：** v0.5.8 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 預設安裝：remote-first、由使用者設定

從本 repo 的 marketplace root 安裝：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

公開 source plugin 刻意保持 **endpoint-neutral**。它不會包含 maintainer 私有 MCP hostname、不會偷偷選 `localhost`，也不會把某一台私人部署的 URL 寫進公開 repo。

一般 remote 安裝流程：

1. 直接安裝本 repo 的 marketplace root。
2. 在 ChatGPT、Codex 或其他相容 MCP Client 中，設定屬於使用者或 workspace 自己的 remote HTTPS endpoint，例如：

   ```text
   https://gitlab-mcp.example.com/mcp
   ```

3. 讓 Client 依 MCP Server 的 OAuth discovery 完成 GitLab authorization。
4. 先用「列出可存取 groups / projects」這類 harmless read 驗證，再考慮開啟 write。

這條正常路徑**不需要**在使用者電腦執行 MCP Server、不需要 `build_personal_variant.py`、不需要 `build_chatgpt_variant.py`，也不需要第二個 repo。

### 為什麼不能直接寫 `${GITLAB_MCP_URL}`

目前 Agent Plugin 的 HTTP MCP 設定要求 `url` 是實際的 absolute HTTP/HTTPS URL；HTTP `url` 欄位不會任意展開 install-time environment variable。因此，commit 一份自動載入的 `.mcp.json` 無法同時做到「每位使用者可填自己的私人 hostname」又「安裝後立刻自動連線」。

所以本 repo 的做法是：公開 plugin 不綁 endpoint，真正的 remote URL 留在使用者 / workspace 自己的 MCP 或 App 設定中。中性的 remote reference 放在：

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

不要把組織專屬 MCP endpoint、GitLab token 或 OAuth secret commit 到公開 plugin。

## ChatGPT App binding 注意事項

Plugin package 與已完成 OAuth 的 MCP App / connection 是不同層。某些 ChatGPT surface 若要求 plugin-backed tools 必須有 explicit app dependency，靜態 public plugin 無法自動猜到每位使用者自行建立的 MCP connection technical ID。

當 Client 可以直接使用使用者已設定的 MCP tools 時，endpoint-neutral 的正常路徑仍是首選。Managed workspace 如果有平台提供的 App Template，也可以讓 admin 填 workspace-specific MCP URL；本 repo 不宣稱自己是 OpenAI-managed App Template。

`scripts/build_chatgpt_variant.py` 仍保留給必須把 plugin 明確綁到既有 ChatGPT MCP App / connection technical ID 的相容情境，但它不再是預設安裝流程。

## localhost 只保留作開發 fallback

如果你正在同一台 Codex 主機上開發 bundled MCP Server，仍可產生 local variant：

```bash
python3 scripts/build_local_variant.py
```

這個開發用 marketplace 才會明確綁定：

```text
http://127.0.0.1:3333/mcp
```

Repo root marketplace 永遠不會自動選 localhost。

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
  workspace-binding/.app.json.example          # legacy explicit app-binding helper
  skills/
packages/mcp-server/
  src/
  tests/
scripts/
  build_local_variant.py       # localhost 開發 marketplace
  build_personal_variant.py    # legacy explicit remote artifact helper
  build_chatgpt_variant.py     # legacy existing-App binding helper
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

CI 也會 build production Docker image。`validate_public_config.py` 會阻止 public package 不小心 commit 真實 maintainer / organization 的 MCP `/mcp` endpoint。

## 文件

- [ChatGPT / Codex remote MCP 設定](docs/chatgpt-app.zh-TW.md)
- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## Versioning

`VERSION`、plugin manifest、MCP package version 與 runtime-reported version 必須一致。CI 會在 merge 前驗證 release metadata；使用者可見變更記錄在 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT，請見 [LICENSE](LICENSE)。
