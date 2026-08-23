# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

## Server capabilities

| Capability | Bundled MCP server | Notes |
| --- | --- | --- |
| Current GitLab user | Read | Shared-token identity or current OAuth user |
| Groups / projects | Read | Optional project allowlist filtering |
| Branches | Read / create | Create requires write authorization |
| Commits | Read | Optional ref filter |
| Repository tree/files | Read / create / update / delete | Writes create Git commits; delete is destructive |
| Issues | Read / create / update / comment | Writes disabled by default |
| Merge requests | Read / create / update / comment | Writes disabled by default |
| MR diffs / approvals / discussions | Read / write | Subject to GitLab permissions and write policy |
| Merge MR | Optional write | Requires write + merge flags |
| Pipelines | Read / create / retry / cancel | Cancel is destructive |
| Pipeline jobs/traces | Read | Job trace/log read |
| Arbitrary GitLab API proxy | No | Explicit tools only |
| Local working tree | No | Use local `git` / `glab` |

## Authentication and deployment

| Capability | Status |
| --- | --- |
| Shared service identity | Yes (`MCP_AUTH_MODE=shared-token`) |
| Per-user GitLab OAuth | Yes (`MCP_AUTH_MODE=oauth`) |
| Protected Resource Metadata | Yes |
| Authorization Server Metadata | Yes |
| Downstream PKCE S256 | Required in OAuth mode |
| GitLab OAuth PKCE S256 | Yes |
| `gitlab:read` / `gitlab:write` | Yes |
| Client ID Metadata Documents (CIMD) | Yes |
| Dynamic Client Registration (DCR) | Compatibility fallback |
| Encrypted file OAuth store | Yes, single-node |
| PostgreSQL OAuth store | Yes, multi-replica |
| Direct user/workspace remote MCP setup | Yes |
| Public source plugin embeds a maintainer MCP endpoint | No |
| Public source plugin auto-loads localhost | No |
| Localhost development variant | Yes, explicit generated fallback |
| Optional existing-App binding helper | Yes, compatibility only |
| Repository helper is an OpenAI managed App Template | No |

## Client surfaces

| Surface | Integration path |
| --- | --- |
| Codex / MCP clients with custom remote MCP support | Install plugin + configure the user/workspace HTTPS `/mcp` endpoint + OAuth |
| ChatGPT surface exposing user-configured MCP tools | Use the authenticated user/workspace MCP connection directly |
| ChatGPT surface requiring explicit plugin app dependency | Use a portable platform app/template binding when available, or the legacy existing-connection helper |
| Local development | Generate the localhost variant with `scripts/build_local_variant.py` |

The repository-root plugin is deliberately endpoint-neutral. A neutral example lives at `plugins/gitlab-self-hosted/workspace-binding/.mcp.remote.json.example`; real organization endpoints belong in user/workspace configuration, not in the public plugin.

## Policy layers

Write operations require server policy and, in OAuth mode, `gitlab:write`. Project allowlists remain authoritative. MR merge additionally requires `GITLAB_MERGE_ENABLED=true`. GitLab permissions remain the final authorization layer.

## GitLab targets

- GitLab.com
- GitLab Self-Managed
- GitLab Dedicated

Compatibility depends on the GitLab version and the REST/OAuth endpoints available for each enabled tool.
