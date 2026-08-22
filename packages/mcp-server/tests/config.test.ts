import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

const oauthKey = Buffer.alloc(32, 7).toString("base64");

test("defaults to GitLab.com, loopback, shared-token, and read-only", () => {
  const config = loadConfig({ GITLAB_TOKEN: "test-token" });
  assert.equal(config.gitlabHost, "https://gitlab.com");
  assert.equal(config.mcpHost, "127.0.0.1");
  assert.equal(config.mcpPort, 3333);
  assert.equal(config.authMode, "shared-token");
  assert.equal(config.writeEnabled, false);
  assert.equal(config.mergeEnabled, false);
});

test("requires MCP auth when shared-token mode binds publicly", () => {
  assert.throws(
    () => loadConfig({ GITLAB_TOKEN: "test-token", MCP_HOST: "0.0.0.0" }),
    /MCP_AUTH_TOKEN is required/,
  );
});

test("accepts explicit public bearer protection in shared-token mode", () => {
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

test("oauth mode uses per-user GitLab credentials and does not require GITLAB_TOKEN", () => {
  const config = loadConfig({
    MCP_AUTH_MODE: "oauth",
    MCP_HOST: "0.0.0.0",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "gitlab-client",
    GITLAB_OAUTH_CLIENT_SECRET: "gitlab-secret",
    OAUTH_ENCRYPTION_KEY: oauthKey,
  });
  assert.equal(config.authMode, "oauth");
  assert.equal(config.gitlabToken, undefined);
  assert.equal(config.oauth?.publicBaseUrl, "https://mcp.example.com");
  assert.equal(config.oauth?.encryptionKey.length, 32);
  assert.equal(config.oauth?.dcrEnabled, true);
});

test("oauth mode rejects non-HTTPS public origins", () => {
  assert.throws(
    () =>
      loadConfig({
        MCP_AUTH_MODE: "oauth",
        PUBLIC_BASE_URL: "http://mcp.example.com",
        GITLAB_OAUTH_CLIENT_ID: "gitlab-client",
        GITLAB_OAUTH_CLIENT_SECRET: "gitlab-secret",
        OAUTH_ENCRYPTION_KEY: oauthKey,
      }),
    /PUBLIC_BASE_URL must use https/,
  );
});

test("oauth mode requires exactly a 32-byte encryption key", () => {
  assert.throws(
    () =>
      loadConfig({
        MCP_AUTH_MODE: "oauth",
        PUBLIC_BASE_URL: "https://mcp.example.com",
        GITLAB_OAUTH_CLIENT_ID: "gitlab-client",
        GITLAB_OAUTH_CLIENT_SECRET: "gitlab-secret",
        OAUTH_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64"),
      }),
    /exactly 32 bytes/,
  );
});
