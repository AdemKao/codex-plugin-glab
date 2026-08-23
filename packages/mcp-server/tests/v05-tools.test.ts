import assert from "node:assert/strict";
import test from "node:test";

import { McpServer } from "@modelcontextprotocol/server";

import { loadConfig } from "../src/config.js";
import { GitLabClient } from "../src/gitlab-client.js";
import { registerGitLabV05Tools } from "../src/register-v05-tools.js";

class RecordingClient extends GitLabClient {
  calls: Array<{ method: string; path: string }> = [];

  override async request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string): Promise<any> {
    this.calls.push({ method, path });
    return { data: { ok: true }, pagination: {} } as T;
  }
}

test("v0.5 GitLab tools register without exposing a generic API proxy", () => {
  const config = loadConfig({ GITLAB_TOKEN: "test-token" });
  const server = new McpServer({ name: "test", version: "0.5.0" }, { capabilities: { tools: {} } });
  const client = new RecordingClient(config);
  registerGitLabV05Tools(server, config, client);
  assert.equal(client.calls.length, 0);
});
