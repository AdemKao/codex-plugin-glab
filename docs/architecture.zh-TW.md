# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` 現在有兩個一等公民：

1. **Plugin layer**：Codex/ChatGPT workflow guidance、routing、安全規則，以及 local `git` / `glab` fallback。
2. **Self-hosted MCP server**：透過 HTTP MCP 暴露明確 GitLab tools，並直接呼叫 GitLab REST API v4。

```text
ChatGPT / Codex / MCP client
            |
            | MCP
            v
+-------------------------------+
| Self-hosted MCP server        |
| packages/mcp-server           |
|                               |
| tool schemas                  |
| request validation            |
| project allowlist             |
| read/write/merge policy       |
| GitLab API client             |
+---------------+---------------+
                |
                | HTTPS / GitLab REST API v4
                v
      GitLab.com / Self-Managed
```

GitLab native MCP 變成 optional，bundled server 不依賴它。

## Trust boundaries

### MCP client -> MCP server

Remote deployment 必須有 authentication boundary。內建 server 支援 MCP bearer token；若 bind 到非 loopback address，沒有 auth 時預設拒絕啟動，除非明確開啟 insecure mode。

Production 可以在 MCP server 前面放 OAuth-capable gateway、private tunnel 或其他 client 支援的 authentication layer。

### MCP server -> GitLab

Server 持有 GitLab access token，只呼叫已註冊 tool 所需要的 REST API route。`GITLAB_HOST` 可選 GitLab.com 或 Self-Managed/Dedicated instance。

本 server 不提供任意 GitLab API proxy。

## Policy layers

設定 `GITLAB_ALLOWED_PROJECTS` 時，所有 project-level operation 都會先通過 allowlist。

Write operation 需要：

```text
GITLAB_WRITE_ENABLED=true
```

Merge 還需要：

```text
GITLAB_MERGE_ENABLED=true
```

因此一般協作 write 與較高影響的 merge 會被分開授權。

## Local repository workflow

MCP Server 處理 remote GitLab state；local commit / push 仍屬於 plugin/client environment：

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local GitLab CLI fallback  -> glab
```

這樣 server-side credential 與 remote API operation 不會和 local filesystem mutation 混在一起。

## Future OAuth model

v0.3.0 使用 server-side GitLab token，主要定位是 single-user 或 trusted workspace。未來加入 per-user OAuth passthrough 時，可以只替換 authentication/client creation 層，不需要重寫 tool schema 與 policy。
