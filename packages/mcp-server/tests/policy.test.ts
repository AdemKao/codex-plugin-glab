import assert from "node:assert/strict";
import test from "node:test";

import type { ServerConfig } from "../src/config.js";
import {
  assertMergeEnabled,
  assertProjectAllowed,
  assertWriteEnabled,
} from "../src/policy.js";

function config(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    gitlabHost: "https://gitlab.com",
    gitlabToken: "test",
    gitlabTokenType: "private-token",
    writeEnabled: false,
    mergeEnabled: false,
    allowedProjects: new Set(),
    mcpHost: "127.0.0.1",
    mcpPort: 3333,
    mcpPath: "/mcp",
    allowInsecureNoAuth: false,
    ...overrides,
  };
}

test("empty project allowlist permits token-visible projects", () => {
  assert.doesNotThrow(() => assertProjectAllowed(config(), "group/project"));
});

test("project allowlist blocks unlisted projects", () => {
  const current = config({ allowedProjects: new Set(["123", "group/allowed"]) });
  assert.doesNotThrow(() => assertProjectAllowed(current, "123"));
  assert.throws(() => assertProjectAllowed(current, "group/blocked"), /not in GITLAB_ALLOWED_PROJECTS/);
});

test("writes and merges require explicit independent flags", () => {
  assert.throws(() => assertWriteEnabled(config()), /Write tools are disabled/);
  assert.throws(() => assertMergeEnabled(config({ writeEnabled: true })), /Merge is disabled/);
  assert.doesNotThrow(() => assertMergeEnabled(config({ writeEnabled: true, mergeEnabled: true })));
});
