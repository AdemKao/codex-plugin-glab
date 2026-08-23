import { lookup } from "node:dns/promises";
import type { IncomingHttpHeaders } from "node:http";
import { isIP } from "node:net";

import type { GitLabIdentity, RequestAuthContext } from "./auth-context.js";
import type { OAuthConfig, ServerConfig } from "./config.js";
import {
  hashClientSecret,
  pkceChallenge,
  randomToken,
  tokenHash,
  verifyClientSecret,
  verifyPkce,
} from "./oauth-crypto.js";
import {
  type GitLabOAuthTokenSet,
  type OAuthAuthorizationCodeRecord,
  type OAuthClientRecord,
  type OAuthSessionRecord,
  type OAuthStoreBackend,
  type OAuthTransactionRecord,
} from "./oauth-store.js";
import { createOAuthStore } from "./oauth-store-factory.js";

const READ_SCOPE = "gitlab:read";
const WRITE_SCOPE = "gitlab:write";
const CIMD_MAX_BYTES = 65_536;
const CIMD_DEFAULT_CACHE_SECONDS = 900;
const CIMD_MAX_CACHE_SECONDS = 86_400;

interface GitLabTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  created_at?: number;
  scope?: string;
}

interface GitLabUserResponse {
  id?: number;
  username?: string;
  name?: string;
}

interface CachedClientMetadata {
  client: OAuthClientRecord;
  expiresAt: number;
}

export class OAuthProtocolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OAuthProtocolError";
  }
}

function oauth(config: ServerConfig): OAuthConfig {
  if (!config.oauth) throw new Error("OAuth configuration is unavailable");
  return config.oauth;
}

function validateRedirectUri(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new OAuthProtocolError("invalid_redirect_uri", "redirect_uri must be an absolute URI");
  }
  if (["javascript:", "data:", "file:"].includes(url.protocol)) {
    throw new OAuthProtocolError("invalid_redirect_uri", "redirect_uri uses a prohibited scheme");
  }
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new OAuthProtocolError("invalid_redirect_uri", "http redirect URIs are allowed only on loopback hosts");
  }
  return url.toString();
}

function normalizeScopes(raw: string | undefined, config: ServerConfig): string[] {
  const requested = new Set((raw?.trim() || READ_SCOPE).split(/\s+/).filter(Boolean));
  for (const scope of requested) {
    if (scope !== READ_SCOPE && scope !== WRITE_SCOPE) {
      throw new OAuthProtocolError("invalid_scope", `Unsupported OAuth scope: ${scope}`);
    }
  }
  if (requested.has(WRITE_SCOPE) && !config.writeEnabled) {
    throw new OAuthProtocolError("invalid_scope", `${WRITE_SCOPE} is unavailable because writes are disabled`);
  }
  requested.add(READ_SCOPE);
  return [...requested].sort();
}

function upstreamGitLabScopes(scopes: string[]): string {
  return scopes.includes(WRITE_SCOPE) ? "api read_user" : "read_api read_user";
}

function parseClientBasicAuth(headers: IncomingHttpHeaders): { clientId: string; clientSecret: string } | undefined {
  const authorization = headers.authorization;
  if (!authorization?.startsWith("Basic ")) return undefined;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return undefined;
    return {
      clientId: decodeURIComponent(decoded.slice(0, separator)),
      clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
    };
  } catch {
    return undefined;
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return isPrivateIpv4(address);
  if (kind !== 6) return true;
  const value = address.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith("ff")) return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isPrivateIpv4(mapped) : true;
  }
  return false;
}

function cacheSeconds(cacheControl: string | null): number {
  if (!cacheControl) return CIMD_DEFAULT_CACHE_SECONDS;
  const match = /(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl);
  if (!match) return CIMD_DEFAULT_CACHE_SECONDS;
  return Math.max(0, Math.min(Number(match[1]), CIMD_MAX_CACHE_SECONDS));
}

export class OAuthGateway {
  readonly store: OAuthStoreBackend;
  private readonly clientMetadataCache = new Map<string, CachedClientMetadata>();

