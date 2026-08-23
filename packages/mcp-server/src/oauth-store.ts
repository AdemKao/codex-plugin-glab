import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import type { GitLabIdentity } from "./auth-context.js";
import { decryptJson, encryptJson, tokenHash, type EncryptedEnvelope } from "./oauth-crypto.js";

export type MaybePromise<T> = T | Promise<T>;

export interface OAuthClientRecord {
  clientId: string;
  clientName?: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: "none" | "client_secret_post";
  clientSecretSalt?: string;
  clientSecretHash?: string;
  createdAt: number;
}

export interface GitLabOAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export interface OAuthTransactionRecord {
  id: string;
  clientId: string;
  redirectUri: string;
  downstreamState?: string | undefined;
  downstreamCodeChallenge: string;
  scopes: string[];
  gitlabPkceVerifier: string;
  expiresAt: number;
}

export interface OAuthAuthorizationCodeRecord {
  codeHash: string;
  clientId: string;
  redirectUri: string;
  downstreamCodeChallenge: string;
  scopes: string[];
  gitlabTokens: GitLabOAuthTokenSet;
  identity: GitLabIdentity;
  expiresAt: number;
}

export interface OAuthSessionRecord {
  id: string;
  clientId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  scopes: string[];
  gitlabTokens: GitLabOAuthTokenSet;
  identity: GitLabIdentity;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface OAuthStoreBackend {
  init(): MaybePromise<void>;
  close(): MaybePromise<void>;
  cleanup(now?: number): MaybePromise<void>;
  putClient(client: OAuthClientRecord): MaybePromise<void>;
  getClient(clientId: string): MaybePromise<OAuthClientRecord | undefined>;
  putTransaction(transaction: OAuthTransactionRecord): MaybePromise<void>;
  takeTransaction(id: string): MaybePromise<OAuthTransactionRecord | undefined>;
  putAuthorizationCode(code: OAuthAuthorizationCodeRecord): MaybePromise<void>;
  takeAuthorizationCode(rawCode: string): MaybePromise<OAuthAuthorizationCodeRecord | undefined>;
  putSession(session: OAuthSessionRecord): MaybePromise<void>;
  getSessionById(sessionId: string): MaybePromise<OAuthSessionRecord | undefined>;
  getSessionByAccessToken(rawToken: string): MaybePromise<OAuthSessionRecord | undefined>;
  getSessionByRefreshToken(rawToken: string): MaybePromise<OAuthSessionRecord | undefined>;
  updateSession(session: OAuthSessionRecord): MaybePromise<void>;
  rotateSessionByRefreshToken(rawRefreshToken: string, session: OAuthSessionRecord): MaybePromise<boolean>;
  deleteSession(sessionId: string): MaybePromise<void>;
}

interface OAuthStoreData {
  version: 1;
  clients: Record<string, OAuthClientRecord>;
  transactions: Record<string, OAuthTransactionRecord>;
  authorizationCodes: Record<string, OAuthAuthorizationCodeRecord>;
  sessions: Record<string, OAuthSessionRecord>;
}

function emptyStore(): OAuthStoreData {
  return {
    version: 1,
    clients: {},
    transactions: {},
    authorizationCodes: {},
    sessions: {},
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Encrypted single-process file backend. This backend intentionally remains
 * simple and is not safe for multiple server replicas writing the same file.
 * Read/write boundaries clone records so caller mutation cannot mutate the
 * persisted in-memory state before an explicit update/rotation operation.
 */
export class OAuthStore implements OAuthStoreBackend {
  private data: OAuthStoreData;

  constructor(
    private readonly path: string,
    private readonly key: Buffer,
  ) {
    this.data = this.load();
    this.cleanup();
  }

  init(): void {}
  close(): void {}

  private load(): OAuthStoreData {
    if (!existsSync(this.path)) return emptyStore();
    const raw = JSON.parse(readFileSync(this.path, "utf8")) as EncryptedEnvelope;
    const decoded = decryptJson<OAuthStoreData>(raw, this.key);
    if (decoded.version !== 1) {
      throw new Error(`Unsupported OAuth store data version: ${String(decoded.version)}`);
    }
    return decoded;
  }

  private save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tempPath = `${this.path}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(encryptJson(this.data, this.key))}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    renameSync(tempPath, this.path);
    try {
      chmodSync(this.path, 0o600);
    } catch {
      // Some mounted filesystems do not support chmod; encryption still protects store contents.
    }
  }

  cleanup(now = Date.now()): void {
    let changed = false;
    for (const [key, transaction] of Object.entries(this.data.transactions)) {
      if (transaction.expiresAt <= now) {
        delete this.data.transactions[key];
        changed = true;
      }
    }
    for (const [key, code] of Object.entries(this.data.authorizationCodes)) {
      if (code.expiresAt <= now) {
        delete this.data.authorizationCodes[key];
        changed = true;
      }
    }
    for (const [key, session] of Object.entries(this.data.sessions)) {
      if (session.refreshExpiresAt <= now) {
        delete this.data.sessions[key];
        changed = true;
      }
    }
    if (changed) this.save();
  }

  putClient(client: OAuthClientRecord): void {
    this.data.clients[client.clientId] = clone(client);
    this.save();
  }

  getClient(clientId: string): OAuthClientRecord | undefined {
    const client = this.data.clients[clientId];
    return client ? clone(client) : undefined;
  }

  putTransaction(transaction: OAuthTransactionRecord): void {
    this.cleanup();
    this.data.transactions[transaction.id] = clone(transaction);
    this.save();
  }

  takeTransaction(id: string): OAuthTransactionRecord | undefined {
    this.cleanup();
    const transaction = this.data.transactions[id];
    if (!transaction) return undefined;
    delete this.data.transactions[id];
    this.save();
    return clone(transaction);
  }

  putAuthorizationCode(code: OAuthAuthorizationCodeRecord): void {
    this.cleanup();
    this.data.authorizationCodes[code.codeHash] = clone(code);
    this.save();
  }

  takeAuthorizationCode(rawCode: string): OAuthAuthorizationCodeRecord | undefined {
    this.cleanup();
    const hash = tokenHash(rawCode);
    const code = this.data.authorizationCodes[hash];
    if (!code) return undefined;
    delete this.data.authorizationCodes[hash];
    this.save();
    return clone(code);
  }

  putSession(session: OAuthSessionRecord): void {
    this.cleanup();
    this.data.sessions[session.id] = clone(session);
    this.save();
  }

  getSessionById(sessionId: string): OAuthSessionRecord | undefined {
    this.cleanup();
    const session = this.data.sessions[sessionId];
    return session ? clone(session) : undefined;
  }

  getSessionByAccessToken(rawToken: string): OAuthSessionRecord | undefined {
    this.cleanup();
    const hash = tokenHash(rawToken);
    const session = Object.values(this.data.sessions).find((entry) => entry.accessTokenHash === hash);
    return session ? clone(session) : undefined;
  }

  getSessionByRefreshToken(rawToken: string): OAuthSessionRecord | undefined {
    this.cleanup();
    const hash = tokenHash(rawToken);
    const session = Object.values(this.data.sessions).find((entry) => entry.refreshTokenHash === hash);
    return session ? clone(session) : undefined;
  }

  updateSession(session: OAuthSessionRecord): void {
    if (!this.data.sessions[session.id]) {
      throw new Error("OAuth session no longer exists");
    }
    this.data.sessions[session.id] = clone(session);
    this.save();
  }

  rotateSessionByRefreshToken(rawRefreshToken: string, session: OAuthSessionRecord): boolean {
    this.cleanup();
    const current = this.data.sessions[session.id];
    if (!current || current.refreshTokenHash !== tokenHash(rawRefreshToken)) return false;
    this.data.sessions[session.id] = clone(session);
    this.save();
    return true;
  }

  deleteSession(sessionId: string): void {
    if (this.data.sessions[sessionId]) {
      delete this.data.sessions[sessionId];
      this.save();
    }
  }
}
