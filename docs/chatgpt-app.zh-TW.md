# ChatGPT / Codex Remote MCP 整合

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## 目標

使用同一個公開 plugin repo，但不暴露 maintainer-specific MCP deployment，也不要求使用者在自己電腦執行 MCP Server。

預設 package：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

它刻意保持 endpoint-neutral。真實 remote MCP URL 屬於使用者或 workspace 的設定，而不是 public Git repo。

## 正常 remote 路徑

對支援直接新增 custom remote MCP server 的 Client：

```text
安裝 repository marketplace root
        |
        v
GitLab Self-Hosted skills
        +
使用者 / workspace MCP setting
  https://gitlab-mcp.example.com/mcp
        |
        v
MCP OAuth discovery
        |
        v
GitLab OAuth
        |
        v
GitLab REST API v4
```

設定步驟：

1. 安裝本 repo 的 marketplace root。
2. 在 Client 的 MCP / App 設定中加入使用者或 workspace 自己的 public remote HTTPS `/mcp` endpoint。
3. 完成 OAuth。
4. Client 若提供 refresh/scan tools，重新掃描工具。
5. 先驗證 harmless read，再開 write。

這條 direct-MCP 路徑不需要 local MCP process、不需要 generated remote marketplace，也不需要第二個 repo。

## 為什麼 endpoint 不直接寫進 plugin

Agent Plugin 的 HTTP MCP 設定要求 literal absolute URL。目前格式不會把 HTTP `url` 欄位中的任意 `${ENV_VAR}` 當成 install-time endpoint substitution。

因此只能二選一：

- commit 一份 active `.mcp.json`，它就必須指向某一個 concrete URL；或
- public package 保持 endpoint-neutral，讓每個使用者 / workspace 自己設定 URL。

本專案選第二種。這可以避免公開 operator 的私人 infrastructure，也避免其他使用者被偷偷送到 maintainer-controlled server。

中性 reference：

```text
plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example
```

它刻意使用：

```text
https://gitlab-mcp.example.com/mcp
```

不要把 committed example 改成真實 organization endpoint。

## ChatGPT App binding 的重要差異

ChatGPT plugin 可以包含 skills，也可以依賴 apps；但 plugin package 與已 connect/authenticate 的 MCP App 是兩個不同物件。

如果 ChatGPT surface 會直接把使用者設定的 MCP App tools 提供給 conversation，endpoint-neutral workflow 可以直接使用該 connection，不需要再產生另一個 repo variant。

如果 ChatGPT surface 要求 plugin 本身必須宣告 app dependency，靜態 public plugin 無法動態知道任意 user-created connection 的 technical ID。要讓這種 dependency 可攜，平台層通常需要：

- 跨 workspace 都有效的 canonical shared app / connector ID；或
- 由 managed workspace 支援、可建立 workspace-specific app 的 managed App Template。

本 repo 目前沒有 canonical OpenAI-managed GitLab Self-Hosted app ID，也沒有 OpenAI-managed App Template，因此不會假裝 placeholder connection ID 或 `${GITLAB_MCP_URL}` 能替所有 workspace 做 one-click binding。

Legacy `build_chatgpt_variant.py` 仍保留給已經有 connection technical ID，而且明確需要 plugin-bound artifact 的環境。它是 compatibility tooling，不是正常 remote setup。

## 部署 bundled OAuth MCP Server

在目標 GitLab instance 建 OAuth Application。Callback 使用你自己的 public hostname，例如：

```text
https://gitlab-mcp.example.com/oauth/gitlab/callback
```

環境設定範例：

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
OAUTH_DATABASE_URL=postgresql://user:password@db:5432/codex_glab
```

## 驗證 remote endpoint

```bash
python3 scripts/chatgpt_mcp_doctor.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Doctor 會驗證 public HTTPS URL、拒絕 non-public DNS target、檢查 Protected Resource Metadata / Authorization Server Metadata，並確認未登入 `/mcp` 會回相容 Client 需要的 OAuth challenge。

OAuth callback 成功只代表該 MCP connection 已完成 authentication；它本身不代表所有 plugin surface 都已經對同一個 connection 建立 explicit app dependency。

## OAuth discovery sequence

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

Server 支援 CIMD 與 DCR-compatible registration flow。Downstream MCP OAuth 與 upstream GitLab OAuth 都使用 PKCE S256。

## Local development fallback

localhost 只保留作 explicit development option：

```bash
python3 scripts/build_local_variant.py
```

Generated development artifact 才會綁：

```text
http://127.0.0.1:3333/mcp
```

Repository root marketplace 不會自動選 localhost。

## Legacy compatibility helpers

為避免破壞既有 deployment，以下 scripts 仍保留：

```text
scripts/build_personal_variant.py
scripts/build_chatgpt_variant.py
```

正常 direct remote MCP path 不再需要它們。不要只為了保存 generated output 再建立第二個 public repo。

## Troubleshooting

Plugin 看得到但 GitLab tools 不見時，依序檢查：

1. 確認安裝的是 `gitlab-self-hosted@ademkao-codex-plugins`。
2. 確認 user/workspace remote MCP connection 指向預期的 HTTPS `/mcp` endpoint。
3. 確認 OAuth 是對同一個 connection 完成，而且該 connection 本身真的 exposes GitLab tools。
4. 如果 ChatGPT surface 要 explicit plugin app dependency，確認 workspace 有 portable app/template binding，或使用 existing-connection compatibility helper。
5. 不要用「把私人 MCP hostname commit 到 public plugin」的方式修 app binding。

## Public configuration guard

CI 會執行：

```bash
python3 scripts/validate_public_config.py
```

Validator 會確保 root plugin endpoint-neutral、localhost fallback 維持隔離，並拒絕 public setup files 出現真實、非 example 的 `/mcp` endpoint。
