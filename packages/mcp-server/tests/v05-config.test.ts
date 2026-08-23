import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

const key = Buffer.alloc(32, 7).toString("base64");

function oauthEnv(): NodeJS.ProcessEnv {
  return {
    MCP_AUTH_MODE: "oauth",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "gitlab-client",
    GITLAB_OAUTH_CLIENT_SECRET: "gitlab-secret",
    OAUTH_ENCRYPTION_KEY: key,
  };
}

test("v0.5 enables CIMD by default while preserving the file store", () => {
  const config = loadConfig(oauthEnv());
  assert.equal(config.oauth?.storeDriver, "file");
  assert.equal(config.oauth?.cimdEnabled, true);
  assert.equal(config.oauth?.cimdAllowPrivateNetwork, false);
});

test("PostgreSQL OAuth store requires a database URL", () => {
  assert.throws(
    () => loadConfig({ ...oauthEnv(), OAUTH_STORE_DRIVER: "postgres" }),
    /OAUTH_DATABASE_URL is required/,
  );
});

test("PostgreSQL OAuth store accepts multi-replica configuration", () => {
  const config = loadConfig({
    ...oauthEnv(),
    OAUTH_STORE_DRIVER: "postgres",
    OAUTH_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/codex_glab_test",
    OAUTH_CIMD_ALLOWED_HOSTS: "client.example.com,chat.example.com",
  });
  assert.equal(config.oauth?.storeDriver, "postgres");
  assert.equal(config.oauth?.databaseUrl?.includes("codex_glab_test"), true);
  assert.deepEqual([...config.oauth!.cimdAllowedHosts], ["client.example.com", "chat.example.com"]);
});