  constructor(
    private readonly config: ServerConfig,
    store?: OAuthStoreBackend,
  ) {
    this.store = store ?? createOAuthStore(oauth(config));
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async close(): Promise<void> {
    await this.store.close();
  }

  protectedResourceMetadata(): Record<string, unknown> {
    const settings = oauth(this.config);
    return {
      resource: `${settings.publicBaseUrl}${this.config.mcpPath}`,
      authorization_servers: [settings.publicBaseUrl],
      scopes_supported: this.config.writeEnabled ? [READ_SCOPE, WRITE_SCOPE] : [READ_SCOPE],
      bearer_methods_supported: ["header"],
    };
  }

  authorizationServerMetadata(): Record<string, unknown> {
    const settings = oauth(this.config);
    return {
      issuer: settings.publicBaseUrl,
      authorization_endpoint: `${settings.publicBaseUrl}/oauth/authorize`,
      token_endpoint: `${settings.publicBaseUrl}/oauth/token`,
      ...(settings.dcrEnabled
        ? { registration_endpoint: `${settings.publicBaseUrl}/oauth/register` }
        : {}),
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      scopes_supported: this.config.writeEnabled ? [READ_SCOPE, WRITE_SCOPE] : [READ_SCOPE],
      client_id_metadata_document_supported: settings.cimdEnabled,
    };
  }

  async registerClient(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const settings = oauth(this.config);
    if (!settings.dcrEnabled) {
      throw new OAuthProtocolError("invalid_request", "Dynamic client registration is disabled", 404);
    }
    if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
      throw new OAuthProtocolError("invalid_client_metadata", "redirect_uris is required");
    }
    const redirectUris = input.redirect_uris.map((entry) => validateRedirectUri(String(entry)));
    const method = String(input.token_endpoint_auth_method ?? "none");
    if (method !== "none" && method !== "client_secret_post" && method !== "client_secret_basic") {
      throw new OAuthProtocolError("invalid_client_metadata", "Unsupported token_endpoint_auth_method");
    }
    const storedMethod = method === "none" ? "none" : "client_secret_post";
    const clientId = `mcp_${randomToken(24)}`;
    const createdAt = Math.floor(Date.now() / 1000);
    const record: OAuthClientRecord = {
      clientId,
      ...(typeof input.client_name === "string" && input.client_name.trim()
        ? { clientName: input.client_name.trim().slice(0, 200) }
        : {}),
      redirectUris,
      tokenEndpointAuthMethod: storedMethod,
      createdAt,
    };

    let clientSecret: string | undefined;
    if (storedMethod !== "none") {
      clientSecret = randomToken(32);
      const secret = hashClientSecret(clientSecret);
      record.clientSecretSalt = secret.salt;
      record.clientSecretHash = secret.hash;
    }
    await this.store.putClient(record);

    return {
      client_id: clientId,
      client_id_issued_at: createdAt,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: method,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...(clientSecret
        ? {
            client_secret: clientSecret,
            client_secret_expires_at: 0,
          }
        : {}),
    };
  }

