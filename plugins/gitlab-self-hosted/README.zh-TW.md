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

Portable package 刻意維持 **endpoint-unbound**：不包含 `mcpServers`、不自動載入 `.mcp.json`，也不包含使用者／workspace-specific 的 ChatGPT MCP connection binding。

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

### ChatGPT MCP connection binding

在 ChatGPT 裡，「安裝 portable repo plugin」和「建立／授權 remote MCP connection」是兩個不同的 platform operation。看得到 `@GitLab Self-Hosted` **不代表**該 plugin 已自動綁到使用者自己的 MCP connection。

ChatGPT 正確流程：

1. 在 ChatGPT platform UI 建立／連接 remote MCP endpoint，例如 `https://gitlab-mcp.example.com/mcp`。
2. 完成 OAuth，並確認該 connection 能 scan / expose GitLab tools。
3. 完整複製該 underlying MCP App / connection 的 platform-generated **technical ID**。
4. 用 technical ID 產生 connection-bound marketplace：

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_CHATGPT_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--app-id` 仍保留作為 `--connection-id` 的 backwards-compatible alias。

Import/install generated marketplace 後使用：

```text
gitlab-self-hosted@ademkao-gitlab-chatgpt
```

Generated ChatGPT plugin 使用 `apps: "./.app.json"`，而且不包含 `mcpServers` 與 `.mcp.json`。`--mcp-url` 只負責驗證並記錄 existing connection 預期使用的 endpoint；真正的 plugin dependency 是 connection technical ID。

產生 artifact 不會建立 MCP connection、不會執行 OAuth，也不會修改已安裝的 portable plugin；必須明確 import/install generated marketplace。

完整設定、migration 與 troubleshooting 請看 `docs/chatgpt-app.zh-TW.md`。