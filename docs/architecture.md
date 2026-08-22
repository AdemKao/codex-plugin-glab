# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Design choice

This project mirrors the shape of the official Codex GitHub plugin rather than building a second GitLab API client inside the plugin.

The plugin has two execution planes:

1. **GitLab hosted MCP** for structured remote operations.
2. **Local `git` + `glab`** for working-tree state and operations that are inherently local or not exposed by the connected MCP version.

This minimizes duplicated authentication and API code while still covering commit/push workflows.

## Layers

### Plugin manifest

`plugins/gitlab/.codex-plugin/plugin.json` describes the plugin, capabilities, skills, and MCP companion file.

### MCP declaration

`plugins/gitlab/.mcp.json` points to GitLab.com's hosted MCP endpoint. Codex handles the MCP OAuth session.

### Skills

Skills provide routing, safety, and repeatable workflows. They do not hard-code a fixed set of MCP tool names beyond documented capability categories because the GitLab MCP surface changes by GitLab version.

### Local fallback

`git` owns working-tree state, staging, commits, and pushes. `glab` provides GitLab-aware host/auth context and CLI/API fallbacks.

## Why not only `glab mcp serve`?

GitLab CLI also provides an experimental local MCP server. It is useful, especially for Self-Managed environments, but its tool set and stability differ from the hosted MCP server. The default plugin therefore uses the hosted GitLab MCP endpoint and treats `glab` as the compatibility layer.

## Why not only REST API scripts?

A custom REST wrapper would duplicate GitLab's authentication, pagination, API evolution, and MCP work. The plugin instead delegates structured remote operations to GitLab's own MCP/API surfaces and focuses on high-quality Codex workflows.

## Future app/connector layer

A public ChatGPT/Codex Plugin Directory submission may require an app/connector packaging path beyond this local/open-source Codex bundle. That can be added without changing the skill architecture: the skills should continue to prefer the installed GitLab app/MCP surface and retain local git fallback for publish operations.
