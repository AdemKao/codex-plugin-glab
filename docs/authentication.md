# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.3.0 has two independent authentication boundaries: the MCP client talking to your server, and your server talking to GitLab.

## 1. MCP client -> self-hosted server

For a local loopback server, no MCP bearer is required by default.

For a non-loopback bind, configure:

```bash
MCP_AUTH_TOKEN=a-long-random-secret
```

Clients that support custom HTTP headers can send:

```text
Authorization: Bearer <MCP_AUTH_TOKEN>
```

If your target client expects OAuth instead of a fixed bearer, place the MCP server behind an OAuth-capable gateway or a supported private MCP tunnel.

`MCP_ALLOW_INSECURE_NO_AUTH=true` disables the built-in remote-auth guard and should only be used when a separate trusted authentication boundary already exists.

## 2. MCP server -> GitLab

Set:

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

`private-token` sends GitLab's `PRIVATE-TOKEN` header. `bearer` sends an OAuth-compatible `Authorization: Bearer` header.

Supported token sources can include personal, project, group, or OAuth access tokens as allowed by the target GitLab instance and API endpoint.

Use the least privilege required for the enabled tools. Read-only deployments do not need write-capable scopes merely because write tools exist in the binary.

## Credential handling

- Never commit `.env` or real tokens.
- Never place a GitLab token in plugin source, prompts, issue bodies, or CI logs.
- Rotate a credential immediately if it is exposed.
- Prefer a secret manager in hosted deployments.
- Use separate credentials for development and production.

## v0.3.0 identity model

The configured GitLab token represents one GitLab identity for the whole MCP server. This is appropriate for a personal deployment or a trusted workspace with a deliberately shared service identity.

It is not yet a multi-user identity-mapping system. Per-user GitLab OAuth passthrough is planned for a later release.
