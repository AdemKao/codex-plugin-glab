import { AsyncLocalStorage } from "node:async_hooks";

import type { GitLabTokenType, ServerConfig } from "./config.js";

export interface GitLabIdentity {
  id?: number;
  username?: string;
  name?: string;
}

export interface RequestAuthContext {
  gitlabToken: string;
  gitlabTokenType: GitLabTokenType;
  scopes: Set<string>;
  identity?: GitLabIdentity;
  sessionId?: string;
}

const requestAuth = new AsyncLocalStorage<RequestAuthContext>();

export function runWithRequestAuth<T>(context: RequestAuthContext, action: () => T): T {
  return requestAuth.run(context, action);
}

export function currentRequestAuth(): RequestAuthContext | undefined {
  return requestAuth.getStore();
}

export function currentGitLabCredential(config: ServerConfig): {
  token: string;
  tokenType: GitLabTokenType;
} {
  const contextual = currentRequestAuth();
  if (contextual) {
    return { token: contextual.gitlabToken, tokenType: contextual.gitlabTokenType };
  }
  if (!config.gitlabToken) {
    throw new Error("No GitLab credential is available for this request");
  }
  return { token: config.gitlabToken, tokenType: config.gitlabTokenType };
}

export function assertRequestScope(scope: string): void {
  const context = currentRequestAuth();
  if (context && !context.scopes.has(scope)) {
    throw new Error(`OAuth scope ${scope} is required for this operation`);
  }
}
