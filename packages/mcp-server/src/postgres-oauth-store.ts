import { Pool } from "pg";

import { decryptJson, encryptJson, tokenHash, type EncryptedEnvelope } from "./oauth-crypto.js";
import type {
  OAuthAuthorizationCodeRecord,
  OAuthClientRecord,
  OAuthSessionRecord,
  OAuthStoreBackend,
  OAuthTransactionRecord,
} from "./oauth-store.js";

function encode<T>(value: T, key: Buffer): string {
  return JSON.stringify(encryptJson(value, key));
}

function decode<T>(value: string, key: Buffer): T {
  return decryptJson<T>(JSON.parse(value) as EncryptedEnvelope, key);
}

export class PostgresOAuthStore implements OAuthStoreBackend {
  private readonly pool: Pool;

  constructor(
    databaseUrl: string,
    private readonly key: Buffer,
  ) {
    this.pool = new Pool({ connectionString: databaseUrl, max: 10 });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS codex_glab_oauth_clients (
        client_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS codex_glab_oauth_transactions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS codex_glab_oauth_codes (
        code_hash TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS codex_glab_oauth_sessions (
        id TEXT PRIMARY KEY,
        access_token_hash TEXT UNIQUE NOT NULL,
        refresh_token_hash TEXT UNIQUE NOT NULL,
        payload TEXT NOT NULL,
        access_expires_at BIGINT NOT NULL,
        refresh_expires_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS codex_glab_oauth_sessions_access_idx
        ON codex_glab_oauth_sessions(access_token_hash);
      CREATE INDEX IF NOT EXISTS codex_glab_oauth_sessions_refresh_idx
        ON codex_glab_oauth_sessions(refresh_token_hash);
      CREATE INDEX IF NOT EXISTS codex_glab_oauth_transactions_expiry_idx
        ON codex_glab_oauth_transactions(expires_at);
      CREATE INDEX IF NOT EXISTS codex_glab_oauth_codes_expiry_idx
        ON codex_glab_oauth_codes(expires_at);
      CREATE INDEX IF NOT EXISTS codex_glab_oauth_sessions_expiry_idx
        ON codex_glab_oauth_sessions(refresh_expires_at);
    `);
    await this.cleanup();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async cleanup(now = Date.now()): Promise<void> {
    await this.pool.query("DELETE FROM codex_glab_oauth_transactions WHERE expires_at <= $1", [now]);
    await this.pool.query("DELETE FROM codex_glab_oauth_codes WHERE expires_at <= $1", [now]);
    await this.pool.query("DELETE FROM codex_glab_oauth_sessions WHERE refresh_expires_at <= $1", [now]);
  }

  async putClient(client: OAuthClientRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO codex_glab_oauth_clients(client_id, payload, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id) DO UPDATE SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at`,
      [client.clientId, encode(client, this.key), client.createdAt],
    );
  }

  async getClient(clientId: string): Promise<OAuthClientRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      "SELECT payload FROM codex_glab_oauth_clients WHERE client_id = $1",
      [clientId],
    );
    return result.rowCount ? decode<OAuthClientRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async putTransaction(transaction: OAuthTransactionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO codex_glab_oauth_transactions(id, payload, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
      [transaction.id, encode(transaction, this.key), transaction.expiresAt],
    );
  }

  async takeTransaction(id: string): Promise<OAuthTransactionRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      `DELETE FROM codex_glab_oauth_transactions
       WHERE id = $1 AND expires_at > $2
       RETURNING payload`,
      [id, Date.now()],
    );
    return result.rowCount ? decode<OAuthTransactionRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async putAuthorizationCode(code: OAuthAuthorizationCodeRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO codex_glab_oauth_codes(code_hash, payload, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (code_hash) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`,
      [code.codeHash, encode(code, this.key), code.expiresAt],
    );
  }

  async takeAuthorizationCode(rawCode: string): Promise<OAuthAuthorizationCodeRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      `DELETE FROM codex_glab_oauth_codes
       WHERE code_hash = $1 AND expires_at > $2
       RETURNING payload`,
      [tokenHash(rawCode), Date.now()],
    );
    return result.rowCount ? decode<OAuthAuthorizationCodeRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async putSession(session: OAuthSessionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO codex_glab_oauth_sessions(
         id, access_token_hash, refresh_token_hash, payload,
         access_expires_at, refresh_expires_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         access_token_hash = EXCLUDED.access_token_hash,
         refresh_token_hash = EXCLUDED.refresh_token_hash,
         payload = EXCLUDED.payload,
         access_expires_at = EXCLUDED.access_expires_at,
         refresh_expires_at = EXCLUDED.refresh_expires_at,
         updated_at = EXCLUDED.updated_at`,
      [
        session.id,
        session.accessTokenHash,
        session.refreshTokenHash,
        encode(session, this.key),
        session.accessExpiresAt,
        session.refreshExpiresAt,
        session.updatedAt,
      ],
    );
  }

  async getSessionById(sessionId: string): Promise<OAuthSessionRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      "SELECT payload FROM codex_glab_oauth_sessions WHERE id = $1 AND refresh_expires_at > $2",
      [sessionId, Date.now()],
    );
    return result.rowCount ? decode<OAuthSessionRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async getSessionByAccessToken(rawToken: string): Promise<OAuthSessionRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      `SELECT payload FROM codex_glab_oauth_sessions
       WHERE access_token_hash = $1 AND refresh_expires_at > $2`,
      [tokenHash(rawToken), Date.now()],
    );
    return result.rowCount ? decode<OAuthSessionRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async getSessionByRefreshToken(rawToken: string): Promise<OAuthSessionRecord | undefined> {
    const result = await this.pool.query<{ payload: string }>(
      `SELECT payload FROM codex_glab_oauth_sessions
       WHERE refresh_token_hash = $1 AND refresh_expires_at > $2`,
      [tokenHash(rawToken), Date.now()],
    );
    return result.rowCount ? decode<OAuthSessionRecord>(result.rows[0]!.payload, this.key) : undefined;
  }

  async updateSession(session: OAuthSessionRecord): Promise<void> {
    const result = await this.pool.query(
      `UPDATE codex_glab_oauth_sessions SET
         access_token_hash = $2,
         refresh_token_hash = $3,
         payload = $4,
         access_expires_at = $5,
         refresh_expires_at = $6,
         updated_at = $7
       WHERE id = $1`,
      [
        session.id,
        session.accessTokenHash,
        session.refreshTokenHash,
        encode(session, this.key),
        session.accessExpiresAt,
        session.refreshExpiresAt,
        session.updatedAt,
      ],
    );
    if (!result.rowCount) throw new Error("OAuth session no longer exists");
  }

  async rotateSessionByRefreshToken(rawRefreshToken: string, session: OAuthSessionRecord): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE codex_glab_oauth_sessions SET
         access_token_hash = $3,
         refresh_token_hash = $4,
         payload = $5,
         access_expires_at = $6,
         refresh_expires_at = $7,
         updated_at = $8
       WHERE id = $1 AND refresh_token_hash = $2 AND refresh_expires_at > $9`,
      [
        session.id,
        tokenHash(rawRefreshToken),
        session.accessTokenHash,
        session.refreshTokenHash,
        encode(session, this.key),
        session.accessExpiresAt,
        session.refreshExpiresAt,
        session.updatedAt,
        Date.now(),
      ],
    );
    return result.rowCount === 1;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query("DELETE FROM codex_glab_oauth_sessions WHERE id = $1", [sessionId]);
  }
}
