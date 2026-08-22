# Capability Matrix

[English](capability-matrix.md) | [繁體中文](capability-matrix.zh-TW.md)

This matrix separates what this repository can implement from what the OpenAI and GitLab platforms currently expose.

> Snapshot date: **2026-08-23**. Re-check platform documentation before relying on this matrix for production decisions.

| Capability | Codex + source plugin | ChatGPT Web + Custom MCP App | ChatGPT mobile |
| --- | --- | --- | --- |
| Install/use GitLab workflow skills | Yes | Yes when distributed as a plugin for the workspace | Platform-dependent |
| Connect to GitLab official remote MCP | Yes via bundled `.mcp.json` | Yes via Custom MCP App | No custom MCP apps currently |
| GitLab OAuth | Yes through MCP client flow | Yes through Custom MCP App flow | Not available for custom MCP apps currently |
| Read projects/repositories | Yes, subject to GitLab MCP/version access | Yes | Not through this custom app path currently |
| Read issues/MRs | Yes | Yes | Not through this custom app path currently |
| Create/update issues/MRs | MCP when exposed; `glab` fallback in local Codex workflows | Full MCP write requires an eligible workspace/plan and enabled tools | Not through this custom app path currently |
| Inspect pipelines/jobs | Yes | Yes when tools are exposed | Not through this custom app path currently |
| Modify local working tree | Yes, local Codex environment | No remote ChatGPT working tree by default | No |
| `git add` / local commit | Yes | No, unless another execution environment is explicitly connected | No |
| `git push` from local checkout | Yes | No local checkout by default; use GitLab MCP write tools where available | No |
| Bind workspace app into plugin | Optional generated variant | Yes, using a real workspace app/connector ID | Binding may exist, but custom MCP app invocation is currently unsupported on mobile |

## Plan notes

Current OpenAI documentation says:

- Full MCP, including write/modify actions, is rolling out in beta to Business, Enterprise, and Edu.
- Pro users can use custom MCP apps in Developer Mode with read/fetch limitations rather than full write/modify support.
- Custom MCP Apps are currently web-only.

These limits belong to ChatGPT, not to GitLab or this repository.

## Backend ownership

| Layer | Owner |
| --- | --- |
| GitLab API | GitLab |
| GitLab official MCP server | GitLab |
| OAuth handled by the GitLab MCP integration | GitLab / MCP client flow |
| GitLab workflow skills | `codex-plugin-glab` |
| Local commit/push fallback | Codex environment + `git` / `glab` |
| ChatGPT workspace app registration | ChatGPT workspace admin / OpenAI platform |
| Mobile support for Custom MCP Apps | OpenAI platform |

## Implication

Hosting a second MCP server does not solve the current ChatGPT mobile limitation. The most maintainable architecture is to use GitLab's official MCP server and keep this repository focused on workflow skills, safe routing, packaging, validation, and app binding.
