import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadConfig } from "../src/config.js";
import { OAuthGateway } from "../src/oauth-gateway.js";

const key = Buffer.alloc(32, 5).toString("base64");

test("authorization metadata advertises CIMD and keeps DCR fallback", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-v05-cimd-"));
  try {
    const config = loadConfig({
      MCP_AUTH_MODE: "oauth",
      PUBLIC_BASE_URL: "https://mcp.example.com",
      GITLAB_OAUTH_CLIENT_ID: "client",
      GITLAB_OAUTH_CLIENT_SECRET: "secret",
      OAUTH_ENCRYPTION_KEY: key,
      OAUTH_STORE_PATH: join(dir, "oauth-store.json"),
    });
    const gateway = new OAuthGateway(config);
    await gateway.init();
    const metadata = gateway.authorizationServerMetadata();
    assert.equal(metadata.client_id_metadata_document_supported, true);
    assert.equal(metadata.registration_endpoint, "https://mcp.example.com/oauth/register");
    await gateway.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
