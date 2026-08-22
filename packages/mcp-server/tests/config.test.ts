import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

test("defaults to GitLab.com, loopback, and read-only", () => {
  const config = loadConfig({ GITLAB_TOKEN: "test-token" });
  assert.equal(config.gitlabHost, "https://gitlab.com");
  assert.equal(config.mcpHost, "127.0.0.1");
  assert.equal(config.mcpPort, 3333);
  assert.equal(config.writeEnabled, false);
  assert.equal(config.mergeEnabled, false);
});

test("requires MCP auth when binding publicly", () => {
  assert.throws(
    () => loadConfig({ GITLAB_TOKEN: "test-token", MCP_HOST: "0.0.0.0" }),
    /MCP_AUTH_TOKEN is required/,
  );
});

test("accepts explicit public bearer protection", () => {
  const config = loadConfig({
    GITLAB_TOKEN: "test-token",
    MCP_HOST: "0.0.0.0",
    MCP_AUTH_TOKEN: "mcp-secret",
    GITLAB_WRITE_ENABLED: "true",
    GITLAB_ALLOWED_PROJECTS: "123,group/project",
  });
  assert.equal(config.mcpAuthToken, "mcp-secret");
  assert.equal(config.writeEnabled, true);
  assert.deepEqual([...config.allowedProjects], ["123", "group/project"]);
});
