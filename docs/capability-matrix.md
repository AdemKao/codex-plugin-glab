# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities in v0.5.2

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

| Capability | v0.5.2 |
| --- | --- |
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
| Direct personal/Codex remote MCP setup | Yes | **Add server** -> Streamable HTTP -> HTTPS `/mcp` -> OAuth discovery/authentication |
| OAuth discovery from unauthenticated `/mcp` | Yes | `401` challenge points to Protected Resource Metadata |
| Localhost source `.mcp.json` fallback | Yes | Remains `http://127.0.0.1:3333/mcp` for same-host/local use |
| Remote URL validator / live MCP doctor | Yes | HTTPS `/mcp`, discovery metadata, unauthenticated challenge, DNS/public-address checks |
| Workspace binding helper | Yes, optional | Requires an already-existing workspace app/connector ID |
| Repository helper is an OpenAI managed App Template | No | Explicitly not claimed; managed templates are a separate platform feature |
| Automatic creation/publishing of arbitrary ChatGPT workspace apps | No | Platform user/admin consent and governance boundary |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Personal Codex / ChatGPT desktop Codex host | **Add server** -> Streamable HTTP -> remote HTTPS `/mcp` -> OAuth discovery; localhost `.mcp.json` remains local fallback |
| Managed ChatGPT workspace | Use the platform's supported app/admin flow; managed App Templates are separate. Repository workspace-binding helper is optional only after an app/connector already exists |
| Other MCP clients | `/mcp` with shared bearer or OAuth discovery/CIMD/DCR according to client support |

The portable source `.mcp.json` remains `http://127.0.0.1:3333/mcp`; direct remote OAuth does not require changing it. `scripts/build_chatgpt_variant.py` is an optional workspace binding helper, not the primary install path and not an OpenAI managed App Template.

Client product availability, plan limits, approval UI, managed-app features, and write permissions are controlled by each MCP client/platform and can change independently of this repository.

## Policy layers

Write operations require server policy and, in OAuth mode, `gitlab:write`. Project allowlists remain authoritative. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`. GitLab's own permissions are always the final authorization layer.

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

Compatibility depends on the GitLab version and availability of the REST/OAuth endpoints used by each tool and authentication mode.
