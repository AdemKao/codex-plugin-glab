import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

import { loadConfig } from "./config.js";
import { registerGitLabTools } from "./register-tools.js";

const VERSION = "0.3.0";
const config = loadConfig();

function createGitLabServer(): McpServer {
  const server = new McpServer(
    { name: "codex-plugin-glab", version: VERSION },
    { capabilities: { tools: {} } },
  );
  registerGitLabTools(server, config);
  return server;
}

const handler = createMcpHandler(createGitLabServer);
const handleMcp = toNodeHandler(handler);

function constantTimeTokenMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function isAuthorized(authorization: string | undefined): boolean {
  if (!config.mcpAuthToken) return config.allowInsecureNoAuth || true;
  if (!authorization?.startsWith("Bearer ")) return false;
  return constantTimeTokenMatch(config.mcpAuthToken, authorization.slice(7));
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "codex-plugin-glab", version: VERSION }));
    return;
  }

  if (url.pathname !== config.mcpPath) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (!isAuthorized(req.headers.authorization)) {
    res.writeHead(401, {
      "content-type": "application/json",
      "www-authenticate": "Bearer",
    });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    await handleMcp(req, res);
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
  console.log(`codex-plugin-glab MCP listening on http://${config.mcpHost}:${config.mcpPort}${config.mcpPath}`);
  console.log(`GitLab host: ${config.gitlabHost}`);
  console.log(`Writes: ${config.writeEnabled ? "enabled" : "disabled"}; merges: ${config.mergeEnabled ? "enabled" : "disabled"}`);
});
