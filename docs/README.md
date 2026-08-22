# Documentation

[English](README.md) | [繁體中文](README.zh-TW.md)

Use this page as the documentation index for `codex-plugin-glab` v0.3.0. The project contains both the ChatGPT/Codex plugin and a bundled self-hosted GitLab MCP server.

## Getting started

- [Main README](../README.md) — project overview, Docker quick start, safety defaults, and plugin installation.
- [Authentication](authentication.md) — MCP endpoint authentication and server-to-GitLab token handling.
- [ChatGPT App Integration](chatgpt-app.md) — deploy the bundled MCP server as a remote HTTPS endpoint and connect it to ChatGPT.
- [Capability Matrix](capability-matrix.md) — current server tools, authentication modes, and client integration paths.

## Architecture and operations

- [Architecture](architecture.md) — plugin/server split, trust boundaries, policies, and local `git` / `glab` routing.
- [Self-Managed GitLab](self-managed.md) — custom GitLab hosts, TLS, project scoping, and compatibility considerations.
- [Roadmap](roadmap.md) — completed v0.3 foundation plus planned per-user OAuth and deeper GitLab workflows.

## MCP server package

- [`packages/mcp-server/README.md`](../packages/mcp-server/README.md) — runtime environment variables, tool groups, and local development commands.
- [`.env.example`](../.env.example) — safe deployment configuration template.

## Project policies

- [Contributing](../CONTRIBUTING.md)
- [Security](../SECURITY.md)
- [Support](../SUPPORT.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Changelog](../CHANGELOG.md)

English is the default documentation language. Core user-facing documentation should keep the Traditional Chinese version in sync when behavior changes.
