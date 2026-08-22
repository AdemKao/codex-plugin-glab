# Contributing

[English](CONTRIBUTING.md) | [繁體中文](CONTRIBUTING.zh-TW.md)

Thanks for helping improve codex-plugin-glab.

## Principles

1. Keep the default user-facing language English; add or update Traditional Chinese documentation when a change affects documented behavior.
2. Prefer GitLab's official MCP/API/CLI behavior over custom protocol assumptions.
3. Keep connector/MCP operations read-first and use local `git`/`glab` only where it adds needed capability.
4. Do not add credential examples containing real tokens.
5. Avoid destructive defaults. Force-push, protected-branch bypasses, and irreversible operations must never be automatic.

## Development

Fork or branch from `main`, make focused changes, then run:

```bash
python3 scripts/validate_plugin.py
```

If you change a skill, test at least one natural-language prompt for the changed workflow in Codex.

## Pull requests

Include:

- what changed and why;
- which GitLab/Codex versions or features are assumed;
- validation performed;
- security or permission impact;
- English and Traditional Chinese documentation updates when applicable.

Keep PRs small enough to review. Large behavior changes should start with an issue or design discussion.
