import type { ServerConfig } from "./config.js";

export class PolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}

export function assertProjectAllowed(config: ServerConfig, project: string | number): void {
  if (config.allowedProjects.size === 0) return;
  const candidate = String(project);
  if (!config.allowedProjects.has(candidate)) {
    throw new PolicyError(
      `Project ${candidate} is not in GITLAB_ALLOWED_PROJECTS`,
    );
  }
}

export function assertWriteEnabled(config: ServerConfig): void {
  if (!config.writeEnabled) {
    throw new PolicyError(
      "Write tools are disabled. Set GITLAB_WRITE_ENABLED=true to enable them.",
    );
  }
}

export function assertMergeEnabled(config: ServerConfig): void {
  assertWriteEnabled(config);
  if (!config.mergeEnabled) {
    throw new PolicyError(
      "Merge is disabled. Set GITLAB_MERGE_ENABLED=true in addition to GITLAB_WRITE_ENABLED=true.",
    );
  }
}
