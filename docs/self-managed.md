# GitLab Self-Managed / Dedicated

[English](self-managed.md) | [繁體中文](self-managed.zh-TW.md)

The bundled MCP server talks to GitLab REST API v4 and is not tied to `gitlab.com`.

## Configure the host

```bash
GITLAB_HOST=https://gitlab.example.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

`GITLAB_HOST` must be the GitLab base URL, without `/api/v4`; the server adds the API prefix itself.

## Authentication

Use a token type supported by your GitLab instance and the APIs you need. Personal access tokens are the simplest initial setup. Project/group access tokens can reduce scope when the deployment only needs a bounded set of repositories.

For OAuth access tokens, use:

```bash
GITLAB_TOKEN_TYPE=bearer
```

## TLS and private networking

For production, use HTTPS to GitLab and to the MCP endpoint. If your GitLab instance uses an internal CA, configure the Node/container trust store rather than disabling TLS verification.

If GitLab or the MCP server is private/on-premises, place the MCP client connection through a supported private tunnel, VPN, reverse proxy, or gateway instead of making internal services broadly public.

## Version compatibility

The tool layer uses common GitLab REST API v4 endpoints for projects, groups, issues, merge requests, repository branches/commits, and CI pipelines/jobs.

GitLab Self-Managed versions can differ in fields and endpoint behavior. A tool may therefore need a compatibility adjustment even when the base REST API exists. File an issue with the GitLab version and sanitized error response if you find a mismatch.

## Project scoping

For a shared Self-Managed instance, strongly consider an explicit allowlist:

```bash
GITLAB_ALLOWED_PROJECTS=42,team/backend,team/frontend
```

The allowlist is checked before project-level API calls and also filters project discovery results.

## Native GitLab MCP

GitLab's own MCP server can still be used separately when it is available and appropriate, but it is no longer a dependency of this project.
