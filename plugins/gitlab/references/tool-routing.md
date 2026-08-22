# Tool routing reference

Use this reference when deciding between GitLab MCP, `glab`, `glab api`, and local `git`.

| Task | First choice | Fallback |
| --- | --- | --- |
| List/find projects | GitLab MCP | `glab repo list`, `glab api` |
| Project metadata | GitLab MCP | `glab repo view`, `glab api` |
| Read repository file | GitLab MCP | local checkout, `glab api` |
| Create branch | GitLab MCP when available | local `git switch -c`, GitLab API |
| Inspect commit | GitLab MCP | local `git show` |
| List/create/update issue | GitLab MCP | `glab issue`, `glab api` |
| Issue notes | GitLab MCP | `glab api` |
| List/get/create/update MR | GitLab MCP | `glab mr`, `glab api` |
| MR diffs/commits/notes | GitLab MCP | `glab mr`, `glab api` |
| Review MR | GitLab MCP | local diff + `glab api` |
| Merge MR | GitLab MCP when explicitly requested | `glab mr merge` |
| Pipelines/jobs/logs | GitLab MCP | `glab ci`, `glab api` |
| Modify local files | local editor/Codex | — |
| Stage/commit | local `git` | — |
| Push | local `git` | — |

## Routing rules

- MCP is remote-structured and does not replace local working-tree awareness.
- `glab` is host-aware and is preferred over raw curl for GitLab API fallback.
- `glab api` is the escape hatch for GitLab REST endpoints not exposed by MCP or a direct CLI command.
- For writes, resolve host/project/target first and preserve metadata not requested to change.
- Do not assume a GitLab MCP tool exists solely because a newer GitLab version documents it; use the tools actually exposed by the connected server/client.
