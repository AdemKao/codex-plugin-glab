import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadConfig } from "../src/config.js";
import { pkceChallenge, randomToken } from "../src/oauth-crypto.js";
import { OAuthGateway, OAuthProtocolError } from "../src/oauth-gateway.js";

const key = Buffer.alloc(32, 5).toString("base64");

function baseEnv(path: string): NodeJS.ProcessEnv {
  return {
    MCP_AUTH_MODE: "oauth",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "client",
    GITLAB_OAUTH_CLIENT_SECRET: "secret",
    OAUTH_ENCRYPTION_KEY: key,
    OAUTH_STORE_PATH: path,
  };
}

test("authorization metadata advertises CIMD and keeps DCR fallback", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-v05-cimd-"));
  const gateway = new OAuthGateway(loadConfig(baseEnv(join(dir, "oauth-store.json"))));
  try {
    await gateway.init();
    const metadata = gateway.authorizationServerMetadata();
    assert.equal(metadata.client_id_metadata_document_supported, true);
    assert.equal(metadata.registration_endpoint, "https://mcp.example.com/oauth/register");
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CIMD accepts a ChatGPT-style loopback callback with a dynamic port", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-v05-cimd-flow-"));
  const clientId = "https://127.0.0.1/client-metadata.json";
  const registeredRedirect = "http://127.0.0.1/callback/chatgpt-client";
  const requestedRedirect = "http://127.0.0.1:62593/callback/chatgpt-client";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    assert.equal(url, clientId);
    return new Response(JSON.stringify({
      client_id: clientId,
      client_name: "ChatGPT CIMD Test Client",
      redirect_uris: [registeredRedirect, "http://localhost/callback/chatgpt-client"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "max-age=60" },
    });
  }) as typeof fetch;

  const config = loadConfig({
    ...baseEnv(join(dir, "oauth-store.json")),
    OAUTH_CIMD_ALLOW_PRIVATE_NETWORK: "true",
    OAUTH_CIMD_ALLOWED_HOSTS: "127.0.0.1",
  });
  const gateway = new OAuthGateway(config);
  try {
    await gateway.init();
    const redirect = new URL(await gateway.beginAuthorization(new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: requestedRedirect,
      code_challenge: pkceChallenge(randomToken(48)),
      code_challenge_method: "S256",
      scope: "gitlab:read",
    })));
    assert.equal(redirect.origin, "https://gitlab.com");
    assert.equal(redirect.pathname, "/oauth/authorize");

    const state = redirect.searchParams.get("state");
    assert.ok(state);
    const transaction = await gateway.store.takeTransaction(state);
    assert.equal(transaction?.redirectUri, requestedRedirect);
  } finally {
    await gateway.close();
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CIMD blocks private-network metadata targets by default", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-v05-cimd-ssrf-"));
  const gateway = new OAuthGateway(loadConfig(baseEnv(join(dir, "oauth-store.json"))));
  try {
    await gateway.init();
    await assert.rejects(
      () => gateway.beginAuthorization(new URLSearchParams({
        response_type: "code",
        client_id: "https://127.0.0.1/client.json",
        redirect_uri: "https://client.example/callback",
        code_challenge: pkceChallenge(randomToken(48)),
        code_challenge_method: "S256",
      })),
      (error: unknown) =>
        error instanceof OAuthProtocolError &&
        error.code === "unauthorized_client" &&
        /private-network/.test(error.message),
    );
  } finally {
    await gateway.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
