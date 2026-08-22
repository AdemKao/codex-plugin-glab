# Support

[English](SUPPORT.md) | [繁體中文](SUPPORT.zh-TW.md)

## Before asking for help

1. Read the [README](README.md) and [documentation index](docs/README.md).
2. Confirm whether the problem is in Codex, ChatGPT, GitLab MCP, `glab`, or this plugin.
3. Run the repository validator when the problem involves a local checkout:

```bash
python3 scripts/validate_plugin.py
```

4. Remove access tokens, OAuth secrets, private repository content, and other sensitive information from logs or screenshots.

## Where to ask

- **Bug in this plugin:** open a bug report using the repository issue template.
- **Feature request:** use the feature-request template.
- **Security vulnerability or exposed credential:** do not open a public issue; follow [SECURITY.md](SECURITY.md).
- **GitLab MCP / GitLab API behavior:** confirm the behavior against GitLab documentation before filing a plugin issue.
- **ChatGPT or Codex product limitation:** confirm the current OpenAI product documentation before filing a plugin issue.

## What to include

When reporting a reproducible problem, include the plugin version or commit, Codex/ChatGPT surface, GitLab offering/version when relevant, the operation you attempted, the expected behavior, the actual behavior, and sanitized reproduction steps.

This project is maintained on a best-effort basis. There is no guaranteed response or resolution time.
