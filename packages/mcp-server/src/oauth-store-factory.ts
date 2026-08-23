import type { OAuthConfig } from "./config.js";
import { OAuthStore, type OAuthStoreBackend } from "./oauth-store.js";
import { PostgresOAuthStore } from "./postgres-oauth-store.js";

export function createOAuthStore(config: OAuthConfig): OAuthStoreBackend {
  if (config.storeDriver === "postgres") {
    if (!config.databaseUrl) throw new Error("OAuth PostgreSQL store requires databaseUrl");
    return new PostgresOAuthStore(config.databaseUrl, config.encryptionKey);
  }
  return new OAuthStore(config.storePath, config.encryptionKey);
}
