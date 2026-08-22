export type GitLabTokenType = "private-token" | "bearer";

export interface ServerConfig {
  gitlabHost: string;
  gitlabToken: string;
  gitlabTokenType: GitLabTokenType;
  writeEnabled: boolean;
  mergeEnabled: boolean;
  allowedProjects: Set<string>;
  mcpHost: string;
  mcpPort: number;
  mcpPath: string;
  mcpAuthToken?: string;
  allowInsecureNoAuth: boolean;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3333");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MCP_PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseCsv(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function normalizeHost(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "");
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("GITLAB_HOST must use http:// or https://");
  }
  return url.toString().replace(/\/$/, "");
}

function normalizePath(raw: string | undefined): string {
  const value = (raw ?? "/mcp").trim();
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const gitlabToken = env.GITLAB_TOKEN?.trim();
  if (!gitlabToken) {
    throw new Error("GITLAB_TOKEN is required");
  }

  const tokenType = (env.GITLAB_TOKEN_TYPE ?? "private-token").toLowerCase();
  if (tokenType !== "private-token" && tokenType !== "bearer") {
    throw new Error("GITLAB_TOKEN_TYPE must be private-token or bearer");
  }

  const mcpHost = env.MCP_HOST?.trim() || "127.0.0.1";
  const mcpAuthToken = env.MCP_AUTH_TOKEN?.trim() || undefined;
  const allowInsecureNoAuth = parseBoolean(env.MCP_ALLOW_INSECURE_NO_AUTH, false);

  if (!mcpAuthToken && !allowInsecureNoAuth && !["127.0.0.1", "localhost", "::1"].includes(mcpHost)) {
    throw new Error(
      "MCP_AUTH_TOKEN is required for non-loopback binds unless MCP_ALLOW_INSECURE_NO_AUTH=true is explicitly set",
    );
  }

  return {
    gitlabHost: normalizeHost(env.GITLAB_HOST ?? "https://gitlab.com"),
    gitlabToken,
    gitlabTokenType: tokenType,
    writeEnabled: parseBoolean(env.GITLAB_WRITE_ENABLED, false),
    mergeEnabled: parseBoolean(env.GITLAB_MERGE_ENABLED, false),
    allowedProjects: parseCsv(env.GITLAB_ALLOWED_PROJECTS),
    mcpHost,
    mcpPort: parsePort(env.MCP_PORT),
    mcpPath: normalizePath(env.MCP_PATH),
    ...(mcpAuthToken ? { mcpAuthToken } : {}),
    allowInsecureNoAuth,
  };
}