  async beginAuthorization(params: URLSearchParams): Promise<string> {
    const settings = oauth(this.config);
    if (params.get("response_type") !== "code") {
      throw new OAuthProtocolError("unsupported_response_type", "Only response_type=code is supported");
    }
    const clientId = params.get("client_id");
    const redirectUriRaw = params.get("redirect_uri");
    const codeChallenge = params.get("code_challenge");
    const codeChallengeMethod = params.get("code_challenge_method");
    if (!clientId || !redirectUriRaw || !codeChallenge) {
      throw new OAuthProtocolError("invalid_request", "client_id, redirect_uri, and code_challenge are required");
    }
    if (codeChallengeMethod !== "S256") {
      throw new OAuthProtocolError("invalid_request", "PKCE code_challenge_method=S256 is required");
    }

    const client = await this.resolveClient(clientId);
    const redirectUri = validateRedirectUri(redirectUriRaw);
    if (!client.redirectUris.includes(redirectUri)) {
      throw new OAuthProtocolError("invalid_request", "redirect_uri is not registered for this client");
    }

    const resource = params.get("resource");
    const expectedResource = `${settings.publicBaseUrl}${this.config.mcpPath}`;
    if (resource && resource !== expectedResource) {
      throw new OAuthProtocolError("invalid_target", "Requested resource does not match this MCP server");
    }

    const scopes = normalizeScopes(params.get("scope") ?? undefined, this.config);
    const transactionId = randomToken(32);
    const gitlabPkceVerifier = randomToken(48);
    const transaction: OAuthTransactionRecord = {
      id: transactionId,
      clientId,
      redirectUri,
      ...(params.get("state") ? { downstreamState: params.get("state") ?? undefined } : {}),
      downstreamCodeChallenge: codeChallenge,
      scopes,
      gitlabPkceVerifier,
      expiresAt: Date.now() + settings.transactionTtlSeconds * 1000,
    };
    await this.store.putTransaction(transaction);

    const authorize = new URL(`${this.config.gitlabHost}/oauth/authorize`);
    authorize.searchParams.set("client_id", settings.gitlabClientId);
    authorize.searchParams.set("redirect_uri", `${settings.publicBaseUrl}/oauth/gitlab/callback`);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("state", transactionId);
    authorize.searchParams.set("scope", upstreamGitLabScopes(scopes));
    authorize.searchParams.set("code_challenge", pkceChallenge(gitlabPkceVerifier));
    authorize.searchParams.set("code_challenge_method", "S256");
    return authorize.toString();
  }

  async handleGitLabCallback(params: URLSearchParams): Promise<string> {
    const settings = oauth(this.config);
    const state = params.get("state");
    if (!state) throw new OAuthProtocolError("invalid_request", "Missing OAuth state");
    const transaction = await this.store.takeTransaction(state);
    if (!transaction || transaction.expiresAt <= Date.now()) {
      throw new OAuthProtocolError("invalid_request", "OAuth state is invalid or expired");
    }

    const downstream = new URL(transaction.redirectUri);
    const gitlabError = params.get("error");
    if (gitlabError) {
      downstream.searchParams.set("error", gitlabError);
      const description = params.get("error_description");
      if (description) downstream.searchParams.set("error_description", description);
      if (transaction.downstreamState) downstream.searchParams.set("state", transaction.downstreamState);
      downstream.searchParams.set("iss", settings.publicBaseUrl);
      return downstream.toString();
    }

    const code = params.get("code");
    if (!code) throw new OAuthProtocolError("invalid_request", "GitLab authorization code is missing");
    const gitlabTokens = await this.exchangeGitLabAuthorizationCode(code, transaction);
    const identity = await this.fetchGitLabIdentity(gitlabTokens.accessToken);
    const downstreamCode = randomToken(32);
    const codeRecord: OAuthAuthorizationCodeRecord = {
      codeHash: tokenHash(downstreamCode),
      clientId: transaction.clientId,
      redirectUri: transaction.redirectUri,
      downstreamCodeChallenge: transaction.downstreamCodeChallenge,
      scopes: transaction.scopes,
      gitlabTokens,
      identity,
      expiresAt: Date.now() + settings.authorizationCodeTtlSeconds * 1000,
    };
    await this.store.putAuthorizationCode(codeRecord);

    downstream.searchParams.set("code", downstreamCode);
    if (transaction.downstreamState) downstream.searchParams.set("state", transaction.downstreamState);
    downstream.searchParams.set("iss", settings.publicBaseUrl);
    return downstream.toString();
  }

  async exchangeToken(
    body: URLSearchParams,
    headers: IncomingHttpHeaders,
  ): Promise<Record<string, unknown>> {
    const grantType = body.get("grant_type");
    if (grantType === "authorization_code") {
      return this.exchangeAuthorizationCode(body, headers);
    }
    if (grantType === "refresh_token") {
      return this.exchangeRefreshToken(body, headers);
    }
    throw new OAuthProtocolError("unsupported_grant_type", "Unsupported grant_type");
  }

  async authenticateAccessToken(rawToken: string): Promise<RequestAuthContext | undefined> {
    const session = await this.store.getSessionByAccessToken(rawToken);
    if (!session || session.accessExpiresAt <= Date.now()) return undefined;
    const updated = await this.ensureGitLabAccessToken(session);
    return {
      gitlabToken: updated.gitlabTokens.accessToken,
      gitlabTokenType: "bearer",
      scopes: new Set(updated.scopes),
      identity: updated.identity,
      sessionId: updated.id,
    };
  }

