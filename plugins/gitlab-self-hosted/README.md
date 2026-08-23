# GitLab Self-Hosted Codex Plugin

[English](README.md) | [繁體中文](README.zh-TW.md)

This plugin combines GitLab MCP workflows with local `git` / `glab` workflows when local working-tree operations are needed.

Main skills:

- `gitlab` — general routing and triage.
- `gitlab-setup` — authentication, host, and capability setup.
- `glab-publish` — branch, test, commit, push, and create MR.
- `glab-address-comments` — address MR feedback and push fixes.
- `glab-fix-ci` — diagnose failed GitLab pipelines/jobs and publish a fix.

## Default package

Use:

```text
gitlab-self-hosted@ademkao-codex-plugins
```

The repository-root package directly loads `./.mcp.json`, which points to:

```text
https://gitlab-mcp.blacmarcs.com/mcp
```

This is the normal ChatGPT/Codex path. Install the root marketplace and complete OAuth when prompted. No local MCP process, generated marketplace variant, second repository, or ChatGPT connection technical ID is required for the default flow.

The generic `gitlab` identifier is intentionally not used because it can collide with OpenAI's curated GitLab integration.

## OAuth

The hosted endpoint uses remote HTTPS MCP + OAuth. The client follows MCP OAuth discovery, opens the authorization flow, and the user authorizes their own GitLab identity.

Start with a harmless read such as:

```text
List the GitLab groups and projects I can access.
```

Never ask users to paste a GitLab PAT into chat.

## Local development fallback

For development with an MCP server intentionally running on the same machine:

```bash
python3 scripts/build_local_variant.py
```

Use the generated package:

```text
gitlab-self-hosted@ademkao-gitlab-local
```

It overrides the hosted source binding with:

```text
http://127.0.0.1:3333/mcp
```

The localhost path is a development fallback only.

## Optional custom remote endpoint

The default root package already uses the hosted endpoint. Operators who need another public HTTPS MCP deployment can still use:

```bash
python3 scripts/build_personal_variant.py \
  --mcp-url https://gitlab-mcp.example.com/mcp
```

This helper creates an explicit custom-remote override. Normal users do not need it.

## Optional ChatGPT App binding

`scripts/build_chatgpt_variant.py` remains available for a workspace that explicitly wants to bind the plugin to an existing ChatGPT MCP App/connection technical ID. That generated artifact removes the direct `mcpServers` binding and uses `.app.json` instead.

This helper is not required for root installation and is not an OpenAI managed App Template.

See `docs/chatgpt-app.md` for the full setup and troubleshooting model.
