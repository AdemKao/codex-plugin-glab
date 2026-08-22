# Roadmap

[English](roadmap.md) | [繁體中文](roadmap.zh-TW.md)

## v0.1 — foundation

- Codex plugin manifest and marketplace metadata.
- GitLab.com official hosted MCP integration.
- General GitLab routing skill.
- Setup/authentication workflow.
- Commit/push/open-MR workflow.
- MR feedback workflow.
- CI failure workflow.
- English + Traditional Chinese documentation.
- CI validation.

## v0.2 — ChatGPT app integration

- Keep GitLab's official remote MCP server as the backend for GitLab.com.
- Do not build or host a duplicate GitLab MCP proxy.
- Add ChatGPT Web Custom MCP App setup documentation.
- Add a Codex / ChatGPT Web / ChatGPT mobile capability matrix.
- Add a portable `.app.json` binding template without committing a workspace ID.
- Add a builder that creates a workspace-specific app-bound plugin under ignored `dist/`.
- Document current OpenAI plan/surface constraints and the future mobile migration path.

## v0.3 — compatibility, safety, and UX

- Test matrix for current GitLab.com and representative Self-Managed/Dedicated versions.
- Better capability probing and graceful fallback rules.
- Expand issue/MR labels, reviewers, milestones, and work-item guidance.
- Add release/tag workflow.
- Add stronger write-target confirmation helpers for multi-remote repositories.
- Add plugin evaluation/benchmark fixtures.
- Add more CI/pipeline repair scenarios.

## Future — public Plugin Directory distribution

- Prepare a publishable app/plugin package after the target OpenAI distribution flow is stable.
- Add production assets, screenshots, privacy/terms metadata, and submission materials.
- Prefer a portable/templated app binding if OpenAI exposes one for GitLab; otherwise keep workspace-specific app IDs out of source control.
- Re-evaluate ChatGPT mobile support when OpenAI enables Custom MCP Apps on mobile.

The open-source Codex plugin must remain independently useful even when an app-backed ChatGPT distribution is available.
