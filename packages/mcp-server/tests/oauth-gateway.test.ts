import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadConfig } from "../src/config.js";
import { OAuthGateway, OAuthProtocolError } from "../src/oauth-gateway.js";
import { pkceChallenge, randomToken } from "../src/oauth-crypto.js";

function fixture(writeEnabled = false) {
  const dir = mkdtempSync(join(tmpdir(), "glab-oauth-gateway-"));
  const config = loadConfig({
    MCP_AUTH_MODE: "oauth",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "gitlab-client-id",
    GITLAB_OAUTH_CLIENT_SECRET: "gitlab-client-secret",
    OAUTH_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString("base64"),
    OAUTH_STORE_PATH: join(dir, "store.json"),
    GITLAB_WRITE_ENABLED: writeEnabled ? "true" : "false",
  });
  return { dir, gateway: new OAuthGateway(config) };
}

test("publishes MCP protected-resource and authorization-server metadata", () => {
  const { dir, gateway } = fixture();
  try {
    assert.deepEqual(gateway.protectedResourceMetadata(), {
      resource: "https://mcp.example.com/mcp",
      authorization_servers: ["https://mcp.example.com"],
      scopes_supported: ["gitlab:read"],
      bearer_methods_supported: ["header"],
    });
    const metadata = gateway.authorizationServerMetadata();
    assert.equal(metadata.issuer, "https://mcp.example.com");
    assert.equal(metadata.registration_endpoint, "https://mcp.example.com/oauth/register");
    assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("DCR client registration and downstream PKCE authorization redirect to GitLab", () => {
  const { dir, gateway } = fixture();
  try {
    const registration = gateway.registerClient({
      client_name: "MCP Test Client",
      redirect_uris: ["https://client.example/oauth/callback"],
      token_endpoint_auth_method: "none",
    });
    const clientId = String(registration.client_id);
    const verifier = randomToken(48);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "https://client.example/oauth/callback",
      code_challenge: pkceChallenge(verifier),
      code_challenge_method: "S256",
      state: "client-state",
      scope: "gitlab:read",
      resource: "https://mcp.example.com/mcp",
    });
    const redirect = new URL(gateway.beginAuthorization(params));
    assert.equal(redirect.origin, "https://gitlab.com");
    assert.equal(redirect.pathname, "/oauth/authorize");
    assert.equal(redirect.searchParams.get("client_id"), "gitlab-client-id");
    assert.equal(redirect.searchParams.get("scope"), "read_api read_user");
    assert.equal(redirect.searchParams.get("code_challenge_method"), "S256");
    assert.ok(redirect.searchParams.get("state"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read-only deployment rejects downstream write scope", () => {
  const { dir, gateway } = fixture(false);
  try {
    const registration = gateway.registerClient({
      redirect_uris: ["https://client.example/oauth/callback"],
      token_endpoint_auth_method: "none",
    });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: String(registration.client_id),
      redirect_uri: "https://client.example/oauth/callback",
      code_challenge: pkceChallenge(randomToken(48)),
      code_challenge_method: "S256",
      scope: "gitlab:write",
    });
    assert.throws(
      () => gateway.beginAuthorization(params),
      (error: unknown) => error instanceof OAuthProtocolError && error.code === "invalid_scope",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
