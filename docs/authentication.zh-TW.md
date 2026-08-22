# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

v0.3.0 有兩個彼此獨立的 authentication boundary：MCP client 連你的 server，以及你的 server 連 GitLab。

## 1. MCP client -> self-hosted server

Local loopback server 預設不要求 MCP bearer。

若 bind 到非 loopback address，請設定：

```bash
MCP_AUTH_TOKEN=a-long-random-secret
```

支援 custom HTTP header 的 client 可以送：

```text
Authorization: Bearer <MCP_AUTH_TOKEN>
```

如果目標 client 要求 OAuth 而不是固定 bearer，請在 MCP Server 前加 OAuth-capable gateway，或使用目標 client 支援的 private MCP tunnel。

`MCP_ALLOW_INSECURE_NO_AUTH=true` 會關閉內建 remote-auth guard，只能在外層已經有可信 authentication boundary 時使用。

## 2. MCP server -> GitLab

設定：

```bash
GITLAB_HOST=https://gitlab.com
GITLAB_TOKEN=...
GITLAB_TOKEN_TYPE=private-token
```

`private-token` 會使用 GitLab `PRIVATE-TOKEN` header；`bearer` 會使用 OAuth-compatible `Authorization: Bearer` header。

依 target GitLab instance 與 endpoint 支援狀況，token 可以是 personal、project、group 或 OAuth access token。

請使用已啟用 tools 所需的最小權限。Server binary 裡存在 write tools，不代表 read-only deployment 就必須給 write scope。

## Credential handling

- 不要 commit `.env` 或真實 token。
- 不要把 GitLab token 放到 plugin source、prompt、issue body 或 CI log。
- Credential 外洩後立即 rotation。
- Hosted deployment 建議使用 secret manager。
- Development 與 production 使用不同 credentials。

## v0.3.0 identity model

目前設定的 GitLab token 代表整台 MCP Server 的單一 GitLab identity，適合個人 deployment，或刻意共享 service identity 的 trusted workspace。

目前還不是 multi-user identity mapping。Per-user GitLab OAuth passthrough 會放到後續版本。
