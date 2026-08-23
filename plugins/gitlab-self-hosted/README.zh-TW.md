# GitLab Self-Hosted Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

這個 plugin 以 GitLab MCP 處理結構化 GitLab workflow；需要 local working tree、commit、push 時再搭配本機 `git` / `glab`。

主要 skills：

- `gitlab` — 一般 routing 與 triage。
- `gitlab-setup` — authentication、host 與 capability setup。
- `glab-publish` — branch、test、commit、push、建立 MR。
- `glab-address-comments` — 處理 MR feedback 並 push 修正。
- `glab-fix-ci` — 分析 GitLab pipeline/job failure 並發布修正。

## 預設 package

使用：

```text
gitlab-self-hosted@ademkao-codex-plugins
```

Repository root package 會直接載入 `./.mcp.json`，其 endpoint 是：

```text
https://gitlab-mcp.blacmarcs.com/mcp
```

這是一般 ChatGPT / Codex 的正常流程。安裝 root marketplace 後依提示完成 OAuth 即可；預設流程不需要在本機啟動 MCP、不需要 generated marketplace variant、不需要第二個 repo，也不需要 ChatGPT connection technical ID。

本 repo 刻意不使用 generic `gitlab` identifier，避免和 OpenAI curated GitLab integration 發生解析衝突。

## OAuth

Hosted endpoint 使用 remote HTTPS MCP + OAuth。Client 會依 MCP OAuth discovery 開啟 authorization flow，使用者再授權自己的 GitLab identity。

第一個測試建議用 harmless read：

```text
列出我可以存取的 GitLab groups 和 projects。
```

不要要求使用者把 GitLab PAT 貼進聊天。

## Local development fallback

如果開發時刻意讓 MCP Server 跑在同一台機器：

```bash
python3 scripts/build_local_variant.py
```

使用 generated package：

```text
gitlab-self-hosted@ademkao-gitlab-local
```

它會把 source hosted binding 覆寫為：

```text
http://127.0.0.1:3333/mcp
```

localhost 只保留作為 development fallback。

## Optional custom remote endpoint

Root package 已經預設使用 hosted endpoint。需要改成另一個 public HTTPS MCP deployment 的 operator 仍可使用：

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

這是明確 custom-remote override；一般使用者不需要執行。

## Optional ChatGPT App binding

`scripts/build_chatgpt_variant.py` 仍保留給明確希望把 plugin 綁到既有 ChatGPT MCP App / connection technical ID 的 workspace。Generated artifact 會移除 direct `mcpServers` binding，改用 `.app.json`。

這個 helper 不是 root installation 的必要步驟，也不是 OpenAI managed App Template。

完整設定與 troubleshooting 請看 `docs/chatgpt-app.zh-TW.md`。
