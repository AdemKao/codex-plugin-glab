# 文件索引

[English](README.md) | [繁體中文](README.zh-TW.md)

這裡是 `codex-plugin-glab` v0.3.0 的文件入口。專案現在同時包含 ChatGPT/Codex Plugin 與 bundled self-hosted GitLab MCP Server。

## 開始使用

- [主要 README](../README.zh-TW.md) — 專案總覽、Docker 快速開始、安全預設與 Plugin 安裝方式。
- [Authentication](authentication.zh-TW.md) — MCP endpoint authentication 與 server-to-GitLab token handling。
- [ChatGPT App Integration](chatgpt-app.zh-TW.md) — 將 bundled MCP Server 部署成 remote HTTPS endpoint 並連到 ChatGPT。
- [Capability Matrix](capability-matrix.zh-TW.md) — 目前 server tools、authentication modes 與 client integration paths。

## 架構與操作

- [Architecture](architecture.zh-TW.md) — Plugin/Server 分工、trust boundaries、policies 與 local `git` / `glab` routing。
- [Self-Managed GitLab](self-managed.zh-TW.md) — custom GitLab host、TLS、project scoping 與 compatibility。
- [Roadmap](roadmap.zh-TW.md) — v0.3 已完成基礎，以及後續 per-user OAuth / deeper GitLab workflows。

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
