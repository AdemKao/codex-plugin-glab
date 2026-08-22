# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities in v0.4.0

| Capability | Bundled MCP server | Notes |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity or current OAuth user |
| Groups | Read | Lists groups visible to the current GitLab identity |
| Projects | Read | Membership projects; optional allowlist filtering |
| Branches | Read / create | Create requires write policy + OAuth write scope when applicable |
| Commits | Read | Optional ref filter |
| Issues | Read / create / update / comment | Writes disabled by default |
| Merge requests | Read / create / update / comment | Writes disabled by default |
| MR diffs | Read | Paginated GitLab API |
| Merge MR | Optional write | Requires write flag, merge flag, OAuth write scope when applicable, and GitLab permission |
| Pipelines | Read | Project pipeline inspection |
| Pipeline jobs | Read | Includes job trace/log read |
| Arbitrary GitLab API proxy | No | Explicit tools only |
| Local working tree | No | Handled by client/plugin using local `git` |
| Local commit/push | No | Handled by client/plugin using `git` / `glab` |
| Shared GitLab service identity | Yes | `MCP_AUTH_MODE=shared-token` |
| Per-user GitLab OAuth mapping | Yes | `MCP_AUTH_MODE=oauth` |
| MCP OAuth discovery | Yes | Protected Resource + authorization-server metadata |
| Downstream PKCE | Yes | S256 required |
| GitLab OAuth PKCE | Yes | Independent S256 verifier/challenge |
| MCP refresh-token rotation | Yes | Refresh token rotates on use |
| GitLab token refresh | Yes | Automatic when an OAuth session needs it |
| Dynamic Client Registration | Yes | Compatibility path; CIMD planned |
| Multi-replica OAuth store | No | Built-in store is single-node/file-based |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex | Plugin + bundled local/remote MCP server; local `git` / `glab` fallback where needed |
| ChatGPT | Remote HTTPS MCP; per-user deployments should use built-in OAuth where the workspace supports custom MCP apps |
| Other MCP clients | Connect to `/mcp`; use shared bearer or OAuth discovery depending on deployment mode |

Client product availability, plan limits, approval UI, and write permissions are controlled by each MCP client and can change independently of this repository.

## Authentication matrix

| Boundary | v0.4.0 support |
| --- | --- |
| `MCP_AUTH_MODE=shared-token` | Yes |
| Shared MCP fixed bearer | Yes (`MCP_AUTH_TOKEN`) |
| Shared unauthenticated loopback | Yes |
| Shared unauthenticated public bind | Explicit opt-in only; not recommended |
| GitLab `PRIVATE-TOKEN` | Yes in shared mode |
| Server-wide OAuth-style GitLab bearer | Yes in shared mode |
| `MCP_AUTH_MODE=oauth` | Yes |
| Per-user OAuth identity | Yes |
| Protected Resource Metadata | Yes |
| OAuth authorization-server metadata | Yes |
| DCR | Yes |
| PKCE S256 | Required in OAuth mode |
| `gitlab:read` / `gitlab:write` | Yes |
| Encrypted OAuth persistence | Yes, single-node file store |
| CIMD | Planned |

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

Compatibility depends on the GitLab version and availability of the REST/OAuth endpoints used by each tool and authentication mode.
