# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` has two first-class runtime pieces:

1. **Plugin layer** — Codex/ChatGPT workflow guidance, routing, safety rules, and local `git` / `glab` fallbacks.
2. **Self-hosted MCP server** — an HTTP MCP server that exposes explicit GitLab tools and calls GitLab REST API v4.

```text
ChatGPT / Codex / MCP client
            |
            | MCP + shared bearer or OAuth
            v
+---------------------------------------+
| Self-hosted MCP server                |
| packages/mcp-server                   |
|                                       |
| OAuth / shared-token auth boundary    |
| request-scoped GitLab identity        |
| tool schemas + validation             |
| project allowlist                     |
| read/write/merge policy               |
| GitLab REST API client                |
+-------------------+-------------------+
                    |
                    | HTTPS / GitLab REST API v4
                    v
          GitLab.com / Self-Managed
```

GitLab native MCP is optional. The bundled server does not depend on it.

## Authentication architecture

### Shared-token mode

```text
MCP client
   | MCP_AUTH_TOKEN
   v
MCP server
   | GITLAB_TOKEN
   v
GitLab
```

One configured GitLab identity is shared by the deployment. This keeps the v0.3 operational model intact.

### Per-user OAuth mode

```text
MCP client
   |
   | OAuth discovery / PKCE
   v
MCP OAuth gateway
   |
   | GitLab OAuth / independent PKCE
   v
GitLab authorization server
   |
   | user-scoped GitLab access + refresh tokens
   v
Encrypted OAuth store
   |
   | request-scoped credential via AsyncLocalStorage
   v
GitLab REST client
```

The MCP server is both the protected resource and the downstream authorization server/gateway. It exposes Protected Resource Metadata so MCP clients can discover authorization without receiving a GitLab PAT.

After authorization, the GitLab credential is attached to the current MCP request through Node `AsyncLocalStorage`. The tool layer and GitLab client therefore use the current user's identity without storing that identity in global mutable state.

## OAuth persistence

The built-in v0.4 store persists:

- dynamically registered MCP OAuth clients;
- pending authorization transactions;
- one-time authorization codes;
- MCP sessions;
- encrypted GitLab OAuth access/refresh tokens.

The whole store is encrypted with AES-256-GCM. MCP bearer tokens and authorization codes are persisted only as hashes.

The file store is intentionally single-node. Multi-replica/HA deployment requires a future transactional shared storage adapter rather than sharing one writable JSON file.

## Trust boundaries

### MCP client -> MCP server

In shared-token mode, remote clients use `MCP_AUTH_TOKEN` or a separately trusted boundary.

In OAuth mode, unauthenticated `/mcp` requests return OAuth discovery information. The client completes authorization-code + PKCE and receives a server-issued MCP access token.

### MCP server -> GitLab

In shared-token mode the server uses the configured GitLab token.

In OAuth mode the server uses the current user's GitLab OAuth token and refreshes it when needed. GitLab credentials are never embedded in the plugin package or returned as MCP data.

The server only calls explicit REST API routes needed by registered tools; it is not an arbitrary GitLab API proxy.

## Policy layers

Project operations pass through `GITLAB_ALLOWED_PROJECTS` when configured.

Write operations require the server setting:

```text
GITLAB_WRITE_ENABLED=true
```

In OAuth mode they additionally require:

```text
gitlab:write
```

Merge additionally requires:

```text
GITLAB_MERGE_ENABLED=true
```

GitLab's own project permissions are the final authorization layer. This means a request succeeds only when the client scope, deployment policy, project allowlist, and GitLab identity all permit it.

## Local repository workflows

The MCP server handles remote GitLab state. Local commit/push workflows remain in the plugin/client environment:

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local GitLab CLI fallback  -> glab
```

This separates remote credentials/API operations from local filesystem mutation.

## Registration compatibility

v0.4 supports Dynamic Client Registration because it remains useful for existing MCP clients. Current MCP specifications are moving toward Client ID Metadata Documents (CIMD); the architecture keeps OAuth registration separate from tool execution so CIMD can be added without rewriting GitLab tools.
