import { currentGitLabCredential, currentRequestAuth } from "./auth-context.js";
import type { ServerConfig } from "./config.js";

export interface GitLabPage<T> {
  data: T;
  pagination: {
    nextPage?: number;
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

export class GitLabApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GitLabApiError";
  }
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GitLabClient {
  constructor(private readonly config: ServerConfig) {}

  private authHeaders(): Record<string, string> {
    const credential = currentGitLabCredential(this.config);
    return credential.tokenType === "bearer"
      ? { Authorization: `Bearer ${credential.token}` }
      : { "PRIVATE-TOKEN": credential.token };
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      responseType?: "json" | "text";
      retry429?: boolean;
    } = {},
  ): Promise<GitLabPage<T>> {
    const requestAuth = currentRequestAuth();
    if (requestAuth && method !== "GET" && !requestAuth.scopes.has("gitlab:write")) {
      throw new GitLabApiError("OAuth scope gitlab:write is required for this operation", 403);
    }

    const url = new URL(`${this.config.gitlabHost}/api/v4${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let attempt = 0;
    const maxAttempts = options.retry429 === false ? 1 : 2;

    while (attempt < maxAttempts) {
      attempt += 1;
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...this.authHeaders(),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });

      if (response.status === 429) {
        const retryAfter = Math.min(parsePositiveInt(response.headers.get("retry-after")) ?? 1, 5);
        if (attempt < maxAttempts) {
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new GitLabApiError("GitLab rate limit exceeded", 429, retryAfter);
      }

      const responseType = options.responseType ?? "json";
      const raw = await response.text();
      let parsed: unknown = raw;
      if (responseType === "json" && raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
      }

      if (!response.ok) {
        const details =
          typeof parsed === "object" && parsed !== null
            ? JSON.stringify(parsed)
            : String(parsed || response.statusText);
        throw new GitLabApiError(
          `GitLab API ${method} ${path} failed with ${response.status}: ${details}`,
          response.status,
        );
      }

      const pagination: GitLabPage<T>["pagination"] = {};
      const nextPage = parsePositiveInt(response.headers.get("x-next-page"));
      const page = parsePositiveInt(response.headers.get("x-page"));
      const perPage = parsePositiveInt(response.headers.get("x-per-page"));
      const total = parsePositiveInt(response.headers.get("x-total"));
      const totalPages = parsePositiveInt(response.headers.get("x-total-pages"));

      if (nextPage !== undefined) pagination.nextPage = nextPage;
      if (page !== undefined) pagination.page = page;
      if (perPage !== undefined) pagination.perPage = perPage;
      if (total !== undefined) pagination.total = total;
      if (totalPages !== undefined) pagination.totalPages = totalPages;

      return {
        data: parsed as T,
        pagination,
      };
    }

    throw new GitLabApiError("GitLab request failed unexpectedly", 500);
  }
}

export function encodeProject(project: string | number): string {
  return encodeURIComponent(String(project));
}
