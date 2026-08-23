import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadConfig } from "../src/config.js";
import { pkceChallenge, randomToken } from "../src/oauth-crypto.js";
import { OAuthGateway, OAuthProtocolError } from "../src/oauth-gateway.js";

const key = Buffer.alloc(32, 13).toString("base64");

test("OAuth smoke flow authorize callback token authenticate and refresh", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-oauth-flow-"));
  const originalFetch = globalThis.fetch;
  let gitlabRefreshes = 0;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "https://gitlab.com/oauth/token") {
      const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams(String(init?.body ?? ""));
      if (body.get("grant_type") === "authorization_code") {
        return new Response(JSON.stringify({
          access_token: "gitlab-access-1",
          refresh_token: "gitlab-refresh-1",
          expires_in: 3600,
          scope: "read_api read_user",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (body.get("grant_type") === "refresh_token") {
        gitlabRefreshes += 1;
        return new Response(JSON.stringify({
          access_token: "gitlab-access-2",
          refresh_token: "gitlab-refresh-2",
          expires_in: 3600,
          scope: "read_api read_user",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    if (url === "https://gitlab.com/api/v4/user") {
      return new Response(JSON.stringify({ id: 42, username: "alice", name: "Alice" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  const config = loadConfig({
    MCP_AUTH_MODE: "oauth",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "gitlab-client",
    GITLAB_OAUTH_CLIENT_SECRET: "gitlab-secret",
    OAUTH_ENCRYPTION_KEY: key,
    OAUTH_STORE_PATH: join(dir, "oauth-store.json"),
  });
  const gateway = new OAuthGateway(config);

  try {
    await gateway.init();
    const registration = await gateway.registerClient({
      client_name: "Smoke Client",
      redirect_uris: ["https://client.example/callback"],
      token_endpoint_auth_method: "none",
    });
    const clientId = String(registration.client_id);
    const downstreamVerifier = randomToken(48);
    const authorizeUrl = new URL(await gateway.beginAuthorization(new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "https://client.example/callback",
      code_challenge: pkceChallenge(downstreamVerifier),
      code_challenge_method: "S256",
      state: "client-state",
      scope: "gitlab:read",
      resource: "https://mcp.example.com/mcp",
    })));

    const state = authorizeUrl.searchParams.get("state");
    assert.ok(state);
    const callback = new URL(await gateway.handleGitLabCallback(new URLSearchParams({
      state,
      code: "gitlab-code",
    })));
    assert.equal(callback.origin, "https://client.example");
    assert.equal(callback.searchParams.get("state"), "client-state");
    const downstreamCode = callback.searchParams.get("code");
    assert.ok(downstreamCode);

    const tokenSet = await gateway.exchangeToken(new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: downstreamCode,
      redirect_uri: "https://client.example/callback",
      code_verifier: downstreamVerifier,
    }), {});
    const accessToken = String(tokenSet.access_token);
    const refreshToken = String(tokenSet.refresh_token);
    const auth = await gateway.authenticateAccessToken(accessToken);
    assert.equal(auth?.identity?.username, "alice");
    assert.equal(auth?.gitlabToken, "gitlab-access-1");

    const refreshed = await gateway.exchangeToken(new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }), {});
    assert.notEqual(refreshed.access_token, accessToken);
    assert.notEqual(refreshed.refresh_token, refreshToken);
    assert.equal(gitlabRefreshes, 1);

    await assert.rejects(
      () => gateway.exchangeToken(new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: refreshToken,
      }), {}),
      (error: unknown) => error instanceof OAuthProtocolError && error.code === "invalid_grant",
    );
  } finally {
    await gateway.close();
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});
