# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

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
