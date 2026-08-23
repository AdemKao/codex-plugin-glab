# 文件索引

[English](README.md) | [繁體中文](README.zh-TW.md)

這裡是 `codex-plugin-glab` v0.5.2 的文件入口。專案同時包含 ChatGPT/Codex Plugin 與 bundled self-hosted GitLab MCP Server。

## 開始使用

- [主要 README](../README.zh-TW.md) — 專案總覽、Docker 快速開始、personal/Codex direct remote MCP 安裝、localhost fallback 與安全預設。
- [Authentication](authentication.zh-TW.md) — MCP endpoint authentication、OAuth discovery 與 server-to-GitLab credential handling。
- [ChatGPT / Codex Remote MCP Integration](chatgpt-app.zh-TW.md) — **Add server -> Streamable HTTP -> HTTPS `/mcp` -> OAuth** 主流程、local fallback、optional workspace binding helper，以及獨立的 managed-workspace App Template 說明。
- [Capability Matrix](capability-matrix.zh-TW.md) — 目前 server tools、authentication modes 與 client integration paths。

## 架構與操作

- [Architecture](architecture.zh-TW.md) — Plugin/Server 分工、trust boundaries、policies 與 local `git` / `glab` routing。
- [Self-Managed GitLab](self-managed.zh-TW.md) — custom GitLab host、TLS、project scoping 與 compatibility。
- [Roadmap](roadmap.zh-TW.md) — 已完成至 v0.5.2 的 self-hosted MCP/OAuth milestones，以及後續 policy / observability 規劃。

## MCP Server package

- [`packages/mcp-server/README.md`](../packages/mcp-server/README.md) — runtime environment variables、tool groups 與 local development commands。
- [`.env.example`](../.env.example) — 安全部署設定範本。

## 專案政策

- [Contributing](../CONTRIBUTING.zh-TW.md)
- [Security](../SECURITY.md)
- [Support](../SUPPORT.zh-TW.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Changelog](../CHANGELOG.md)

英文是預設文件語言；核心 user-facing 行為有變更時，應同步更新繁體中文版本。
