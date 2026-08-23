# GitLab Self-Hosted Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

Plugin reference:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

## Remote-first setup

This public plugin is endpoint-neutral. It packages GitLab workflow skills but deliberately does not commit an automatically loaded remote MCP URL, a maintainer-specific MCP hostname, or a private ChatGPT App/connection ID.

For normal use, configure a **user-configured remote HTTPS** MCP endpoint in ChatGPT, Codex, or the MCP client that will expose the GitLab tools, for example:

```text
https://gitlab-mcp.example.com/mcp
```

Then complete OAuth and verify a harmless read.

You do not need to run the MCP server on your laptop, generate a remote build variant, or maintain a second repository for this normal path. The MCP server may be deployed from the same `codex-plugin-glab` repository on any reachable HTTPS host.

## Why the public plugin does not contain `.mcp.json`

Agent Plugin HTTP MCP configuration uses a literal absolute URL. A placeholder such as `${GITLAB_MCP_URL}` is not an install-time URL substitution mechanism. Committing `.mcp.json` would therefore either hard-code one operator's endpoint or point every installation at a non-functional placeholder.

The neutral reference file is:

```text
workspace-binding/.mcp.remote.json.example
```

Copy its shape when configuring your own MCP client, but keep the real organization endpoint outside the public source plugin.

## ChatGPT binding limitation

An authenticated MCP App/connection and a plugin package are separate objects. If a ChatGPT surface requires an explicit app dependency for plugin-backed tools, the endpoint-neutral plugin cannot dynamically discover an arbitrary workspace connection technical ID.

Where direct custom MCP tools are exposed by the client, use the user/workspace connection directly. Managed workspaces can use a platform App Template when an appropriate template is available. The repository's legacy `build_chatgpt_variant.py` helper remains only for environments that explicitly require binding to an existing technical ID.

## Local development fallback

`localhost` remains intentionally separate from the public package:

```bash
python3 ../../scripts/build_local_variant.py
```

The generated local development marketplace binds:

```text
http://127.0.0.1:3333/mcp
```

The root marketplace never chooses localhost implicitly.

## Security

Start the MCP deployment read-only:

```bash
GITLAB_WRITE_ENABLED=false
GITLAB_MERGE_ENABLED=false
```

Use `GITLAB_ALLOWED_PROJECTS` for project restrictions. In OAuth mode, write actions also require `gitlab:write`.

Do not commit GitLab PATs, OAuth secrets, organization-specific MCP URLs, or workspace-specific App/connection IDs into this plugin.

## Validation

From the repository root:

```bash
python3 scripts/validate_plugin.py
python3 scripts/validate_oauth.py
python3 scripts/validate_chatgpt_binding.py
python3 scripts/validate_public_config.py
```

`validate_public_config.py` fails if public setup content contains a real non-example `/mcp` endpoint.
