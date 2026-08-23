import assert from "node:assert/strict";
import test from "node:test";

import { tokenHash } from "../src/oauth-crypto.js";
import { PostgresOAuthStore } from "../src/postgres-oauth-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const key = Buffer.alloc(32, 11);

function session(id: string, refreshToken: string) {
  const now = Date.now();
  return {
    id,
    clientId: "client-1",
    accessTokenHash: tokenHash(`access-${id}`),
    refreshTokenHash: tokenHash(refreshToken),
    scopes: ["gitlab:read"],
    gitlabTokens: {
      accessToken: `gitlab-access-${id}`,
      refreshToken: `gitlab-refresh-${id}`,
      expiresAt: now + 60_000,
    },
    identity: { id: 42, username: "alice" },
    accessExpiresAt: now + 60_000,
    refreshExpiresAt: now + 120_000,
    createdAt: now,
    updatedAt: now,
  };
}

test("PostgreSQL store atomically consumes state, codes, and refresh tokens", { skip: !databaseUrl }, async () => {
  const storeA = new PostgresOAuthStore(databaseUrl!, key);
  const storeB = new PostgresOAuthStore(databaseUrl!, key);
  await storeA.init();
  await storeB.init();

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const transactionId = `tx-${suffix}`;
  const code = `code-${suffix}`;
  const sessionId = `session-${suffix}`;
  const oldRefresh = `refresh-${suffix}`;

  try {
    await storeA.putTransaction({
      id: transactionId,
      clientId: "client-1",
      redirectUri: "https://client.example/callback",
      downstreamCodeChallenge: "challenge",
      scopes: ["gitlab:read"],
      gitlabPkceVerifier: "verifier",
      expiresAt: Date.now() + 60_000,
    });
    const transactionResults = await Promise.all([
      storeA.takeTransaction(transactionId),
      storeB.takeTransaction(transactionId),
    ]);
    assert.equal(transactionResults.filter(Boolean).length, 1);

    await storeA.putAuthorizationCode({
      codeHash: tokenHash(code),
      clientId: "client-1",
      redirectUri: "https://client.example/callback",
      downstreamCodeChallenge: "challenge",
      scopes: ["gitlab:read"],
      gitlabTokens: {
        accessToken: "gitlab-access",
        refreshToken: "gitlab-refresh",
        expiresAt: Date.now() + 60_000,
      },
      identity: { id: 42, username: "alice" },
      expiresAt: Date.now() + 60_000,
    });
    const codeResults = await Promise.all([
      storeA.takeAuthorizationCode(code),
      storeB.takeAuthorizationCode(code),
    ]);
    assert.equal(codeResults.filter(Boolean).length, 1);

    const original = session(sessionId, oldRefresh);
    await storeA.putSession(original);
    const rotatedA = {
      ...original,
      accessTokenHash: tokenHash(`new-access-a-${suffix}`),
      refreshTokenHash: tokenHash(`new-refresh-a-${suffix}`),
      updatedAt: Date.now() + 1,
    };
    const rotatedB = {
      ...original,
      accessTokenHash: tokenHash(`new-access-b-${suffix}`),
      refreshTokenHash: tokenHash(`new-refresh-b-${suffix}`),
      updatedAt: Date.now() + 2,
    };
    const rotations = await Promise.all([
      storeA.rotateSessionByRefreshToken(oldRefresh, rotatedA),
      storeB.rotateSessionByRefreshToken(oldRefresh, rotatedB),
    ]);
    assert.deepEqual(rotations.sort(), [false, true]);
  } finally {
    await storeA.deleteSession(sessionId);
    await storeA.close();
    await storeB.close();
  }
});
