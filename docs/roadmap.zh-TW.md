# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## 目前方向

本專案讓 public `gitlab-self-hosted` plugin 保持 **endpoint-neutral**，同一個 repo 仍提供 MCP Server implementation。

正常 remote 使用應該是：

```text
public plugin
  + user/workspace 自己選擇的 HTTPS /mcp endpoint
  + OAuth
  -> GitLab
```

Public package 不應內嵌 maintainer-specific deployment URL，也不應偷偷選 localhost。

## 近期

- 維持 GitLab.com、Self-Managed、Dedicated 的 read/write tool coverage。
- 擴充更多 GitLab Self-Managed version compatibility fixtures。
- 改善 capability probing 與 unsupported API error message。
- 增加更細緻的 per-tool / per-project authorization policy。
- 強化 hosted deployment 的 observability、audit events、operational metrics。
- 持續測試 OAuth/CIMD/DCR 與目前 MCP Clients 的相容性。

## Packaging / installation

- 維持一個 public marketplace root 提供 workflow plugin。
- 真實 remote MCP URL 留在 user/workspace configuration。
- `workspace-binding/.mcp.remote.json.example` 只作中性 reference。
- localhost 只保留為 `build_local_variant.py` 產生的 explicit development fallback。
- Personal/App-bound builders 只保留 backwards compatibility，不作正常安裝路徑。
- 只有在平台提供穩定、正式、適合 self-hosted GitLab 設定的 managed App Template 機制時，才考慮導入 template。

## Security

- 保持 read-only default。
- 保持 merge 獨立 enable flag。
- Project allowlist 必須維持 authoritative。
- 阻止 public source files 出現真實 organization MCP endpoint 或 OAuth secret。
- 持續維護 remote metadata/endpoint validation 的 SSRF protection。
- 保持 OAuth encrypted persistence 與 multi-replica token/state atomic handling。

## Future workflows

未來可考慮 release workflows、members、milestones、更完整的 CI diagnostics，以及其他能以 least-privilege 明確控管的 GitLab administrative operations。
