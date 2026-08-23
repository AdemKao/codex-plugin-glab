export type GitLabTokenType = "private-token" | "bearer";
export type McpAuthMode = "shared-token" | "oauth";
export type OAuthStoreDriver = "file" | "postgres";

export interface OAuthConfig {
  publicBaseUrl: string;
  gitlabClientId: string;
  gitlabClientSecret: string;
  storeDriver: OAuthStoreDriver;
  storePath: string;
  databaseUrl?: string;
  encryptionKey: Buffer;
  transactionTtlSeconds: number;
  authorizationCodeTtlSeconds: number;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  dcrEnabled: boolean;
  cimdEnabled: boolean;
  cimdAllowedHosts: Set<string>;
  cimdAllowPrivateNetwork: boolean;
  cimdFetchTimeoutMs: number;
}

export interface ServerConfig {
  gitlabHost: string;
  gitlabToken?: string;
  gitlabTokenType: GitLabTokenType;
  writeEnabled: boolean;
  mergeEnabled: boolean;
  allowedProjects: Set<string>;
  mcpHost: string;
  mcpPort: number;
  mcpPath: string;
  authMode: McpAuthMode;
  mcpAuthToken?: string;
  allowInsecureNoAuth: boolean;
  oauth?: OAuthConfig;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
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
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("GITLAB_HOST must use http:// or https://");
  }
  return url.toString().replace(/\/$/, "");
}

function normalizePublicBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("PUBLIC_BASE_URL must use http:// or https://");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PUBLIC_BASE_URL must be an origin without a path, query, or fragment");
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("PUBLIC_BASE_URL must use https:// outside loopback development");
  }
  return url.origin;
}

function normalizePath(raw: string | undefined): string {
  const value = (raw ?? "/mcp").trim();
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

function parseEncryptionKey(value: string | undefined): Buffer {
  if (!value?.trim()) {
    throw new Error("OAUTH_ENCRYPTION_KEY is required in oauth mode");
  }
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("OAUTH_ENCRYPTION_KEY must be base64 for exactly 32 bytes");
  }
  return key;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const tokenType = (env.GITLAB_TOKEN_TYPE ?? "private-token").toLowerCase();
  if (tokenType !== "private-token" && tokenType !== "bearer") {
    throw new Error("GITLAB_TOKEN_TYPE must be private-token or bearer");
  }

  const authMode = (env.MCP_AUTH_MODE ?? "shared-token").toLowerCase();
  if (authMode !== "shared-token" && authMode !== "oauth") {
    throw new Error("MCP_AUTH_MODE must be shared-token or oauth");
  }

  const mcpHost = env.MCP_HOST?.trim() || "127.0.0.1";
  const mcpAuthToken = env.MCP_AUTH_TOKEN?.trim() || undefined;
  const allowInsecureNoAuth = parseBoolean(env.MCP_ALLOW_INSECURE_NO_AUTH, false);
  const gitlabHost = normalizeHost(env.GITLAB_HOST ?? "https://gitlab.com");

  const base: ServerConfig = {
    gitlabHost,
    gitlabTokenType: tokenType,
    writeEnabled: parseBoolean(env.GITLAB_WRITE_ENABLED, false),
    mergeEnabled: parseBoolean(env.GITLAB_MERGE_ENABLED, false),
    allowedProjects: parseCsv(env.GITLAB_ALLOWED_PROJECTS),
    mcpHost,
    mcpPort: parsePort(env.MCP_PORT),
    mcpPath: normalizePath(env.MCP_PATH),
    authMode,
    ...(mcpAuthToken ? { mcpAuthToken } : {}),
    allowInsecureNoAuth,
  };

  if (authMode === "shared-token") {
    const gitlabToken = env.GITLAB_TOKEN?.trim();
    if (!gitlabToken) {
      throw new Error("GITLAB_TOKEN is required in shared-token mode");
    }
    if (!mcpAuthToken && !allowInsecureNoAuth && !["127.0.0.1", "localhost", "::1"].includes(mcpHost)) {
      throw new Error(
        "MCP_AUTH_TOKEN is required for non-loopback binds unless MCP_ALLOW_INSECURE_NO_AUTH=true is explicitly set",
      );
    }
    return { ...base, gitlabToken };
  }

  const publicBaseUrl = normalizePublicBaseUrl(env.PUBLIC_BASE_URL ?? "");
  const gitlabClientId = env.GITLAB_OAUTH_CLIENT_ID?.trim();
  const gitlabClientSecret = env.GITLAB_OAUTH_CLIENT_SECRET?.trim();
  if (!gitlabClientId || !gitlabClientSecret) {
    throw new Error("GITLAB_OAUTH_CLIENT_ID and GITLAB_OAUTH_CLIENT_SECRET are required in oauth mode");
  }

  const storeDriver = (env.OAUTH_STORE_DRIVER ?? "file").toLowerCase();
  if (storeDriver !== "file" && storeDriver !== "postgres") {
    throw new Error("OAUTH_STORE_DRIVER must be file or postgres");
  }
  const databaseUrl = env.OAUTH_DATABASE_URL?.trim();
  if (storeDriver === "postgres" && !databaseUrl) {
    throw new Error("OAUTH_DATABASE_URL is required when OAUTH_STORE_DRIVER=postgres");
  }

  return {
    ...base,
    oauth: {
      publicBaseUrl,
      gitlabClientId,
      gitlabClientSecret,
      storeDriver,
      storePath: env.OAUTH_STORE_PATH?.trim() || "./data/oauth-store.json",
      ...(databaseUrl ? { databaseUrl } : {}),
      encryptionKey: parseEncryptionKey(env.OAUTH_ENCRYPTION_KEY),
      transactionTtlSeconds: parsePositiveInteger(env.OAUTH_TRANSACTION_TTL_SECONDS, 600, "OAUTH_TRANSACTION_TTL_SECONDS"),
      authorizationCodeTtlSeconds: parsePositiveInteger(env.OAUTH_CODE_TTL_SECONDS, 300, "OAUTH_CODE_TTL_SECONDS"),
      accessTokenTtlSeconds: parsePositiveInteger(env.OAUTH_ACCESS_TOKEN_TTL_SECONDS, 3600, "OAUTH_ACCESS_TOKEN_TTL_SECONDS"),
      refreshTokenTtlSeconds: parsePositiveInteger(env.OAUTH_REFRESH_TOKEN_TTL_SECONDS, 2592000, "OAUTH_REFRESH_TOKEN_TTL_SECONDS"),
      dcrEnabled: parseBoolean(env.OAUTH_DCR_ENABLED, true),
      cimdEnabled: parseBoolean(env.OAUTH_CIMD_ENABLED, true),
      cimdAllowedHosts: parseCsv(env.OAUTH_CIMD_ALLOWED_HOSTS),
      cimdAllowPrivateNetwork: parseBoolean(env.OAUTH_CIMD_ALLOW_PRIVATE_NETWORK, false),
      cimdFetchTimeoutMs: parsePositiveInteger(env.OAUTH_CIMD_FETCH_TIMEOUT_MS, 5000, "OAUTH_CIMD_FETCH_TIMEOUT_MS"),
    },
  };
}
