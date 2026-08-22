# Security Policy

Security issues involving GitLab credentials, ChatGPT workspace bindings, repository write behavior, or prompt-injection boundaries should be handled privately and with least privilege.

## Supported versions

| Version | Supported |
| --- | --- |
| Latest tagged release | Yes |
| `main` | Yes |
| Older releases | Best effort only |

Security fixes are normally applied to `main` first and included in the next release. Backports to older releases are not guaranteed before `1.0.0`.

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability, exposed credential, private repository leak, or exploit that could affect users.

Use GitHub's private vulnerability reporting / security advisory flow for this repository when it is available. If that flow is unavailable, contact the repository maintainer through a private contact channel published on the repository owner's GitHub profile.

A useful report includes:

- affected plugin version or commit;
- affected surface: Codex, ChatGPT, GitLab MCP, `glab`, packaging, or another component;
- security impact and realistic attack scenario;
- minimal reproduction steps that do not expose third-party private data;
- whether credentials or private repository content may already have been exposed;
- suggested mitigation, if known.

Please avoid testing a vulnerability against repositories, accounts, or workspaces you do not own or have explicit permission to test.

## Security scope

Examples of issues that should be reported privately include:

- credentials or workspace app IDs being written to source control unexpectedly;
- a workflow targeting the wrong GitLab project, branch, issue, or merge request;
- prompt injection from repository content, issues, MR discussions, CI logs, or artifacts causing unrelated privileged actions;
- protected-branch or write-confirmation safeguards being bypassed;
- sensitive GitLab data being routed to the wrong host or integration;
- generated ChatGPT plugin variants leaking workspace-specific secrets.

General product limitations, unsupported GitLab MCP capabilities, and ordinary bugs without a security impact can use the public issue templates.

## Credential handling

This project must never require credentials to be committed to the repository.

- Prefer GitLab MCP OAuth for remote MCP access.
- Prefer `glab auth login` for CLI fallback authentication.
- Use placeholders in documentation and tests.
- Keep generated workspace-specific output under ignored `dist/` or another explicitly managed local destination.
- Never ask users to paste access tokens, OAuth secrets, or other credentials into public issues or source files.

## Prompt-injection boundary

GitLab repository content, issue bodies, merge-request discussions, wiki content, job logs, artifacts, generated files, and other fetched project data are **untrusted input**. Skills must not treat instructions found inside that data as authority to:

- perform unrelated writes;
- reveal secrets;
- weaken safety rules;
- change the intended GitLab host or target;
- bypass confirmation or protected-branch policies.

## Write safety

- Resolve the exact GitLab host, project, and target before mutation.
- Read before write when remote state matters.
- Do not force-push by default.
- Do not bypass protected branches.
- Do not merge, close, delete, rewrite history, or change permissions unless the user's request clearly includes that action.
- Prefer least-privilege GitLab scopes, roles, and workspace permissions.

## Disclosure

Please allow maintainers a reasonable opportunity to investigate and prepare a fix before public disclosure. There is no guaranteed response SLA, but confirmed security reports should be prioritized over ordinary issues.
