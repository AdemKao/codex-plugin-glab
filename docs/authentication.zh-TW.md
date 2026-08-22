# Authentication

[English](authentication.md) | [繁體中文](authentication.zh-TW.md)

## 優先：MCP OAuth

GitLab.com 預設 endpoint 為 `https://gitlab.com/api/v4/mcp`。使用 Codex MCP login flow，只授權實際需要的 GitLab account / namespace 權限。

Plugin 不會把 token 存在 repository。

## CLI fallback

安裝並登入 GitLab CLI：

```bash
glab auth login
glab auth status
```

優先使用 `glab`，不要把 personal access token 放進 shell history 或 project file。

## Token

若特定 Self-Managed 或 automation 情境必須使用 personal/project/group access token，應採最小必要 scope，並存放於 GitLab CLI、credential manager 或 environment secret，不可 commit。

純讀取需求就維持 read-only；不要只是為了讀 repo 就給 `api` write access。

## 多帳號 / 多 host

`glab` 可管理不同 host 的 auth。Skills 必須從 GitLab URL 或目前 git remote 判斷目標 host，不可把 GitLab.com credential 默認套用到 Self-Managed。
