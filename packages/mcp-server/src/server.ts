import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

import { runWithRequestAuth } from "./auth-context.js";
import { loadConfig } from "./config.js";
import { GitLabClient } from "./gitlab-client.js";
import { OAuthGateway, OAuthProtocolError } from "./oauth-gateway.js";
import { registerGitLabTools } from "./register-tools.js";
import { registerGitLabV05Tools } from "./register-v05-tools.js";

const VERSION = "0.5.2";
const config = loadConfig();
const oauthGateway = config.authMode === "oauth" ? new OAuthGateway(config) : undefined;
if (oauthGateway) await oauthGateway.init();

function createGitLabServer(): McpServer {
  const server = new McpServer(
    { name: "codex-plugin-glab", version: VERSION },
    { capabilities: { tools: {} } },
  );
  const gitlabClient = new GitLabClient(config);
  registerGitLabTools(server, config, gitlabClient);
  registerGitLabV05Tools(server, config, gitlabClient);
  return server;
}

const handler = createMcpHandler(createGitLabServer);
const handleMcp = toNodeHandler(handler);
type McpNodeRequest = Parameters<typeof handleMcp>[0];

function constantTimeTokenMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function isSharedTokenAuthorized(authorization: string | undefined): boolean {
  if (!config.mcpAuthToken) return true;
  if (!authorization?.startsWith("Bearer ")) return false;
  return constantTimeTokenMatch(config.mcpAuthToken, authorization.slice(7));
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function sendOAuthError(res: ServerResponse, error: unknown): void {
  if (error instanceof OAuthProtocolError) {
    sendJson(res, error.status, { error: error.code, error_description: error.message });
    return;
  }
  console.error("OAuth request failed", error instanceof Error ? error.message : String(error));
  sendJson(res, 500, { error: "server_error", error_description: "OAuth server error" });
}

async function readBody(req: IncomingMessage, maxBytes = 1_048_576): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new OAuthProtocolError("invalid_request", "Request body is too large", 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function bearerToken(authorization: string | undefined): string | undefined {
  if (!authorization?.startsWith("Bearer ")) return undefined;
  const token = authorization.slice(7).trim();
  return token || undefined;
}

function protectedResourceMetadataUrl(): string {
  if (!config.oauth) throw new Error("OAuth configuration is unavailable");
  return `${config.oauth.publicBaseUrl}/.well-known/oauth-protected-resource`;
}

async function handleOAuthRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (!oauthGateway || !config.oauth) return false;

  if (
    req.method === "GET" &&
    (url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === `/.well-known/oauth-protected-resource${config.mcpPath}`)
  ) {
    sendJson(res, 200, oauthGateway.protectedResourceMetadata());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/.well-known/oauth-authorization-server") {
    sendJson(res, 200, oauthGateway.authorizationServerMetadata());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/oauth/register") {
    try {
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      sendJson(res, 201, await oauthGateway.registerClient(body));
    } catch (error) {
      sendOAuthError(res, error);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/oauth/authorize") {
    try {
      res.writeHead(302, {
        location: await oauthGateway.beginAuthorization(url.searchParams),
        "cache-control": "no-store",
      });
      res.end();
    } catch (error) {
      sendOAuthError(res, error);
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/oauth/gitlab/callback") {
    try {
      const redirect = await oauthGateway.handleGitLabCallback(url.searchParams);
      res.writeHead(302, { location: redirect, "cache-control": "no-store" });
      res.end();
    } catch (error) {
      sendOAuthError(res, error);
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/oauth/token") {
    try {
      const body = new URLSearchParams(await readBody(req));
      sendJson(res, 200, await oauthGateway.exchangeToken(body, req.headers));
    } catch (error) {
      sendOAuthError(res, error);
    }
    return true;
  }

  return false;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/healthz") {
    sendJson(res, 200, {
      status: "ok",
      server: "codex-plugin-glab",
      version: VERSION,
      authMode: config.authMode,
      oauthStore: config.oauth?.storeDriver,
    });
    return;
  }

  if (await handleOAuthRoute(req, res, url)) return;

  if (url.pathname !== config.mcpPath) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  try {
    if (config.authMode === "oauth") {
      if (!oauthGateway || !config.oauth) throw new Error("OAuth gateway is unavailable");
      const rawToken = bearerToken(req.headers.authorization);
      const requestAuth = rawToken ? await oauthGateway.authenticateAccessToken(rawToken) : undefined;
      if (!requestAuth) {
        sendJson(
          res,
          401,
          { error: "unauthorized" },
          {
            "www-authenticate": `Bearer resource_metadata="${protectedResourceMetadataUrl()}", scope="gitlab:read"`,
          },
        );
        return;
      }
      await runWithRequestAuth(requestAuth, async () => {
        await handleMcp(req as McpNodeRequest, res);
      });
      return;
    }

    if (!isSharedTokenAuthorized(req.headers.authorization)) {
      sendJson(res, 401, { error: "unauthorized" }, { "www-authenticate": "Bearer" });
      return;
    }
    await handleMcp(req as McpNodeRequest, res);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ error: "internal_server_error" }));
    }
    console.error("MCP request failed", error instanceof Error ? error.message : String(error));
  }
});

httpServer.listen(config.mcpPort, config.mcpHost, () => {
  console.log(
    `codex-plugin-glab MCP listening on http://${config.mcpHost}:${config.mcpPort}${config.mcpPath}`,
  );
  console.log(`GitLab host: ${config.gitlabHost}`);
  console.log(`Auth mode: ${config.authMode}`);
  if (config.oauth) console.log(`OAuth store: ${config.oauth.storeDriver}`);
  console.log(
    `Writes: ${config.writeEnabled ? "enabled" : "disabled"}; merges: ${config.mergeEnabled ? "enabled" : "disabled"}`,
  );
});

async function shutdown(): Promise<void> {
  httpServer.close();
  await oauthGateway?.close();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
