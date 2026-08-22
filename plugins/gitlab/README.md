# GitLab Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

This plugin combines GitLab's hosted MCP server with local `git` and `glab` workflows.

Use MCP first for structured project, issue, merge-request, branch, commit, file, and pipeline data. Use local tools for working-tree changes, commit, and push, or as a fallback when the connected GitLab instance does not expose a required MCP capability.

Main skills:

- `gitlab` — general routing and triage.
- `gitlab-setup` — authentication, host, and capability setup.
- `glab-publish` — branch, stage, test, commit, push, and create MR.
- `glab-address-comments` — address MR feedback and push fixes.
- `glab-fix-ci` — diagnose failed GitLab pipelines/jobs and publish a fix.

The default MCP endpoint is GitLab.com. For Self-Managed, see the repository's `docs/self-managed.md`.
