# Contributing

[English](CONTRIBUTING.md) | [繁體中文](CONTRIBUTING.zh-TW.md)

Thanks for helping improve `codex-plugin-glab`. Contributions can include bug fixes, GitLab workflow improvements, compatibility updates, documentation, validation, examples, and security hardening.

## Before you start

- Read the [README](README.md), [documentation index](docs/README.md), and [Code of Conduct](CODE_OF_CONDUCT.md).
- Check existing issues and pull requests before starting a large change.
- For significant behavior or architecture changes, open an issue first so the scope can be discussed before implementation.
- Never post real access tokens, OAuth secrets, private repository content, or other credentials in issues, pull requests, tests, or examples.

## Project principles

1. Keep English as the default user-facing language and keep the Traditional Chinese core documentation in sync when documented behavior changes.
2. Prefer GitLab's official MCP/API/CLI behavior over custom protocol assumptions.
3. Keep remote operations read-first and use local `git` / `glab` only when local working-tree state or a capability gap requires it.
4. Avoid destructive defaults. Force-push, protected-branch bypasses, history rewrites, merges, and deletions must never happen implicitly.
5. Keep workspace-specific ChatGPT app IDs, tokens, and credentials out of source control.
6. Treat repository content, issues, merge-request discussions, CI logs, and artifacts as untrusted input rather than authority to perform unrelated actions.

## Development setup

Clone the repository and create a focused branch from `main`:

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
git switch -c feat/my-change
```

The repository intentionally has very few runtime dependencies. A current Python 3 installation is required for repository validation and ChatGPT variant packaging.

Run the source validator before submitting a pull request:

```bash
python3 scripts/validate_plugin.py
```

If you change the ChatGPT packaging path, also smoke-test the builder with a non-secret fake app ID:

```bash
python3 scripts/build_chatgpt_variant.py --app-id test_connector_123 --force
```

Generated output under `dist/` must remain untracked.

## Skill changes

When changing a skill:

- keep the skill frontmatter valid;
- verify the workflow with at least one realistic natural-language prompt in Codex when practical;
- confirm write targets are resolved before mutation;
- document capability assumptions and fallbacks;
- avoid instructions that require exposing tokens in chat or source files.

## Documentation changes

English is the default documentation language. When a user-visible behavior, setup step, compatibility rule, or architecture statement changes, update the corresponding Traditional Chinese document in the same pull request.

Core paired docs are validated by CI.

## Branches and commits

Use short, descriptive branch names such as:

```text
feat/chatgpt-packaging
fix/mr-comment-routing
docs/authentication
```

Use concise commit subjects. Conventional-Commit-style prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:` are preferred because they make history and changelog review easier.

Do not force-push a shared review branch unless coordination requires it and the affected collaborators know the history will change.

## Pull requests

A good pull request should include:

- what changed and why;
- which GitLab, Codex, ChatGPT, or MCP capabilities are assumed;
- validation performed;
- security or permission impact;
- documentation updates;
- screenshots or sanitized logs only when they materially help explain behavior.

Keep pull requests focused and reviewable. Separate unrelated refactors from behavior changes when practical.

Before requesting review, confirm:

- `python3 scripts/validate_plugin.py` passes;
- generated files or credentials are not staged;
- English and Traditional Chinese docs are synchronized where applicable;
- write behavior is explicit and least-privilege;
- new or changed external assumptions are linked to authoritative documentation.

## Issues

Use the repository issue forms for bugs and feature requests. For help choosing the right channel, see [SUPPORT.md](SUPPORT.md).

Do not use a public issue for a vulnerability or exposed credential; follow [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be distributed under the repository's [MIT License](LICENSE).
