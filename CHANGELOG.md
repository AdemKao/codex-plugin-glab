# Changelog

All notable changes to this project will be documented here.

The format is inspired by Keep a Changelog, and plugin versions follow semantic versioning while the project remains in early preview.

## [Unreleased]

### Added

- `SUPPORT.md` and `SUPPORT.zh-TW.md` for support routing and sanitized bug reports.
- English and Traditional Chinese documentation indexes under `docs/`.
- Issue-template configuration with security and documentation contact links.

### Changed

- Reworked README structure around badges, quick start, supported surfaces, architecture, support, and versioning.
- Expanded contribution guidelines with development setup, branch/commit conventions, validation, documentation sync, and PR expectations.
- Expanded the security policy with supported-version guidance, private reporting scope, credential handling, prompt-injection boundaries, and disclosure guidance.
- Structured the Code of Conduct into expectations, scope, enforcement, and reporting sections.
- Extended CI validation to cover core community-health files and bilingual support/documentation index pairs.

### Planned

- Broader GitLab Self-Managed compatibility testing.
- Capability probing for different GitLab MCP versions.
- Plugin evaluation/benchmark fixtures.
- Public Plugin Directory submission materials when the app-binding path is ready for distribution.

## [0.2.0] - 2026-08-23

### Added

- ChatGPT Web integration guide using GitLab's official remote MCP server.
- Codex / ChatGPT Web / ChatGPT mobile capability matrix.
- Workspace app-binding template for `.app.json`.
- `scripts/build_chatgpt_variant.py` to generate an app-bound plugin package without modifying the portable source plugin.
- Git-ignored `dist/` output for workspace-specific plugin variants.

### Changed

- Clarified that GitLab.com does not require this project to host a duplicate MCP server.
- Updated the plugin manifest to v0.2.0 and documented optional ChatGPT app binding.
- Reframed the roadmap around GitLab official MCP + ChatGPT App integration rather than a custom hosted MCP proxy.
- Documented current OpenAI surface/plan constraints, including web-only Custom MCP Apps as of 2026-08-23.

## [0.1.0] - 2026-08-23

### Added

- Marketplace-ready Codex GitLab plugin scaffold.
- GitLab hosted MCP configuration.
- General GitLab, setup, publish, review-feedback, and CI-debugging skills.
- Hybrid MCP + local `git`/`glab` routing.
- English and Traditional Chinese documentation.
- Open-source governance files and plugin validation CI.
