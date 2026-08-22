# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

ChatGPT must connect to a **remote MCP endpoint**. For v0.3.0, deploy the bundled MCP server and use that endpoint instead of GitLab's native MCP server.

## Flow

```text
ChatGPT Custom MCP App
        |
        | HTTPS / MCP
        v
https://gitlab-mcp.example.com/mcp
        |
        | GitLab REST API v4
        v
GitLab.com / Self-Managed
```

## 1. Deploy the MCP server

Use the root Dockerfile or another Node-compatible deployment platform.

Required server-side GitLab settings:

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

Keep writes disabled until you intentionally need them:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Expose the MCP route through HTTPS, for example:

```text
https://gitlab-mcp.example.com/mcp
```

`/healthz` is available for infrastructure health checks.

## 2. Protect the remote endpoint

Do not publish a server that contains a GitLab token without an authentication boundary.

The built-in server supports `MCP_AUTH_TOKEN` for clients that can provide a fixed Authorization bearer header. If the ChatGPT app configuration available to your workspace expects OAuth, place the MCP server behind an OAuth-capable gateway or use a supported secure/private MCP tunnel.

Only set `MCP_ALLOW_INSECURE_NO_AUTH=true` when another trusted layer already authenticates access to the endpoint.

## 3. Create the ChatGPT Custom MCP App

In a ChatGPT workspace that supports custom MCP apps:

1. Enable Developer Mode if required by the workspace.
2. Create a new custom app.
3. Enter your deployed MCP URL, not the GitLab API URL.
4. Configure the authentication mechanism supported by your deployment.
5. Scan tools.
6. Create/enable the app.
7. Open a new chat and select the app.

A useful smoke test is:

```text
List the GitLab groups and projects I can access.
```

The expected tools are provided by this repository's MCP server, such as `gitlab_list_groups` and `gitlab_list_projects`.

## ChatGPT plan and surface support

OpenAI controls which plans, workspace roles, and ChatGPT surfaces can create or use full custom MCP apps. These rules can change independently of this project. Check current OpenAI documentation when setting up a workspace.

## Current v0.3.0 identity limitation

The MCP server uses one configured GitLab token for all requests. It is suitable for a personal deployment or a trusted workspace using a deliberate service identity.

Do not use one shared server-side token as a substitute for per-user authorization in an untrusted multi-user environment. Per-user GitLab OAuth passthrough is planned for a later release.

## Plugin packaging

The existing `scripts/build_chatgpt_variant.py` helper remains available for workspace-specific plugin/app packaging where applicable. The actual GitLab data path in v0.3.0 is the self-hosted MCP server.
