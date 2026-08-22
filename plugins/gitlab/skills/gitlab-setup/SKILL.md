---
name: gitlab-setup
description: Configure and troubleshoot GitLab access for this plugin. Use when authentication fails, MCP tools are missing, ChatGPT app binding is needed, the GitLab host is unknown, or glab/git identity and host configuration must be verified.
---

# GitLab Setup

## Goal

Establish the least-privilege GitLab integration path before repository work. From v0.3.0, the primary remote path is the self-hosted MCP server bundled with this repository; GitLab's native MCP is optional, not required.

## Primary backend

Run or deploy `packages/mcp-server` and point the plugin/client to its MCP endpoint.

Local Codex default:

`http://127.0.0.1:3333/mcp`

Remote ChatGPT example:

`https://gitlab-mcp.example.com/mcp`

The MCP server talks to GitLab REST API v4 using the configured `GITLAB_HOST` and GitLab token. It supports GitLab.com and compatible Self-Managed/Dedicated hosts without requiring the GitLab native MCP feature.

## Server configuration

At minimum, configure the server outside chat/source control:

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=<secret-from-secure-store>
GITLAB_TOKEN_TYPE=private-token
```

Do not ask the user to paste a real token into chat. Prefer environment/secret-manager configuration.

Keep the initial deployment read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` when a deployment should be restricted to specific projects.

## Codex path

The bundled `.mcp.json` targets the local self-hosted endpoint at `http://127.0.0.1:3333/mcp`.

Before declaring setup complete:

1. start the MCP server;
2. verify `/healthz`;
3. verify the MCP client can discover GitLab tools;
4. run a harmless read such as `gitlab_get_current_user`, `gitlab_list_groups`, or `gitlab_list_projects`.

For local working-tree tasks, `git` and `glab` remain useful:

```bash
glab auth status
```

Use local `git`/`glab` for working-tree state, commit, push, and explicit capability gaps rather than duplicating those operations in the MCP server.

## ChatGPT path

ChatGPT needs a remote MCP endpoint reachable through the integration mechanism supported by the user's workspace.

1. Deploy the bundled MCP server behind HTTPS.
2. Protect the endpoint. Do not publish a server-side GitLab token behind an unauthenticated public MCP endpoint.
3. Create a ChatGPT Custom MCP App pointing to the deployed `/mcp` URL.
4. Configure the authentication method supported by the deployment/workspace.
5. Scan tools and test harmless reads before enabling writes.
6. If workspace-specific plugin/app packaging is needed, use the real app/connector ID with:

```bash
python3 scripts/build_chatgpt_variant.py --app-id <workspace-app-or-connector-id>
```

Do not add workspace-specific IDs or credentials to the portable source plugin.

ChatGPT plan, workspace-role, and surface support are platform-controlled and can change independently of this repository. Do not infer mobile/web availability from plugin installation alone.

## MCP endpoint authentication

For a non-loopback server bind, the built-in guard expects `MCP_AUTH_TOKEN` unless `MCP_ALLOW_INSECURE_NO_AUTH=true` is explicitly configured.

Only use insecure mode when another trusted authentication boundary already exists, such as a private tunnel or authenticated gateway.

If the target client requires OAuth rather than a fixed bearer, place the MCP server behind an OAuth-capable gateway until per-user OAuth passthrough is implemented in this project.

## GitLab.com / Self-Managed / Dedicated

Resolve the intended GitLab host from the user's GitLab URL, deployment configuration, or local remote. Set:

```bash
GITLAB_HOST=https://<gitlab-host>
```

Do not silently send private project identifiers to `gitlab.com` when the intended remote belongs to another host.

Self-Managed compatibility depends on the GitLab version and REST API endpoints used by each tool. If a capability is absent, fall back to host-aware `glab` / `glab api` only for the specific operation required.

## Optional GitLab native MCP

GitLab's own MCP endpoint may still be used independently when the target GitLab environment supports it and the user deliberately chooses it. It is not the default or a dependency of this repository's v0.3.0 architecture.

## Credentials and scopes

- Use the least-privileged GitLab token needed for enabled tools.
- Read-only deployments should not receive write scopes solely because the binary contains write tools.
- Never commit or print GitLab tokens, MCP auth tokens, OAuth secrets, or other credentials.
- v0.3.0 uses one configured GitLab identity per MCP server; do not treat this as per-user authorization in an untrusted multi-user environment.

## Verification

Before declaring setup complete, verify a harmless read against the intended GitLab account/host. Do not validate authentication by creating, updating, merging, or deleting content.
