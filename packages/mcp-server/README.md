# GitLab MCP Server

Self-hosted MCP server used by `codex-plugin-glab` to expose a controlled GitLab REST API surface to ChatGPT, Codex, and other MCP clients.

## Run locally

```bash
cd packages/mcp-server
npm install
GITLAB_TOKEN=your-token npm run dev
```

The safe local default is `http://127.0.0.1:3333/mcp` with write tools disabled.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GITLAB_HOST` | `https://gitlab.com` | GitLab.com or Self-Managed base URL |
| `GITLAB_TOKEN` | required | PAT, project/group token, or OAuth token |
| `GITLAB_TOKEN_TYPE` | `private-token` | `private-token` or `bearer` |
| `GITLAB_ALLOWED_PROJECTS` | empty | Optional comma-separated allowlist of IDs or namespace paths |
| `GITLAB_WRITE_ENABLED` | `false` | Enables issue/MR/branch write tools |
| `GITLAB_MERGE_ENABLED` | `false` | Separately enables MR merge tool |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `MCP_PORT` | `3333` | HTTP port |
| `MCP_PATH` | `/mcp` | MCP endpoint path |
| `MCP_AUTH_TOKEN` | empty | Bearer token protecting the MCP endpoint |
| `MCP_ALLOW_INSECURE_NO_AUTH` | `false` | Explicitly allow an unauthenticated non-loopback endpoint |

For remote deployments, do not expose a server-side GitLab token through an unauthenticated public MCP endpoint. Use `MCP_AUTH_TOKEN` where the client supports custom bearer headers, or place the server behind an OAuth/authentication gateway or a private MCP tunnel supported by the target client.

## Tool groups

Read tools cover the current user, groups, projects, branches, commits, issues, merge requests and diffs, pipelines, jobs, and job traces.

Write tools cover issue create/update/comment, merge-request create/update/comment, branch creation, and merge. Writes are off by default; merge requires a second explicit flag.
