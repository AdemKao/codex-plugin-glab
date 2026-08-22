# GitLab Self-Managed

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

The bundled MCP config targets GitLab.com. For Self-Managed or Dedicated GitLab, the endpoint is normally:

```text
https://<your-gitlab-host>/api/v4/mcp
```

## Recommended setup

1. Confirm the GitLab instance/version supports and allows the GitLab MCP server.
2. Add the instance MCP server to Codex, or use a development copy of this plugin whose `.mcp.json` points to the instance.
3. Authenticate with Codex MCP OAuth.
4. Configure `glab` for the same host as a fallback:

```bash
glab auth login --hostname gitlab.example.com
glab auth status --hostname gitlab.example.com
```

## When MCP is unavailable

Use `glab` and `glab api` against the resolved Self-Managed host for remote GitLab operations, and local `git` for repository changes/commit/push.

Do not route project names, private repository paths, or credentials to `gitlab.com` merely because the plugin's default MCP endpoint is GitLab.com.

## Compatibility

GitLab MCP capabilities are version-dependent. The skills are intentionally capability-driven: use the MCP tools actually exposed by the connected instance, then fall back rather than assuming a new tool exists.
