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

function authorizationParams(clientId: string, redirectUri: string): URLSearchParams {
  return new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: pkceChallenge(randomToken(48)),
    code_challenge_method: "S256",
    scope: "gitlab:read",
    resource: "https://mcp.example.com/mcp",
  });
}

test("publishes MCP protected-resource and authorization-server metadata", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    assert.deepEqual(gateway.protectedResourceMetadata(), {
      resource: "https://mcp.example.com/mcp",
      authorization_servers: ["https://mcp.example.com"],
      scopes_supported: ["gitlab:read"],
      bearer_methods_supported: ["header"],
    });
    const metadata = gateway.authorizationServerMetadata();
    assert.equal(metadata.issuer, "https://mcp.example.com");
    assert.equal(metadata.registration_endpoint, "https://mcp.example.com/oauth/register");
    assert.equal(metadata.client_id_metadata_document_supported, true);
    assert.deepEqual(metadata.code_challenge_methods_supported, ["S256"]);
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("DCR client registration and downstream PKCE authorization redirect to GitLab", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    const registration = await gateway.registerClient({
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
    const redirect = new URL(await gateway.beginAuthorization(params));
    assert.equal(redirect.origin, "https://gitlab.com");
    assert.equal(redirect.pathname, "/oauth/authorize");
    assert.equal(redirect.searchParams.get("client_id"), "gitlab-client-id");
    assert.equal(redirect.searchParams.get("scope"), "read_api read_user");
    assert.equal(redirect.searchParams.get("code_challenge_method"), "S256");
    assert.ok(redirect.searchParams.get("state"));
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("IPv4 loopback redirect registration matches a dynamic client port", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    const registration = await gateway.registerClient({
      redirect_uris: ["http://127.0.0.1/callback/native-client"],
      token_endpoint_auth_method: "none",
    });
    const redirect = new URL(await gateway.beginAuthorization(authorizationParams(
      String(registration.client_id),
      "http://127.0.0.1:62593/callback/native-client",
    )));
    assert.equal(redirect.origin, "https://gitlab.com");
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("localhost redirect registration matches a dynamic client port", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    const registration = await gateway.registerClient({
      redirect_uris: ["http://localhost/callback/native-client"],
      token_endpoint_auth_method: "none",
    });
    const redirect = new URL(await gateway.beginAuthorization(authorizationParams(
      String(registration.client_id),
      "http://localhost:54321/callback/native-client",
    )));
    assert.equal(redirect.origin, "https://gitlab.com");
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dynamic loopback matching remains limited to the registered host and path", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    const registration = await gateway.registerClient({
      redirect_uris: ["http://127.0.0.1/callback/native-client"],
      token_endpoint_auth_method: "none",
    });
    const clientId = String(registration.client_id);
    for (const redirectUri of [
      "http://localhost:62593/callback/native-client",
      "http://127.0.0.1:62593/callback/other",
      "http://127.0.0.1:62593/callback/native-client?unexpected=1",
      "http://user@127.0.0.1:62593/callback/native-client",
      "http://127.0.0.1:62593/callback/native-client#fragment",
    ]) {
      await assert.rejects(
        () => gateway.beginAuthorization(authorizationParams(clientId, redirectUri)),
        (error: unknown) =>
          error instanceof OAuthProtocolError &&
          error.code === "invalid_request" &&
          /redirect_uri is not registered/.test(error.message),
      );
    }
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("public redirect URIs and explicitly registered loopback ports stay exact", async () => {
  const { dir, gateway } = fixture();
  try {
    await gateway.init();
    const publicRegistration = await gateway.registerClient({
      redirect_uris: ["https://client.example/oauth/callback"],
      token_endpoint_auth_method: "none",
    });
    await assert.rejects(
      () => gateway.beginAuthorization(authorizationParams(
        String(publicRegistration.client_id),
        "https://client.example:62593/oauth/callback",
      )),
      (error: unknown) => error instanceof OAuthProtocolError && error.code === "invalid_request",
    );

    const fixedLoopbackRegistration = await gateway.registerClient({
      redirect_uris: ["http://127.0.0.1:4000/callback/native-client"],
      token_endpoint_auth_method: "none",
    });
    await assert.rejects(
      () => gateway.beginAuthorization(authorizationParams(
        String(fixedLoopbackRegistration.client_id),
        "http://127.0.0.1:4001/callback/native-client",
      )),
      (error: unknown) => error instanceof OAuthProtocolError && error.code === "invalid_request",
    );
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("read-only deployment rejects downstream write scope", async () => {
  const { dir, gateway } = fixture(false);
  try {
    await gateway.init();
    const registration = await gateway.registerClient({
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
    await assert.rejects(
      () => gateway.beginAuthorization(params),
      (error: unknown) => error instanceof OAuthProtocolError && error.code === "invalid_scope",
    );
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
