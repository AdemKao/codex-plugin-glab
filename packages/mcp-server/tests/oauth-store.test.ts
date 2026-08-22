import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { pkceChallenge, randomToken, tokenHash, verifyPkce } from "../src/oauth-crypto.js";
import { OAuthStore } from "../src/oauth-store.js";

test("PKCE S256 verification accepts only the original verifier", () => {
  const verifier = randomToken(48);
  const challenge = pkceChallenge(verifier);
  assert.equal(verifyPkce(verifier, challenge), true);
  assert.equal(verifyPkce(`${verifier}x`, challenge), false);
});

test("OAuth store encrypts secrets at rest and survives reload", () => {
  const dir = mkdtempSync(join(tmpdir(), "glab-oauth-store-"));
  const path = join(dir, "oauth-store.json");
  const key = Buffer.alloc(32, 9);
  const sensitiveToken = "gitlab-sensitive-access-token";
  try {
    const store = new OAuthStore(path, key);
    store.putClient({
      clientId: "client-1",
      redirectUris: ["https://client.example/callback"],
      tokenEndpointAuthMethod: "none",
      createdAt: Date.now(),
    });
    store.putSession({
      id: "session-1",
      clientId: "client-1",
      accessTokenHash: tokenHash("mcp-access"),
      refreshTokenHash: tokenHash("mcp-refresh"),
      scopes: ["gitlab:read"],
      gitlabTokens: {
        accessToken: sensitiveToken,
        refreshToken: "gitlab-refresh-token",
        expiresAt: Date.now() + 60_000,
      },
      identity: { id: 42, username: "alice" },
      accessExpiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 120_000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const disk = readFileSync(path, "utf8");
    assert.equal(disk.includes(sensitiveToken), false);
    assert.equal(disk.includes("gitlab-refresh-token"), false);

    const reloaded = new OAuthStore(path, key);
    assert.equal(reloaded.getClient("client-1")?.clientId, "client-1");
    assert.equal(reloaded.getSessionByAccessToken("mcp-access")?.identity.username, "alice");
    assert.equal(reloaded.getSessionByRefreshToken("mcp-refresh")?.gitlabTokens.accessToken, sensitiveToken);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
