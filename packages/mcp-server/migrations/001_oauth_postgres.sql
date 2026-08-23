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
