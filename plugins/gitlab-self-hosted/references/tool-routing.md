# Tool routing reference

Use this reference when deciding between the bundled self-hosted GitLab MCP server, `glab`, `glab api`, and local `git`.

| Task | First choice | Fallback |
| --- | --- | --- |
| List/find projects | Bundled GitLab MCP | `glab repo list`, `glab api` |
| Project metadata | Bundled GitLab MCP | `glab repo view`, `glab api` |
| Read repository file | local checkout / documented API fallback | `glab api` |
| Create branch | Bundled GitLab MCP | local `git switch -c`, `glab api` |
| Inspect commits | Bundled GitLab MCP | local `git show` |
| List/create/update issue | Bundled GitLab MCP | `glab issue`, `glab api` |
| Issue notes | Bundled GitLab MCP | `glab api` |
| List/get/create/update MR | Bundled GitLab MCP | `glab mr`, `glab api` |
| MR diffs/notes | Bundled GitLab MCP | `glab mr`, `glab api` |
| Review code changes | MCP MR diffs + local checkout when available | `glab mr`, local diff |
| Merge MR | Bundled GitLab MCP only when explicitly requested and merge policy is enabled | `glab mr merge` |
| Pipelines/jobs/logs | Bundled GitLab MCP | `glab ci`, `glab api` |
| Modify local files | local editor/Codex | — |
| Stage/commit | local `git` | — |
| Push | local `git` | — |

## Routing rules

- "GitLab MCP" in this plugin means the self-hosted server shipped under `packages/mcp-server` unless the user explicitly selected another compatible MCP backend.
- MCP is remote-structured and does not replace local working-tree awareness.
- Use only MCP tools actually exposed by the connected server. v0.3.0 does not yet expose repository-file write or generic API proxy tools.
- `glab` is host-aware and is preferred over raw curl for local GitLab API fallback.
- `glab api` is the escape hatch for a GitLab REST endpoint not exposed by MCP or a direct CLI command, but only when the execution environment actually provides `glab`.
- For writes, resolve host/project/target first, read current state when practical, and preserve metadata not requested to change.
- Respect `GITLAB_ALLOWED_PROJECTS`, `GITLAB_WRITE_ENABLED`, and `GITLAB_MERGE_ENABLED`; do not try to bypass server policy with a fallback simply because an MCP write is denied.
- GitLab native MCP is optional and should not be assumed available.
