# Architecture

[English](architecture.md) | [繁體中文](architecture.zh-TW.md)

## Overview

`codex-plugin-glab` has two first-class runtime pieces:

1. **Plugin layer** — Codex/ChatGPT workflow guidance, routing, safety rules, and local `git` / `glab` fallbacks.
2. **Self-hosted MCP server** — explicit GitLab MCP tools backed by GitLab REST API v4.

```text
ChatGPT / Codex / MCP client
            |
            | MCP + OAuth or shared bearer
            v
+-------------------------------------------+
| Self-hosted MCP server                    |
|                                           |
| Protected Resource Metadata               |
| OAuth Authorization Server                |
| CIMD resolver + DCR compatibility         |
| request-scoped GitLab identity            |
| tool schemas + project/write policy       |
+---------------------+---------------------+
                      |
                      | GitLab REST API v4
                      v
            GitLab.com / Self-Managed

OAuth persistence
  single replica  -> AES-GCM encrypted file
  multi replica   -> PostgreSQL + encrypted payloads
```

GitLab native MCP is optional; the bundled server does not depend on it.

## Authentication architecture

### Shared-token

```text
MCP client --MCP_AUTH_TOKEN--> MCP server --GITLAB_TOKEN--> GitLab
```

One GitLab identity is shared by the deployment.

### Per-user OAuth

```text
MCP client
   |
   | OAuth discovery
   | CIMD client_id metadata or DCR
   | authorization code + PKCE
   v
codex-plugin-glab OAuth gateway
   |
   | independent GitLab authorization code + PKCE
   v
GitLab OAuth
   |
   | user-scoped access/refresh token
   v
OAuth store
   |
   | request-scoped credential via AsyncLocalStorage
   v
GitLab REST client
```

The server is both the MCP protected resource and its downstream authorization server. GitLab credentials never need to be given to the MCP client.

## Client registration

v0.5 prefers **Client ID Metadata Documents (CIMD)** when the MCP client supports them and retains **Dynamic Client Registration (DCR)** for compatibility.

CIMD metadata resolution is isolated from tool execution and includes an SSRF boundary: HTTPS only, exact `client_id` matching, no redirects, bounded size/time, optional host allowlists, and private-network blocking by default.

## OAuth storage abstraction

The OAuth gateway depends on `OAuthStoreBackend`, not a concrete persistence implementation.

### File backend

The encrypted file backend is intentionally single-process/single-node. It uses AES-256-GCM plus atomic file replacement and defensive copies so application code cannot mutate stored state without an explicit store operation.

### PostgreSQL backend

The production backend stores encrypted payloads in PostgreSQL and uses hashed token lookup columns. It is designed for multiple MCP replicas.

Cross-replica one-time semantics are enforced in the database:

```text
OAuth state         -> DELETE ... RETURNING
Authorization code  -> DELETE ... RETURNING
Refresh rotation    -> conditional UPDATE using old refresh-token hash
```

No process-local mutex is required for those guarantees.

## Request identity

After OAuth authentication, the GitLab access token and effective MCP scopes are attached to the current request through Node `AsyncLocalStorage`. Both the original tool registry and v0.5 repository/MR/pipeline tools use the same request-scoped `GitLabClient`.

## Policy layers

A write is allowed only when all applicable layers permit it:

1. OAuth session has `gitlab:write` (OAuth mode);
2. `GITLAB_WRITE_ENABLED=true`;
3. `GITLAB_ALLOWED_PROJECTS` permits the project, if configured;
4. GitLab itself permits the current user;
5. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`.

Repository-file deletion and pipeline cancellation are marked destructive. The server exposes explicit operations, not a generic GitLab API proxy.

## Local repository workflows

```text
remote GitLab reads/writes -> MCP server
local working tree         -> git
local commit/push          -> git / glab
```

Remote API credentials therefore remain separated from local filesystem mutation.

## Operational scaling

For one replica, `OAUTH_STORE_DRIVER=file` is sufficient. For HA/horizontal scaling, use `OAUTH_STORE_DRIVER=postgres` and a common `OAUTH_ENCRYPTION_KEY` across replicas. Store that key separately from PostgreSQL backups.
