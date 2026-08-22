# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

## Preferred: MCP OAuth

For GitLab.com, the plugin points to `https://gitlab.com/api/v4/mcp`. Use Codex's MCP login flow and approve only the access needed for your GitLab account/namespace.

The plugin does not store a token in the repository.

## CLI fallback

Install and authenticate GitLab CLI:

```bash
glab auth login
glab auth status
```

`glab` is preferred over copying a personal access token into shell history or project files.

## Tokens

If a specific Self-Managed or automation use case requires a personal/project/group access token, use the minimum scope needed by that workflow and store it in GitLab CLI or a credential manager/environment secret. Never commit it.

Typical read-only tasks should stay read-only. Do not grant `api` write access just to read repositories.

## Multi-account / multi-host

`glab` can manage host-specific authentication. Skills should derive the intended host from the GitLab URL or the current git remote and must not silently reuse GitLab.com credentials for a Self-Managed target.
