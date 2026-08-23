# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities in v0.5.7

| Capability | Bundled MCP server | Notes |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity or current OAuth user |
| Groups / projects | Read | Optional project allowlist filtering |
| Branches | Read / create | Create requires write authorization |
| Commits | Read | Optional ref filter |
| Repository tree | Read | Path/ref/recursive pagination |
| Repository files | Read / create / update / delete | Writes create Git commits; delete is destructive |
| Issues | Read / create / update / comment | Writes disabled by default |
| Merge requests | Read / create / update / comment | Writes disabled by default |
| MR diffs | Read | Paginated GitLab API |
| MR approve/unapprove | Write | Requires write policy/scope and GitLab permission |
| MR discussions | Create | Creates discussion threads |
| Merge MR | Optional write | Requires write + merge flags and GitLab permission |
| Pipelines | Read / create / retry / cancel | Cancel is destructive |
| Pipeline jobs/traces | Read | Job trace/log read |
| Arbitrary GitLab API proxy | No | Explicit tools only |
| Local working tree | No | Client/plugin local `git` |
| Local commit/push | No | Client/plugin `git` / `glab` |

## Authentication and deployment

| Capability | v0.5.7 |
| --- | --- |
| Marketplace-root direct MCP binding | Yes | `mcpServers: "./.mcp.json"` |
| Marketplace-root hosted endpoint | Yes | `https://gitlab-mcp.blacmarcs.com/mcp` |
| Remote HTTPS MCP + OAuth as normal install path | Yes | No local MCP/build variant/second repo required |
| Shared service identity | Yes (`MCP_AUTH_MODE=shared-token`) |
| Per-user GitLab OAuth | Yes (`MCP_AUTH_MODE=oauth`) |
| Protected Resource Metadata | Yes |
| Authorization Server Metadata | Yes |
| Downstream PKCE S256 | Required in OAuth mode |
| GitLab OAuth PKCE S256 | Yes |
| `gitlab:read` / `gitlab:write` | Yes |
| Client ID Metadata Documents (CIMD) | Yes, preferred modern path |
| Dynamic Client Registration (DCR) | Yes, compatibility fallback |
| CIMD SSRF controls | HTTPS/no redirects/private-network block/size+timeout/host allowlist |
| Encrypted file OAuth store | Yes, single-node |
| PostgreSQL OAuth store | Yes, multi-replica |
| Atomic cross-replica state/code consume | Yes |
| Atomic refresh-token rotation | Yes |
| Automatic GitLab token refresh | Yes |
| Docker Compose PostgreSQL profile | Yes |
| PostgreSQL CI integration tests | Yes |
| Localhost development fallback | Yes | Generated local variant overrides binding to `http://127.0.0.1:3333/mcp` |
| Optional custom remote override | Yes | `build_personal_variant.py` validates and replaces the HTTPS `/mcp` URL |
| Optional existing-App binding helper | Yes | `build_chatgpt_variant.py`; not required for root install |
| Repository helper is an OpenAI managed App Template | No | Managed templates are a separate platform feature |
| Remote URL validator / live MCP doctor | Yes | HTTPS `/mcp`, discovery metadata, unauthenticated challenge, DNS/public-address checks |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| ChatGPT / Codex normal install | Repository marketplace root -> `GitLab Self-Hosted` -> `https://gitlab-mcp.blacmarcs.com/mcp` -> OAuth discovery |
| Local development | Generate `gitlab-self-hosted@ademkao-gitlab-local` -> `http://127.0.0.1:3333/mcp` |
| Managed workspace with an explicit existing MCP App/connection | Optional App-bound helper; generated plugin removes the source direct MCP binding |
| Other MCP clients | `/mcp` with shared bearer or OAuth discovery/CIMD/DCR according to client support |

The default repository package itself is directly usable against `https://gitlab-mcp.blacmarcs.com/mcp`. The localhost package and custom remote/App-bound packages are explicit alternatives, not prerequisites.

Client product availability, plan limits, approval UI, managed-app features, and write permissions are controlled by each MCP client/platform and can change independently of this repository.

## Policy layers

Write operations require server policy and, in OAuth mode, `gitlab:write`. Project allowlists remain authoritative. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`. GitLab's own permissions are always the final authorization layer.

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

Compatibility depends on the GitLab version and availability of the REST/OAuth endpoints used by each tool and authentication mode.
