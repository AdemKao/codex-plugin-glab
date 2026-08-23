# GitLab Self-Hosted Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

這個 plugin 結合本 repo 自帶的 self-hosted GitLab MCP Server 與本機 `git` / `glab` workflow。

Project、issue、MR、branch、commit、repository file、pipeline 等結構化資料優先使用 MCP；working tree 修改、commit、push，或 GitLab instance 尚未提供對應 MCP tool 時，再使用本機工具 fallback。

主要 skills：

- `gitlab` — 一般 GitLab routing 與 triage。
- `gitlab-setup` — authentication、host 與 capability 設定。
- `glab-publish` — branch、stage、test、commit、push、建立 MR。
- `glab-address-comments` — 處理 MR review feedback 並 push 修正。
- `glab-fix-ci` — 分析 GitLab pipeline/job failure 並發布修正。

## Package identifier migration

從 v0.5.4 開始，這個第三方 package 改用獨立 internal identifier：

```text
gitlab-self-hosted
```

舊的 `gitlab` identifier 會在平台解析時和 OpenAI curated GitLab plugin 衝突。使用者看到的名稱仍然是 **GitLab Self-Hosted**，但 marketplace、folder 與 `plugin.json.name` 都固定為 `gitlab-self-hosted`。

Portable reference：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Portable package 現在刻意維持 **endpoint-unbound**：不包含 `mcpServers`、不自動載入 `.mcp.json`，也不包含 workspace-specific App binding。

明確產生的 connection variants：

```text
gitlab-self-hosted@ademkao-gitlab-local
gitlab-self-hosted@ademkao-gitlab-remote
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

升級到 v0.5.4 後，不要再用舊的 `gitlab@ademkao-codex-plugins` 代表本 repo 的 plugin。

## 明確選擇 MCP connection

### Local Codex

Bundled MCP server 與 Codex 跑在同一台機器時，產生 localhost-bound marketplace：

```bash
python3 scripts/build_local_variant.py
```

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-local
```

只有這個 generated local variant 會加入：

```text
.mcp.json -> http://127.0.0.1:3333/mcp
```

### Direct remote MCP

OCI 或其他 self-hosted deployment，直接提供要使用的 public HTTPS endpoint：

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-remote
```

Helper 會驗證 URL，並只把該 URL 寫進 generated artifact；committed portable plugin 仍維持 endpoint-unbound。

### ChatGPT custom MCP App

ChatGPT 的 MCP endpoint 應設定在 custom MCP App / connector；portable plugin 不持有、也不修改 App 的 URL。

App 已建立並完成 OAuth 設定後，再用既有 App / connector ID 產生綁定版本：

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_EXISTING_WORKSPACE_APP_OR_CONNECTOR_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Generated ChatGPT plugin 使用 `apps: "./.app.json"`，而且不包含 `mcpServers` 與 `.mcp.json`。`--mcp-url` 會被驗證並記錄為該 App 預期已設定的 endpoint；真正的 plugin binding 是 App / connector ID。

完整設定、migration 與 troubleshooting 請看 `docs/chatgpt-app.zh-TW.md`。
