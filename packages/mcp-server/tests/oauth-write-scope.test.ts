import assert from "node:assert/strict";
import test from "node:test";

import { runWithRequestAuth } from "../src/auth-context.js";
import { loadConfig } from "../src/config.js";
import { GitLabApiError, GitLabClient } from "../src/gitlab-client.js";

const oauthKey = Buffer.alloc(32, 3).toString("base64");

function oauthConfig() {
  return loadConfig({
    MCP_AUTH_MODE: "oauth",
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GITLAB_OAUTH_CLIENT_ID: "client-id",
    GITLAB_OAUTH_CLIENT_SECRET: "client-secret",
    OAUTH_ENCRYPTION_KEY: oauthKey,
    GITLAB_WRITE_ENABLED: "true",
  });
}

test("read-only OAuth session blocks GitLab writes before network I/O", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("network should not be reached");
  }) as typeof fetch;

  try {
    const client = new GitLabClient(oauthConfig());
    await assert.rejects(
      () =>
        runWithRequestAuth(
          {
            gitlabToken: "user-access-token",
            gitlabTokenType: "bearer",
            scopes: new Set(["gitlab:read"]),
          },
          () => client.request("POST", "/projects/1/issues", { body: { title: "blocked" } }),
        ),
      (error: unknown) =>
        error instanceof GitLabApiError && error.status === 403 && /gitlab:write/.test(error.message),
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("OAuth write scope reaches the GitLab HTTP boundary", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    fetchCalls += 1;
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer user-access-token");
    return new Response(JSON.stringify({ id: 1, title: "created" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const client = new GitLabClient(oauthConfig());
    const response = await runWithRequestAuth(
      {
        gitlabToken: "user-access-token",
        gitlabTokenType: "bearer",
        scopes: new Set(["gitlab:read", "gitlab:write"]),
      },
      () => client.request<{ id: number }>("POST", "/projects/1/issues", { body: { title: "created" } }),
    );
    assert.equal(fetchCalls, 1);
    assert.equal(response.data.id, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
