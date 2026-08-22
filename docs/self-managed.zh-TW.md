# GitLab Self-Managed

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

內建 MCP config 預設指向 GitLab.com。Self-Managed / Dedicated GitLab 通常使用：

```text
https://<your-gitlab-host>/api/v4/mcp
```

## 建議設定

1. 確認 GitLab instance/version 支援且允許 GitLab MCP Server。
2. 在 Codex 加入該 instance MCP server，或在開發版 plugin 把 `.mcp.json` 改成該 instance。
3. 使用 Codex MCP OAuth 登入。
4. 同時設定 `glab` 作 fallback：

```bash
glab auth login --hostname gitlab.example.com
glab auth status --hostname gitlab.example.com
```

## MCP 不可用時

遠端 GitLab 操作使用 `glab` / `glab api`，本機修改、commit、push 使用 `git`。

不可因為 plugin 預設 endpoint 是 GitLab.com，就把 Self-Managed 的 private project path 或 credentials 傳到 GitLab.com。

## 相容性

GitLab MCP capabilities 會依版本不同。Skills 採 capability-driven：以目前連線 instance 真正暴露的 MCP tools 為準，沒有就 fallback，不硬假設新版 tool 一定存在。
