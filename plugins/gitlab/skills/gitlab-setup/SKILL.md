---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this Codex plugin. Use when authentication fails, the GitLab host is unknown, the user uses GitLab Self-Managed, MCP tools are missing, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege, correct GitLab host and authentication path before repository work.

## Default path: GitLab.com hosted MCP

The bundled `.mcp.json` targets:

`https://gitlab.com/api/v4/mcp`

Prefer Codex's native MCP OAuth login flow for this endpoint. Do not ask the user to paste an access token into chat.

When local CLI access is useful, verify:

```bash
glab auth status
```

If unauthenticated, use:

```bash
glab auth login
```

## Self-Managed

For a Self-Managed host, use that instance's MCP endpoint when available:

`https://<gitlab-host>/api/v4/mcp`

Determine the host from the user's URL or local git remote. Do not silently send private project identifiers to `gitlab.com` when the remote belongs to another host.

If the Self-Managed instance does not expose MCP, use `glab` configured for that host and GitLab REST API fallbacks only for the operations needed by the user.

## Capability probing

GitLab MCP evolves by GitLab version. Do not assume every tool exists. Prefer this sequence:

1. Use available MCP tools when listed by the client.
2. If a required capability is absent, use a documented `glab` command.
3. If `glab` lacks a direct command, use `glab api` against the resolved host.
4. For working-tree changes, use local `git`.

## Credentials and scopes

Prefer OAuth. If a token is necessary for a non-MCP fallback, recommend the minimum scope that supports the requested operation and store it through `glab auth login` or an environment/credential manager; never commit it or echo it.

Read-only work should not require write scopes. Write workflows need enough access for the specific project action, but the plugin must not request owner/admin-level access just for convenience.

## Verification

Before declaring setup complete, verify one harmless read operation against the intended project or account. Do not validate auth by creating or modifying content.
