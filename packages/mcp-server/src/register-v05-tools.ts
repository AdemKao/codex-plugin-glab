import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import type { ServerConfig } from "./config.js";
import { GitLabClient, encodeProject } from "./gitlab-client.js";
import { assertProjectAllowed, assertWriteEnabled } from "./policy.js";

const projectSchema = z.union([z.string().min(1), z.number().int().positive()]);
const iidSchema = z.number().int().positive();
const pageSchema = z.number().int().min(1).optional();
const perPageSchema = z.number().int().min(1).max(100).optional();

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const destructiveAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

function ok(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

async function safe(action: () => Promise<unknown>) {
  try {
    return ok(await action());
  } catch (error) {
    return fail(error);
  }
}

function projectPath(config: ServerConfig, project: string | number): string {
  assertProjectAllowed(config, project);
  return `/projects/${encodeProject(project)}`;
}

function encodeFilePath(path: string): string {
  return encodeURIComponent(path.replace(/^\/+/, ""));
}

export function registerGitLabV05Tools(
  server: McpServer,
  config: ServerConfig,
  client: GitLabClient,
): void {
  server.registerTool(
    "gitlab_get_repository_tree",
    {
      description: "List files and directories in a GitLab repository tree.",
      inputSchema: z.object({
        project: projectSchema,
        path: z.string().optional(),
        ref: z.string().optional(),
        recursive: z.boolean().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      }),
      annotations: readAnnotations,
    },
    async ({ project, path, ref, recursive, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/repository/tree`, {
          query: { path, ref, recursive, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_get_repository_file",
    {
      description: "Read one repository file at a GitLab ref. GitLab returns file content base64-encoded with metadata.",
      inputSchema: z.object({
        project: projectSchema,
        filePath: z.string().min(1),
        ref: z.string().min(1),
      }),
      annotations: readAnnotations,
    },
    async ({ project, filePath, ref }) =>
      safe(async () =>
        (await client.request(
          "GET",
          `${projectPath(config, project)}/repository/files/${encodeFilePath(filePath)}`,
          { query: { ref } },
        )).data,
      ),
  );

  server.registerTool(
    "gitlab_create_repository_file",
    {
      description: "Create a repository file and commit it to a branch. Requires writes enabled and gitlab:write in OAuth mode.",
      inputSchema: z.object({
        project: projectSchema,
        filePath: z.string().min(1),
        branch: z.string().min(1),
        content: z.string(),
        commitMessage: z.string().min(1),
        encoding: z.enum(["text", "base64"]).optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, filePath, branch, content, commitMessage, encoding }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/repository/files/${encodeFilePath(filePath)}`,
          { body: { branch, content, commit_message: commitMessage, encoding } },
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_update_repository_file",
    {
      description: "Update a repository file and commit it. lastCommitId can provide optimistic concurrency protection.",
      inputSchema: z.object({
        project: projectSchema,
        filePath: z.string().min(1),
        branch: z.string().min(1),
        content: z.string(),
        commitMessage: z.string().min(1),
        encoding: z.enum(["text", "base64"]).optional(),
        lastCommitId: z.string().min(1).optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, filePath, branch, content, commitMessage, encoding, lastCommitId }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "PUT",
          `${projectPath(config, project)}/repository/files/${encodeFilePath(filePath)}`,
          {
            body: {
              branch,
              content,
              commit_message: commitMessage,
              encoding,
              last_commit_id: lastCommitId,
            },
          },
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_delete_repository_file",
    {
      description: "Delete a repository file with a commit. Requires writes enabled and is marked destructive.",
      inputSchema: z.object({
        project: projectSchema,
        filePath: z.string().min(1),
        branch: z.string().min(1),
        commitMessage: z.string().min(1),
        lastCommitId: z.string().min(1).optional(),
      }),
      annotations: destructiveAnnotations,
    },
    async ({ project, filePath, branch, commitMessage, lastCommitId }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "DELETE",
          `${projectPath(config, project)}/repository/files/${encodeFilePath(filePath)}`,
          { body: { branch, commit_message: commitMessage, last_commit_id: lastCommitId } },
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_approve_merge_request",
    {
      description: "Approve a merge request as the authenticated GitLab user. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema, sha: z.string().min(1).optional() }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, sha }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/merge_requests/${iid}/approve`,
          { body: { sha } },
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_unapprove_merge_request",
    {
      description: "Remove the authenticated user's approval from a merge request. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema }),
      annotations: writeAnnotations,
    },
    async ({ project, iid }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/merge_requests/${iid}/unapprove`,
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_create_merge_request_discussion",
    {
      description: "Create a merge request discussion thread. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema, body: z.string().min(1) }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, body }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/merge_requests/${iid}/discussions`,
          { body: { body } },
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_retry_pipeline",
    {
      description: "Retry failed/canceled jobs in a pipeline. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, pipelineId: z.number().int().positive() }),
      annotations: writeAnnotations,
    },
    async ({ project, pipelineId }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/pipelines/${pipelineId}/retry`,
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_cancel_pipeline",
    {
      description: "Cancel a running pipeline. Requires writes enabled and is marked destructive.",
      inputSchema: z.object({ project: projectSchema, pipelineId: z.number().int().positive() }),
      annotations: destructiveAnnotations,
    },
    async ({ project, pipelineId }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/pipelines/${pipelineId}/cancel`,
        )).data;
      }),
  );

  server.registerTool(
    "gitlab_create_pipeline",
    {
      description: "Create a new pipeline for a ref with optional CI/CD variables. Requires writes enabled.",
      inputSchema: z.object({
        project: projectSchema,
        ref: z.string().min(1),
        variables: z.array(z.object({
          key: z.string().min(1),
          value: z.string(),
          variableType: z.enum(["env_var", "file"]).optional(),
        })).max(50).optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, ref, variables }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request(
          "POST",
          `${projectPath(config, project)}/pipeline`,
          {
            body: {
              ref,
              variables: variables?.map((variable) => ({
                key: variable.key,
                value: variable.value,
                variable_type: variable.variableType,
              })),
            },
          },
        )).data;
      }),
  );
}
