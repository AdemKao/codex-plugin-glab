# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities in v0.3.0

| Capability | Bundled MCP server | Notes |
| --- | --- | --- |
| Current GitLab user | Read | Token identity |
| Groups | Read | Lists groups visible to token |
| Projects | Read | Membership projects; optional allowlist filtering |
| Branches | Read / create | Create requires writes enabled |
| Commits | Read | Optional ref filter |
| Issues | Read / create / update / comment | Writes disabled by default |
| Merge requests | Read / create / update / comment | Writes disabled by default |
| MR diffs | Read | Paginated GitLab API |
| Merge MR | Optional write | Requires both write and merge flags |
| Pipelines | Read | Project pipeline inspection |
| Pipeline jobs | Read | Includes job trace/log read |
| Arbitrary GitLab API proxy | No | Explicit tools only |
| Local working tree | No | Handled by client/plugin using local `git` |
| Local commit/push | No | Handled by client/plugin using `git` / `glab` |
| Per-user GitLab OAuth mapping | Not yet | Planned after v0.3.0 |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex | Plugin + bundled local/remote MCP server; local `git` / `glab` fallback where needed |
| ChatGPT | Deploy the MCP server remotely over HTTPS, then connect it as a Custom MCP App where the workspace supports it |
| Other MCP clients | Connect to `/mcp` using supported HTTP/auth configuration |

Client product availability, plan limits, approval UI, and write permissions are controlled by each MCP client and can change independently of this repository.

## Authentication matrix

| Boundary | v0.3.0 support |
| --- | --- |
| MCP endpoint fixed bearer | Yes (`MCP_AUTH_TOKEN`) |
| MCP endpoint unauthenticated loopback | Yes |
| MCP endpoint unauthenticated public bind | Explicit opt-in only; not recommended |
| GitLab `PRIVATE-TOKEN` | Yes |
| GitLab OAuth-style bearer token | Yes |
| Per-user OAuth passthrough | Planned |

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

Compatibility depends on the GitLab version and availability of the REST API endpoints used by each tool.
