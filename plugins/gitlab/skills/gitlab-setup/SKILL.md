---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, ChatGPT app binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege, correct GitLab integration path before repository work. Distinguish between the portable Codex plugin path and the ChatGPT workspace app path.

## GitLab.com backend

For GitLab.com, do not propose building or hosting a duplicate MCP server. GitLab already exposes the official remote MCP endpoint:

`https://gitlab.com/api/v4/mcp`

Use that server unless the user explicitly has a different GitLab offering/instance.

## Codex path

The bundled `.mcp.json` targets GitLab's official MCP endpoint. Prefer Codex's native MCP OAuth login flow. Do not ask the user to paste an access token into chat.

When local CLI access is useful, verify:

```bash
glab auth status
```

If unauthenticated, use:

```bash
glab auth login
```

Codex may use local `git`/`glab` for working-tree state, commit, push, and MCP capability gaps.

## ChatGPT Web path

ChatGPT uses an MCP integration as an App. When the user wants ChatGPT integration:

1. Confirm they are using a ChatGPT surface/plan/workspace that supports the required Custom MCP App capability.
2. Use ChatGPT Web Developer Mode to create a Custom MCP App pointing to `https://gitlab.com/api/v4/mcp`.
3. Complete GitLab OAuth through the app flow. Never request PATs or OAuth secrets in chat.
4. Verify harmless read operations first.
5. If write/modify tools are enabled, test them in a disposable GitLab project before production use.
6. If a plugin/app binding is needed, use the workspace's real app/connector ID to build a generated plugin variant:

```bash
python3 scripts/build_chatgpt_variant.py --app-id <workspace-app-or-connector-id>
```

Do not add a workspace-specific ID to the portable source plugin.

As of 2026-08-23, Custom MCP Apps are web-only in ChatGPT. Do not imply that installing this plugin or hosting another proxy will enable the ChatGPT mobile app.

## App binding rules

- Source `plugins/gitlab/.codex-plugin/plugin.json` intentionally has no `apps` field.
- Source `plugins/gitlab/app-template/.app.json.example` is documentation/template material only.
- A generated ChatGPT-bound variant contains `.app.json` plus `apps: "./.app.json"` in its copied manifest.
- Generated variants belong under ignored `dist/` or another workspace-managed location.
- App/connector IDs are identifiers, not GitLab credentials, but they can still be workspace-specific and should not be baked into the public source package without a documented portable registry guarantee.

## Self-Managed / Dedicated

For a compatible Self-Managed or Dedicated host, use that instance's MCP endpoint when available:

`https://<gitlab-host>/api/v4/mcp`

Determine the host from the user's URL or local git remote. Do not silently send private project identifiers to `gitlab.com` when the remote belongs to another host.

If the instance does not expose MCP, use `glab` configured for that host and GitLab REST API fallbacks only for the operations needed by the user.

## Capability probing

GitLab MCP evolves by GitLab version. Do not assume every tool exists. Prefer this sequence:

1. Use available MCP tools when listed by the client.
2. If a required capability is absent in a local Codex workflow, use a documented `glab` command.
3. If `glab` lacks a direct command, use `glab api` against the resolved host.
4. For working-tree changes, use local `git`.
5. In ChatGPT, do not pretend local `git`/`glab` exists unless an execution environment providing it is actually connected.

## Credentials and scopes

Prefer OAuth. If a token is necessary for a non-MCP fallback, recommend the minimum scope needed and store it through `glab auth login` or an environment/credential manager; never commit it or echo it.

Read-only work should not require write scopes. Write workflows need enough access for the specific project action, but the plugin must not request owner/admin-level access just for convenience.

## Verification

Before declaring setup complete, verify one harmless read operation against the intended GitLab account/project. Do not validate authentication by creating or modifying content.
