# codex-plugin-glab

[![Validate](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml/badge.svg)](https://github.com/AdemKao/codex-plugin-glab/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | [繁體中文](README.zh-TW.md)

這是一個提供給 **ChatGPT、Codex 與 MCP Client** 使用的開源 GitLab 整合。Repo 包含兩個核心：

1. **GitLab Self-Hosted** plugin 與 workflow skills；
2. hosted 或自行部署時使用的 GitLab MCP Server 實作。

> **狀態：** v0.5.7 / early preview。
>
> **第三方專案：** 本 repo 並非 GitLab 或 OpenAI 官方專案，也不代表獲得兩者背書。

## 預設安裝：直接安裝 GitHub marketplace root

正常使用的 package reference 是：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

從 v0.5.7 開始，從 repository marketplace root 安裝後，plugin **已經直接綁定 hosted remote MCP endpoint**：

```text
https://gitlab-mcp.blacmarcs.com/mcp
```

Committed plugin manifest 會載入：

```text
mcpServers: "./.mcp.json"
```

而 committed `.mcp.json` 會直接指向上面的 remote HTTPS endpoint。

因此一般 ChatGPT / Codex 使用者**不需要**：

- 在自己的電腦啟動 MCP Server；
- 執行 personal / ChatGPT marketplace build variant；
- 維護第二個 repo；
- 複製 ChatGPT App / connection technical ID；
- 或把 root package 換成 localhost package。

安裝 marketplace root、選擇 **GitLab Self-Hosted**，client 要求登入時完成 OAuth 即可。Client 會依照 remote MCP Server 的 OAuth discovery metadata 完成 MCP authentication 與 GitLab authorization。

第一個 smoke test 建議使用 harmless read：

```text
列出我可以存取的 GitLab groups 和 projects。
```

## Package identity

本第三方 plugin 固定使用：

```text
gitlab-self-hosted
```

Generic `gitlab` identifier 可能和 OpenAI curated GitLab integration 衝突，因此不要再使用舊的 `gitlab@ademkao-codex-plugins` 代表本 repo。

## 預設架構

```text
ChatGPT / Codex
      |
      | 從 marketplace root 安裝 GitLab Self-Hosted
      v
plugins/gitlab-self-hosted/.mcp.json
      |
      | Streamable HTTP + OAuth
      v
https://gitlab-mcp.blacmarcs.com/mcp
      |
      | 每位使用者自己的 GitLab OAuth identity
      v
GitLab REST API v4
```

OAuth credential 與 GitLab token 都留在 MCP/OAuth boundary；不要要求使用者把 GitLab PAT 貼到聊天裡。

## localhost 開發 fallback

Bundled MCP Server 仍然可以在本機執行，但這是**開發 fallback**，不是一般安裝流程。

需要本機測試時，先啟動 MCP Server，再產生 local marketplace：

```bash
python3 scripts/build_local_variant.py
```

Generated package：

```text
gitlab-self-hosted@ademkao-gitlab-local
```

它會把 source 的 hosted binding 覆寫成：

```text
http://127.0.0.1:3333/mcp
```

只有在你明確希望 MCP Server 與 client 跑在同一台開發機器時才使用這條路徑。

## Optional custom remote override

Root marketplace 已經預設使用 `https://gitlab-mcp.blacmarcs.com/mcp`。如果 operator 想改成自己的 public HTTPS deployment，仍保留 backwards-compatible helper：

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

這是 advanced override，不是一般使用者的必要步驟。

## Optional ChatGPT App / connection-bound helper

`scripts/build_chatgpt_variant.py` 仍保留給明確需要綁定既有 ChatGPT MCP App / connection technical ID 的 workspace。它**不是預設安裝所需步驟**，也不是 OpenAI managed App Template。

Generated App-bound artifact 會刻意移除 source direct MCP binding，改用 `apps: "./.app.json"`。

完整說明請看 [docs/chatgpt-app.zh-TW.md](docs/chatgpt-app.zh-TW.md)。

## 自行部署 MCP Server

想使用自己 endpoint 的 operator 可以直接部署 repo 內的 MCP Server。本機開發啟動方式：

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
cp .env.example .env
# 編輯 .env
docker compose up -d --build
curl http://127.0.0.1:3333/healthz
```

Per-user OAuth deployment 需要在 GitLab 建 OAuth Application，並部署在 public HTTPS 後方，例如：

```bash
MCP_AUTH_MODE=oauth
PUBLIC_BASE_URL=https://gitlab-mcp.example.com
GITLAB_HOST=https://gitlab.com
GITLAB_OAUTH_CLIENT_ID=...
GITLAB_OAUTH_CLIENT_SECRET=...
OAUTH_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

Production 多 replica 建議使用 PostgreSQL 保存 OAuth state/session：

```bash
OAUTH_STORE_DRIVER=postgres
OAUTH_DATABASE_URL=postgresql://user:password@postgres:5432/codex_glab
```

Server 支援 MCP OAuth discovery、PKCE S256、CIMD 與 DCR compatibility。

## OAuth endpoints

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

## 安全預設

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
GITLAB_ALLOWED_PROJECTS=
```

一般 write 需要 `GITLAB_WRITE_ENABLED=true`；MR merge 還需要 `GITLAB_MERGE_ENABLED=true`。OAuth write operation 另外需要 `gitlab:write`，而且 GitLab 原本的 permission 仍然是最後權限邊界。

Server 不提供任意 GitLab API proxy。

## 支援的 MCP tools

Read 包含 authenticated user、groups/projects、branches/commits、repository tree/files、issues、merge requests/diffs、pipelines/jobs/traces。

Write 包含 issue/MR create-update-comment、branch、repository-file commit、MR approve/discussion、pipeline create/retry/cancel，以及有額外安全開關的 merge。Destructive tool 會明確標示。

## Repo 結構

```text
.agents/plugins/marketplace.json
plugins/gitlab-self-hosted/
  .codex-plugin/plugin.json        # 載入 ./.mcp.json
  .mcp.json                        # hosted default: https://gitlab-mcp.blacmarcs.com/mcp
  workspace-binding/
    .mcp.local.json.example        # localhost 開發 fallback
    .app.json.example              # optional existing-App binding helper
  skills/
packages/mcp-server/
scripts/build_local_variant.py
scripts/build_personal_variant.py
scripts/build_chatgpt_variant.py
scripts/validate_plugin.py
docs/
VERSION
```

## Development 與 CI

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
cd packages/mcp-server
npm install
npm run check
```

GitHub Actions 還會 build production Docker image。Validation 會鎖定 root package 必須使用 hosted HTTPS endpoint、確認 local fallback 只會明確覆寫成 localhost、確認 optional custom-remote / App-bound variants、拒絕不安全的 remote URL，並驗證 `VERSION`、plugin metadata、package metadata 與 runtime version 一致。

## 文件

- [Architecture](docs/architecture.zh-TW.md)
- [Authentication](docs/authentication.zh-TW.md)
- [ChatGPT / Codex 整合](docs/chatgpt-app.zh-TW.md)
- [Self-Managed GitLab](docs/self-managed.zh-TW.md)
- [Capability matrix](docs/capability-matrix.zh-TW.md)
- [Roadmap](docs/roadmap.zh-TW.md)
- [Security](SECURITY.md)

## License

MIT，詳見 [LICENSE](LICENSE)。
