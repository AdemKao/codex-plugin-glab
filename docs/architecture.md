# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` has two first-class runtime pieces:

1. **Plugin layer** — Codex/ChatGPT workflow guidance, routing, safety rules, and local `git` / `glab` fallbacks.
2. **Self-hosted MCP server** — an HTTP MCP server that exposes explicit GitLab tools and calls GitLab REST API v4.

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

The GitLab native MCP server is optional. The bundled server does not depend on it.

## Trust boundaries

### MCP client -> MCP server

A remote deployment must have an authentication boundary. The built-in server supports an MCP bearer token and refuses an unauthenticated non-loopback bind unless insecure mode is explicitly acknowledged.

For production use, an OAuth-capable gateway, private tunnel, or other client-supported authentication layer can sit in front of the MCP server.

### MCP server -> GitLab

The server holds a GitLab access token and uses only explicit REST API routes required by registered tools. `GITLAB_HOST` selects GitLab.com or a Self-Managed/Dedicated instance.

The server is not a generic arbitrary API proxy.

## Policy layers

All project-level operations pass through the project allowlist when `GITLAB_ALLOWED_PROJECTS` is configured.

Write operations require:

```text
GITLAB_WRITE_ENABLED=true
```

Merge additionally requires:

```text
GITLAB_MERGE_ENABLED=true
```

This separates normal collaboration writes from the more consequential merge action.

## Local repository workflows

The MCP server is for remote GitLab state. Local commit/push workflows still belong to the plugin/client environment:

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local GitLab CLI fallback  -> glab
```

This keeps server-side credentials and remote API operations separate from local filesystem mutation.

## Future OAuth model

v0.3.0 uses a server-side GitLab token and is intended primarily for a single user or trusted workspace. A later version can add per-user OAuth passthrough without changing the tool layer: the authentication component can supply a user-scoped GitLab client while the registered tools and policy checks remain the same.
