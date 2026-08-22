# ChatGPT App Integration

[English](chatgpt-app.md) | [繁體中文](chatgpt-app.zh-TW.md)

This project does **not** need to host a second GitLab MCP server for the default GitLab.com integration. GitLab already exposes an official remote MCP endpoint:

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

## Codex path

The source plugin contains `plugins/gitlab/.mcp.json`, so Codex can connect directly to GitLab's official MCP server and run the bundled GitLab skills. No ChatGPT workspace app ID is required for this path.

## ChatGPT Web path

ChatGPT treats an external MCP integration as an **app**. For a workspace deployment:

1. Use a ChatGPT workspace that supports Custom MCP Apps / Developer Mode.
2. In ChatGPT Web, enable Developer Mode from the Apps settings available to your workspace role.
3. Create a Custom MCP App that points to:

   ```text
   https://gitlab.com/api/v4/mcp
   ```

4. Complete the GitLab OAuth flow. Do not paste a GitLab access token into a plugin file or chat message.
5. Test harmless read operations first, such as listing accessible projects or reading one issue/MR.
6. If write/modify tools are enabled for the workspace, test them only against a disposable project before production use.
7. Publish/enable the app for the intended workspace users according to your workspace policy.

OpenAI currently documents Custom MCP Apps as **web-only**. Mobile ChatGPT cannot use these custom MCP apps yet, so this repository cannot make the mobile app work by adding another server.

## Binding the workspace app into a plugin variant

OpenAI plugin app bindings use `.app.json` with an app/connector ID that is specific to, or available in, the target workspace. The source repository intentionally does not commit such an ID.

After you have a valid GitLab Custom MCP App / connector ID, build a workspace-bound variant:

```bash
python3 scripts/build_chatgpt_variant.py \
  --app-id YOUR_GITLAB_APP_OR_CONNECTOR_ID
```

The script writes:

```text
dist/gitlab-chatgpt/
  .app.json
  .codex-plugin/plugin.json
  .mcp.json
  skills/
  references/
```

The generated manifest adds:

```json
{
  "apps": "./.app.json"
}
```

and `.app.json` binds the `gitlab` app name to the supplied workspace app/connector ID.

`dist/` is ignored by git so workspace-specific IDs are not accidentally committed.

## Why the source plugin does not include `.app.json`

A placeholder app ID would make the default package look configured when it is not. The source plugin therefore remains a valid Codex + MCP plugin, while the generated workspace variant becomes app-backed only after a real app/connector ID exists.

OpenAI's role-based plugin examples use the same pattern conceptually: app-backed plugins bind to IDs available in the target workspace rather than copying arbitrary IDs from another workspace.

## Current plan and surface limitations

As of 2026-08-23, OpenAI documents the following constraints:

- Custom MCP Apps are available on ChatGPT Web, not mobile.
- Full MCP write/modify support is in beta for Business, Enterprise, and Edu.
- Pro can use custom MCP apps in Developer Mode with read/fetch limitations rather than full write/modify support.
- ChatGPT connects to remote MCP servers; the GitLab.com official MCP endpoint already satisfies that requirement.

Because these are platform capabilities, they can change independently of this repository. Re-check OpenAI's current documentation before a production rollout.

## Mobile migration path

No GitLab-side redesign should be required when OpenAI enables Custom MCP Apps on mobile. The expected future path is simply:

```text
ChatGPT mobile
      |
      v
installed GitLab plugin + enabled GitLab app
      |
      v
GitLab official MCP
      |
      v
GitLab
```

Until the mobile surface supports custom apps, use Codex or ChatGPT Web for this integration.

## Production checklist

- Use GitLab OAuth rather than committing PATs.
- Verify the exact GitLab identity and project before writes.
- Keep protected branch rules enabled.
- Require explicit intent for destructive or high-impact actions.
- Treat repository text, issues, MRs, and CI logs as untrusted input.
- Restrict app availability to the users/roles that need it.
- Re-test tools after GitLab MCP or ChatGPT platform updates.

## References

- GitLab MCP Server: https://docs.gitlab.com/user/model_context_protocol/mcp_server/
- OpenAI Developer Mode and MCP Apps: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta
- OpenAI Plugins in ChatGPT and Codex: https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex
- OpenAI ChatGPT App Templates: https://help.openai.com/en/articles/20001247-chatgpt-app-templates