  private async resolveClient(clientId: string): Promise<OAuthClientRecord> {
    const settings = oauth(this.config);
    if (clientId.startsWith("https://")) {
      if (!settings.cimdEnabled) {
        throw new OAuthProtocolError("unauthorized_client", "Client ID Metadata Documents are disabled", 401);
      }
      return this.fetchClientMetadata(clientId);
    }
    const client = await this.store.getClient(clientId);
    if (!client) throw new OAuthProtocolError("unauthorized_client", "Unknown OAuth client", 401);
    return client;
  }

  private async fetchClientMetadata(clientId: string): Promise<OAuthClientRecord> {
    const cached = this.clientMetadataCache.get(clientId);
    if (cached && cached.expiresAt > Date.now()) return cached.client;

    const settings = oauth(this.config);
    let url: URL;
    try {
      url = new URL(clientId);
    } catch {
      throw new OAuthProtocolError("invalid_client", "CIMD client_id must be a valid HTTPS URL", 401);
    }
    if (url.protocol !== "https:" || url.pathname === "/" || url.username || url.password) {
      throw new OAuthProtocolError("invalid_client", "CIMD client_id must be an HTTPS URL with a path", 401);
    }
    const host = url.hostname.toLowerCase();
    if (settings.cimdAllowedHosts.size > 0 && !settings.cimdAllowedHosts.has(host)) {
      throw new OAuthProtocolError("unauthorized_client", "CIMD client host is not allowlisted", 401);
    }
    if (!settings.cimdAllowPrivateNetwork) {
      if (isIP(host) && isPrivateAddress(host)) {
        throw new OAuthProtocolError("unauthorized_client", "CIMD private-network targets are blocked", 401);
      }
      if (!isIP(host)) {
        let addresses: Awaited<ReturnType<typeof lookup>>;
        try {
          addresses = await lookup(host, { all: true, verbatim: true });
        } catch {
          throw new OAuthProtocolError("invalid_client", "Unable to resolve CIMD client host", 401);
        }
        if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
          throw new OAuthProtocolError("unauthorized_client", "CIMD host resolves to a blocked network", 401);
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(settings.cimdFetchTimeoutMs),
      });
    } catch {
      throw new OAuthProtocolError("invalid_client", "Unable to fetch CIMD metadata document", 401);
    }
    if (!response.ok) {
      throw new OAuthProtocolError("invalid_client", `CIMD metadata returned HTTP ${response.status}`, 401);
    }
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > CIMD_MAX_BYTES) {
      throw new OAuthProtocolError("invalid_client", "CIMD metadata document is too large", 401);
    }
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > CIMD_MAX_BYTES) {
      throw new OAuthProtocolError("invalid_client", "CIMD metadata document is too large", 401);
    }

    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new OAuthProtocolError("invalid_client", "CIMD metadata document is not valid JSON", 401);
    }
    if (metadata.client_id !== clientId) {
      throw new OAuthProtocolError("invalid_client", "CIMD client_id must match the metadata document URL exactly", 401);
    }
    if (typeof metadata.client_name !== "string" || !metadata.client_name.trim()) {
      throw new OAuthProtocolError("invalid_client", "CIMD client_name is required", 401);
    }
    if (!Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.length === 0) {
      throw new OAuthProtocolError("invalid_client", "CIMD redirect_uris is required", 401);
    }
    const redirectUris = metadata.redirect_uris.map((entry) => validateRedirectUri(String(entry)));
    const method = String(metadata.token_endpoint_auth_method ?? "none");
    if (method !== "none") {
      throw new OAuthProtocolError("invalid_client", "This release supports public CIMD clients with token_endpoint_auth_method=none", 401);
    }
    if (Array.isArray(metadata.grant_types) && !metadata.grant_types.includes("authorization_code")) {
      throw new OAuthProtocolError("unauthorized_client", "CIMD client does not allow authorization_code", 401);
    }
    if (Array.isArray(metadata.response_types) && !metadata.response_types.includes("code")) {
      throw new OAuthProtocolError("unauthorized_client", "CIMD client does not allow response_type=code", 401);
    }

    const client: OAuthClientRecord = {
      clientId,
      clientName: metadata.client_name.trim().slice(0, 200),
      redirectUris,
      tokenEndpointAuthMethod: "none",
      createdAt: Date.now(),
    };
    this.clientMetadataCache.set(clientId, {
      client,
      expiresAt: Date.now() + cacheSeconds(response.headers.get("cache-control")) * 1000,
    });
    return client;
  }

  private async authenticateClient(
    body: URLSearchParams,
    headers: IncomingHttpHeaders,
  ): Promise<OAuthClientRecord> {
    const basic = parseClientBasicAuth(headers);
    const clientId = basic?.clientId || body.get("client_id") || "";
    const client = await this.resolveClient(clientId);
    if (client.tokenEndpointAuthMethod === "none") return client;
    const suppliedSecret = basic?.clientSecret || body.get("client_secret") || "";
    if (!client.clientSecretSalt || !client.clientSecretHash || !suppliedSecret) {
      throw new OAuthProtocolError("invalid_client", "Client authentication failed", 401);
    }
    if (!verifyClientSecret(suppliedSecret, client.clientSecretSalt, client.clientSecretHash)) {
      throw new OAuthProtocolError("invalid_client", "Client authentication failed", 401);
    }
    return client;
  }

  private async exchangeAuthorizationCode(
    body: URLSearchParams,
    headers: IncomingHttpHeaders,
  ): Promise<Record<string, unknown>> {
    const settings = oauth(this.config);
    const client = await this.authenticateClient(body, headers);
    const rawCode = body.get("code");
    const redirectUriRaw = body.get("redirect_uri");
    const verifier = body.get("code_verifier");
    if (!rawCode || !redirectUriRaw || !verifier) {
      throw new OAuthProtocolError("invalid_request", "code, redirect_uri, and code_verifier are required");
    }
    const code = await this.store.takeAuthorizationCode(rawCode);
    if (!code || code.expiresAt <= Date.now()) {
      throw new OAuthProtocolError("invalid_grant", "Authorization code is invalid or expired");
    }
    const redirectUri = validateRedirectUri(redirectUriRaw);
    if (code.clientId !== client.clientId || code.redirectUri !== redirectUri) {
      throw new OAuthProtocolError("invalid_grant", "Authorization code client or redirect URI mismatch");
    }
    if (!verifyPkce(verifier, code.downstreamCodeChallenge)) {
      throw new OAuthProtocolError("invalid_grant", "PKCE verification failed");
    }

    const accessToken = randomToken(32);
    const refreshToken = randomToken(48);
    const now = Date.now();
    const session: OAuthSessionRecord = {
      id: randomToken(24),
      clientId: client.clientId,
      accessTokenHash: tokenHash(accessToken),
      refreshTokenHash: tokenHash(refreshToken),
      scopes: code.scopes,
      gitlabTokens: code.gitlabTokens,
      identity: code.identity,
      accessExpiresAt: now + settings.accessTokenTtlSeconds * 1000,
      refreshExpiresAt: now + settings.refreshTokenTtlSeconds * 1000,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.putSession(session);
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: settings.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: session.scopes.join(" "),
    };
  }

  private async exchangeRefreshToken(
    body: URLSearchParams,
    headers: IncomingHttpHeaders,
  ): Promise<Record<string, unknown>> {
    const settings = oauth(this.config);
    const client = await this.authenticateClient(body, headers);
    const rawRefresh = body.get("refresh_token");
    if (!rawRefresh) throw new OAuthProtocolError("invalid_request", "refresh_token is required");
    const session = await this.store.getSessionByRefreshToken(rawRefresh);
    if (!session || session.clientId !== client.clientId || session.refreshExpiresAt <= Date.now()) {
      throw new OAuthProtocolError("invalid_grant", "Refresh token is invalid or expired");
    }

    const updated = await this.ensureGitLabAccessToken(session, true);
    const accessToken = randomToken(32);
    const refreshToken = randomToken(48);
    const now = Date.now();
    updated.accessTokenHash = tokenHash(accessToken);
    updated.refreshTokenHash = tokenHash(refreshToken);
    updated.accessExpiresAt = now + settings.accessTokenTtlSeconds * 1000;
    updated.refreshExpiresAt = now + settings.refreshTokenTtlSeconds * 1000;
    updated.updatedAt = now;
    const rotated = await this.store.rotateSessionByRefreshToken(rawRefresh, updated);
    if (!rotated) {
      throw new OAuthProtocolError("invalid_grant", "Refresh token was already used", 401);
    }
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: settings.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: updated.scopes.join(" "),
    };
  }

  private async exchangeGitLabAuthorizationCode(
    code: string,
    transaction: OAuthTransactionRecord,
  ): Promise<GitLabOAuthTokenSet> {
    const settings = oauth(this.config);
    const body = new URLSearchParams({
      client_id: settings.gitlabClientId,
      client_secret: settings.gitlabClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${settings.publicBaseUrl}/oauth/gitlab/callback`,
      code_verifier: transaction.gitlabPkceVerifier,
    });
    return this.requestGitLabToken(body);
  }

  private async refreshGitLabToken(tokens: GitLabOAuthTokenSet): Promise<GitLabOAuthTokenSet> {
    const settings = oauth(this.config);
    if (!tokens.refreshToken) {
      throw new OAuthProtocolError("invalid_grant", "GitLab refresh token is unavailable", 401);
    }
    const body = new URLSearchParams({
      client_id: settings.gitlabClientId,
      client_secret: settings.gitlabClientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      redirect_uri: `${settings.publicBaseUrl}/oauth/gitlab/callback`,
    });
    return this.requestGitLabToken(body);
  }

  private async requestGitLabToken(body: URLSearchParams): Promise<GitLabOAuthTokenSet> {
    const response = await fetch(`${this.config.gitlabHost}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const parsed = (await response.json().catch(() => ({}))) as Partial<GitLabTokenResponse> & {
      error?: string;
      error_description?: string;
    };
    if (!response.ok || !parsed.access_token) {
      throw new OAuthProtocolError(
        "invalid_grant",
        parsed.error_description || parsed.error || `GitLab token exchange failed with ${response.status}`,
        401,
      );
    }
    const expiresIn = Number(parsed.expires_in ?? 7200);
    return {
      accessToken: parsed.access_token,
      ...(parsed.refresh_token ? { refreshToken: parsed.refresh_token } : {}),
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
      ...(parsed.scope ? { scope: parsed.scope } : {}),
    };
  }

  private async fetchGitLabIdentity(accessToken: string): Promise<GitLabIdentity> {
    const response = await fetch(`${this.config.gitlabHost}/api/v4/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!response.ok) {
      throw new OAuthProtocolError("access_denied", "Unable to resolve the authorized GitLab user", 401);
    }
    const user = (await response.json()) as GitLabUserResponse;
    return {
      ...(typeof user.id === "number" ? { id: user.id } : {}),
      ...(user.username ? { username: user.username } : {}),
      ...(user.name ? { name: user.name } : {}),
    };
  }

  private async ensureGitLabAccessToken(
    session: OAuthSessionRecord,
    forceRefresh = false,
  ): Promise<OAuthSessionRecord> {
    if (!forceRefresh && session.gitlabTokens.expiresAt > Date.now() + 60_000) {
      return session;
    }
    try {
      session.gitlabTokens = await this.refreshGitLabToken(session.gitlabTokens);
      session.updatedAt = Date.now();
      await this.store.updateSession(session);
      return session;
    } catch (error) {
      const latest = await this.store.getSessionById(session.id);
      if (
        latest &&
        latest.updatedAt > session.updatedAt &&
        latest.gitlabTokens.expiresAt > Date.now() + 30_000
      ) {
        return latest;
      }
      await this.store.deleteSession(session.id);
      if (error instanceof OAuthProtocolError) throw error;
      throw new OAuthProtocolError("invalid_grant", "GitLab authorization can no longer be refreshed", 401);
    }
  }
}

export const oauthScopes = { read: READ_SCOPE, write: WRITE_SCOPE } as const;
