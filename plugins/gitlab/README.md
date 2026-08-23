# GitLab Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

This plugin combines the repository's self-hosted GitLab MCP server with local `git` and `glab` workflows.

Use MCP first for structured project, issue, merge-request, branch, commit, file, and pipeline data. Use local tools for working-tree changes, commit, and push, or as a fallback when the connected GitLab instance does not expose a required MCP capability.

Main skills:

- `gitlab` — general routing and triage.
- `gitlab-setup` — authentication, host, and capability setup.
- `glab-publish` — branch, stage, test, commit, push, and create MR.
- `glab-address-comments` — address MR feedback and push fixes.
- `glab-fix-ci` — diagnose failed GitLab pipelines/jobs and publish a fix.

## Important: Codex MCP vs ChatGPT plugin binding

The portable source plugin keeps `./.mcp.json` pointed at `http://127.0.0.1:3333/mcp` as a same-host Codex fallback.

A remote MCP server that you add and authenticate separately in MCP settings does **not** automatically replace that packaged localhost dependency for `@GitLab` in ChatGPT. To use the ChatGPT plugin with a remote MCP deployment, connect/create the corresponding ChatGPT App/connector first, then build/install the workspace-bound variant with `scripts/build_chatgpt_variant.py`. The generated ChatGPT variant uses the App binding only and removes the source localhost MCP dependency.

See `docs/chatgpt-app.md` for the complete setup and troubleshooting flow.
