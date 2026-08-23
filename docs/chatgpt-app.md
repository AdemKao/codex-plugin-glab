# ChatGPT / Codex Remote MCP Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

## Recommended path

For normal ChatGPT/Codex use, install the repository marketplace root and use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The installed plugin directly loads its committed MCP binding:

```text
plugins/gitlab-self-hosted/.mcp.json
  -> https://gitlab-mcp.blacmarcs.com/mcp
```

The transport is remote HTTPS MCP. Authentication is handled by the MCP server's OAuth discovery and GitLab authorization flow.

There is no normal-user requirement to:

- start the MCP server on the user's computer;
- manually add a separate localhost MCP server;
- run `build_personal_variant.py` or `build_chatgpt_variant.py`;
- maintain another marketplace repository; or
- obtain a ChatGPT MCP App/connection technical ID.

## Installation and authentication flow

```text
GitHub marketplace root
  -> GitLab Self-Hosted plugin
  -> .codex-plugin/plugin.json
  -> mcpServers: "./.mcp.json"
  -> https://gitlab-mcp.blacmarcs.com/mcp
  -> OAuth discovery
  -> GitLab OAuth authorization
  -> GitLab REST API v4
```

After installation, select or invoke **GitLab Self-Hosted**. If the client has no MCP OAuth session yet, it should follow the server's discovery metadata and present authentication.

A first smoke test should be read-only:

```text
List the GitLab groups and projects I can access.
```

Do not validate the initial connection by creating, merging, cancelling, or deleting content.

## What OAuth discovery looks like

In OAuth mode, an unauthenticated request to `/mcp` returns `401` with a `WWW-Authenticate` challenge that points to Protected Resource Metadata. The server also exposes Authorization Server Metadata and supports CIMD, with DCR retained for compatibility.

Relevant endpoints include:

```text
https://gitlab-mcp.blacmarcs.com/.well-known/oauth-protected-resource
https://gitlab-mcp.blacmarcs.com/.well-known/oauth-authorization-server
https://gitlab-mcp.blacmarcs.com/oauth/register
https://gitlab-mcp.blacmarcs.com/oauth/authorize
https://gitlab-mcp.blacmarcs.com/oauth/token
https://gitlab-mcp.blacmarcs.com/oauth/gitlab/callback
https://gitlab-mcp.blacmarcs.com/mcp
```

The MCP/OAuth server handles GitLab credentials. Users should not paste GitLab PATs into prompts.

## Package identity

The package identifier is:

```text
gitlab-self-hosted
```

The old generic `gitlab@ademkao-codex-plugins` reference should not be used because the generic identifier can collide with OpenAI's curated GitLab integration.

## Localhost fallback for development

Localhost is intentionally retained only for development or same-host testing.

Generate the local override:

```bash
python3 scripts/build_local_variant.py
```

Then use:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

That generated plugin keeps the direct MCP binding but replaces the hosted URL with:

```text
http://127.0.0.1:3333/mcp
```

The repository root remains bound to `https://gitlab-mcp.blacmarcs.com/mcp`.

## Custom remote endpoint override

Operators who want a different public HTTPS deployment can optionally generate a custom remote marketplace:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

This is not required to use the hosted default. It simply replaces the copied `.mcp.json` URL after validating that the endpoint is an acceptable public HTTPS `/mcp` URL.

## Optional existing-App / connection binding

Some managed workspaces may deliberately prefer an existing ChatGPT MCP App/connection binding rather than a direct `mcpServers` dependency. The repository keeps `scripts/build_chatgpt_variant.py` for that explicit compatibility case.

Example:

```bash
python3 scripts/build_chatgpt_variant.py \
  --connection-id YOUR_EXISTING_MCP_CONNECTION_TECHNICAL_ID \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

`--app-id` remains a backwards-compatible alias for `--connection-id`.

The generated plugin:

- removes the source `mcpServers` entry;
- removes the copied source `.mcp.json`;
- adds `apps: "./.app.json"`;
- records the existing connection technical ID; and
- does not create the connection or perform OAuth itself.

This helper is **not needed** for normal root installs and is **not** an OpenAI managed App Template.

## Troubleshooting

### Plugin is visible, but GitLab tools are missing

Check these in order:

1. Confirm the installed reference is `gitlab-self-hosted@ademkao-codex-plugins` rather than the collision-prone generic `gitlab` package.
2. Confirm the installed source is the repository-root package and its manifest loads `mcpServers: "./.mcp.json"`.
3. Confirm `.mcp.json` points to `https://gitlab-mcp.blacmarcs.com/mcp`.
4. Re-open authentication if the client reports that the MCP server requires OAuth.
5. Verify a harmless read after authentication.

For a normal root install, do not troubleshoot by creating a second generated marketplace or by pointing the plugin at localhost.

### You intentionally installed the local variant

Confirm the MCP server is actually listening at:

```text
http://127.0.0.1:3333/mcp
```

The local variant cannot reach a server running only on another machine.

### You intentionally installed an App-bound generated variant

Then the direct root MCP rules no longer apply. Verify the generated `.app.json` technical ID and the underlying ChatGPT MCP connection separately.

## Read and write policy

Hosted or self-managed servers should start read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Write operations require deployment policy, OAuth `gitlab:write`, project allowlists where configured, and GitLab permissions. Merge operations additionally require the merge safety flag.

## Product surface note

OpenAI controls product UI labels, plan/workspace availability, and how MCP authentication is presented. Those surfaces can change independently from this repository. The repository invariant is simpler: the root `GitLab Self-Hosted` package carries a direct HTTPS MCP binding to `https://gitlab-mcp.blacmarcs.com/mcp`; the client is expected to use the server's OAuth discovery when authentication is required.
