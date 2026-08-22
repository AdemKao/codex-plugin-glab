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
    return this.config.gitlabTokenType === "bearer"
      ? { Authorization: `Bearer ${this.config.gitlabToken}` }
      : { "PRIVATE-TOKEN": this.config.gitlabToken };
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
      const raw = responseType === "text" ? await response.text() : await response.text();
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

      return {
        data: parsed as T,
        pagination: {
          ...(parsePositiveInt(response.headers.get("x-next-page")) !== undefined
            ? { nextPage: parsePositiveInt(response.headers.get("x-next-page")) }
            : {}),
          ...(parsePositiveInt(response.headers.get("x-page")) !== undefined
            ? { page: parsePositiveInt(response.headers.get("x-page")) }
            : {}),
          ...(parsePositiveInt(response.headers.get("x-per-page")) !== undefined
            ? { perPage: parsePositiveInt(response.headers.get("x-per-page")) }
            : {}),
          ...(parsePositiveInt(response.headers.get("x-total")) !== undefined
            ? { total: parsePositiveInt(response.headers.get("x-total")) }
            : {}),
          ...(parsePositiveInt(response.headers.get("x-total-pages")) !== undefined
            ? { totalPages: parsePositiveInt(response.headers.get("x-total-pages")) }
            : {}),
        },
      };
    }

    throw new GitLabApiError("GitLab request failed unexpectedly", 500);
  }
}

export function encodeProject(project: string | number): string {
  return encodeURIComponent(String(project));
}
