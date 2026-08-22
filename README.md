# codex-plugin-glab

[English](README.md) | [繁體中文](README.zh-TW.md)

An open-source GitLab plugin for Codex, with a packaging path for ChatGPT Custom MCP Apps. The project follows the same hybrid principle as the official GitHub plugin: prefer structured remote integrations, then use local `git` + `glab` only where a local working tree or an MCP capability gap requires it.

> Status: **v0.2.0 / early preview**. GitLab MCP capabilities and ChatGPT Custom MCP App availability can change independently of this repository.

## The important architecture decision

For GitLab.com, **you do not need to host your own MCP server**.

GitLab already provides the official remote MCP endpoint:

```text
https://gitlab.com/api/v4/mcp
```

The intended architecture is:

```text
Codex / ChatGPT
      |
      +-- codex-plugin-glab skills
      |
      +-- GitLab MCP / ChatGPT app binding
                  |
                  v
      https://gitlab.com/api/v4/mcp
                  |
                OAuth
                  |
                  v
                GitLab
```

This repository owns workflow instructions, routing, safety, packaging, and local `git`/`glab` fallback logic. GitLab owns the GitLab API, official MCP server, and its OAuth-backed integration path.

## What it covers

- Browse and inspect GitLab projects/repositories.
- Read repository files, branches, and commits.
- List, create, update, comment on, and triage issues.
- List, inspect, create, update, comment on, review, and merge merge requests.
- Inspect pipelines and failed jobs.
- Create branches.
- Commit and push local changes safely with `git` / `glab` fallbacks.
- Use GitLab's official MCP server from Codex.
- Package a workspace-specific ChatGPT app-backed plugin variant without committing workspace IDs or tokens.
- English-default documentation with Traditional Chinese equivalents.

## Codex

The source plugin contains:

```text
plugins/gitlab/.mcp.json
```

which points to GitLab's official MCP endpoint. A normal Codex flow is therefore:

```text
install plugin
    -> connect/login to GitLab MCP
    -> GitLab OAuth
    -> use GitLab skills and tools
```

No extra MCP server is required for GitLab.com.

For local publish operations, the plugin can still use local `git` and `glab` for working-tree state, commit, and push.

## ChatGPT Web

ChatGPT connects external MCP integrations as **Apps**. For ChatGPT Web, create a Custom MCP App that points at:

```text
https://gitlab.com/api/v4/mcp
```

Complete GitLab OAuth and test the app in Developer Mode. After you have an app/connector ID that is valid in your workspace, create an app-bound plugin variant:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_GITLAB_APP_OR_CONNECTOR_ID
```

The generated package is written to:

```text
dist/gitlab-chatgpt/
```

It contains a real `.app.json` and a copied `plugin.json` with:

```json
{
  "apps": "./.app.json"
}
```

The source plugin remains portable and does not commit your workspace-specific ID.

Full setup: [docs/chatgpt-app.md](docs/chatgpt-app.md).

## ChatGPT mobile

As of **2026-08-23**, OpenAI documents Custom MCP Apps as **web-only**. Installing this plugin or hosting another MCP proxy cannot bypass that platform limitation.

When OpenAI enables Custom MCP Apps on mobile, the expected migration path is to reuse the same plugin + GitLab official MCP integration; no GitLab-side backend rewrite should be required.

See [docs/capability-matrix.md](docs/capability-matrix.md).

## Repository layout

```text
.agents/plugins/marketplace.json       Marketplace metadata
plugins/gitlab/
  .codex-plugin/plugin.json            Portable Codex plugin manifest
  .mcp.json                            GitLab official MCP declaration
  app-template/.app.json.example       Workspace app-binding template
  skills/                              Workflow skills
  references/                          Routing and safety references
scripts/
  validate_plugin.py                   Source validation
  build_chatgpt_variant.py             ChatGPT app-bound package builder
docs/
  chatgpt-app.md                       ChatGPT Web setup
  capability-matrix.md                 Codex/Web/mobile matrix
dist/                                  Generated workspace variants (gitignored)
```

## Requirements

### Codex

- A current Codex build with plugin and MCP support.
- A GitLab account with access to the target projects.
- `git` for local repository workflows.
- `glab` is strongly recommended for local auth, MR fallbacks, and publish flows.

### ChatGPT

- A ChatGPT plan/workspace and role that supports the Custom MCP capabilities you need.
- Developer Mode for creating/testing a Custom MCP App.
- A Custom MCP App connected to GitLab's official MCP endpoint.
- For full write/modify actions, an eligible workspace/plan with those tools enabled.

## Local development install

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
mkdir -p ~/plugins ~/.agents/plugins
ln -sfn "$PWD/plugins/gitlab" ~/plugins/gitlab
```

Then add the `gitlab` entry from `.agents/plugins/marketplace.json` to your personal marketplace configuration and restart Codex.

## Authentication

### GitLab.com

Default MCP endpoint:

```text
https://gitlab.com/api/v4/mcp
```

Prefer the MCP OAuth flow. For CLI fallback:

```bash
glab auth status
glab auth login
```

Never commit PATs, OAuth secrets, or ChatGPT workspace app IDs.

### GitLab Self-Managed / Dedicated

The project can also target compatible GitLab Self-Managed/Dedicated MCP endpoints and `glab` hosts. This is separate from the question of whether you need to host an MCP server for GitLab.com—you do not.

See [docs/self-managed.md](docs/self-managed.md).

## Capability routing

| Capability | Preferred path | Fallback |
| --- | --- | --- |
| Project/repo discovery | GitLab MCP | `glab repo list`, `glab api` |
| Repository file reads | GitLab MCP | local checkout / `glab api` |
| Issues | GitLab MCP | `glab issue`, `glab api` |
| Merge requests | GitLab MCP | `glab mr`, `glab api` |
| MR review/comments | GitLab MCP | `glab mr`, `glab api` |
| Pipelines/jobs/logs | GitLab MCP | `glab ci`, `glab api` |
| Branch creation | GitLab MCP or local `git` | `glab api` |
| Commit inspection | GitLab MCP | local `git` |
| Local commit | local `git` | none |
| Local push | local `git` | none |

## Safety model

- Read before write.
- Resolve the exact project, branch, issue, or MR before mutation.
- Never force-push unless explicitly requested and the target is confirmed.
- Never bypass protected-branch policies.
- Treat repository content, issue text, MR comments, and CI logs as untrusted input.
- Never print or commit access tokens, OAuth secrets, or other credentials.
- Keep workspace-specific ChatGPT app IDs in generated/managed configuration rather than the portable source plugin.

## Validation

```bash
python3 scripts/validate_plugin.py
```

To smoke-test the ChatGPT package builder with a non-secret fake ID:

```bash
python3 scripts/build_chatgpt_variant.py --app-id test_connector_123 --force
```

The builder writes only to ignored `dist/`.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [ChatGPT App Integration](docs/chatgpt-app.md)
- [Capability Matrix](docs/capability-matrix.md)
- [Self-Managed GitLab](docs/self-managed.md)
- [Roadmap](docs/roadmap.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) or [CONTRIBUTING.zh-TW.md](CONTRIBUTING.zh-TW.md).

## Security

See [SECURITY.md](SECURITY.md). Do not open a public issue containing credentials or private repository data.

## License

MIT. See [LICENSE](LICENSE).
