import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import type { ServerConfig } from "./config.js";
import { GitLabClient, encodeProject } from "./gitlab-client.js";
import {
  assertMergeEnabled,
  assertProjectAllowed,
  assertWriteEnabled,
} from "./policy.js";

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

const mergeAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

function ok(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function okText(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
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

export function registerGitLabTools(
  server: McpServer,
  config: ServerConfig,
  client = new GitLabClient(config),
): void {
  server.registerTool(
    "gitlab_get_current_user",
    {
      description: "Get the GitLab user represented by the configured token.",
      inputSchema: z.object({}),
      annotations: readAnnotations,
    },
    async () => safe(async () => (await client.request("GET", "/user")).data),
  );

  server.registerTool(
    "gitlab_list_groups",
    {
      description: "List GitLab groups visible to the configured token.",
      inputSchema: z.object({
        search: z.string().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      }),
      annotations: readAnnotations,
    },
    async ({ search, page, perPage }) =>
      safe(async () => {
        const response = await client.request<unknown[]>("GET", "/groups", {
          query: {
            min_access_level: 10,
            search,
            page,
            per_page: perPage ?? 50,
          },
        });
        return response;
      }),
  );

  server.registerTool(
    "gitlab_list_projects",
    {
      description: "List GitLab projects the configured user is a member of.",
      inputSchema: z.object({
        search: z.string().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      }),
      annotations: readAnnotations,
    },
    async ({ search, page, perPage }) =>
      safe(async () => {
        const response = await client.request<Record<string, unknown>[]>("GET", "/projects", {
          query: {
            membership: true,
            simple: true,
            order_by: "last_activity_at",
            sort: "desc",
            search,
            page,
            per_page: perPage ?? 50,
          },
        });
        if (config.allowedProjects.size > 0) {
          response.data = response.data.filter((project) => {
            const id = String(project.id ?? "");
            const path = String(project.path_with_namespace ?? "");
            return config.allowedProjects.has(id) || config.allowedProjects.has(path);
          });
        }
        return response;
      }),
  );

  server.registerTool(
    "gitlab_get_project",
    {
      description: "Get one GitLab project by numeric ID or namespace/project path.",
      inputSchema: z.object({ project: projectSchema }),
      annotations: readAnnotations,
    },
    async ({ project }) =>
      safe(async () => (await client.request("GET", projectPath(config, project))).data),
  );

  server.registerTool(
    "gitlab_list_branches",
    {
      description: "List repository branches for a GitLab project.",
      inputSchema: z.object({ project: projectSchema, search: z.string().optional(), page: pageSchema, perPage: perPageSchema }),
      annotations: readAnnotations,
    },
    async ({ project, search, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/repository/branches`, {
          query: { search, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_list_commits",
    {
      description: "List commits for a GitLab project, optionally scoped to a ref.",
      inputSchema: z.object({ project: projectSchema, refName: z.string().optional(), page: pageSchema, perPage: perPageSchema }),
      annotations: readAnnotations,
    },
    async ({ project, refName, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/repository/commits`, {
          query: { ref_name: refName, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_list_issues",
    {
      description: "List issues in a GitLab project.",
      inputSchema: z.object({
        project: projectSchema,
        state: z.enum(["opened", "closed", "all"]).optional(),
        search: z.string().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      }),
      annotations: readAnnotations,
    },
    async ({ project, state, search, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/issues`, {
          query: { state, search, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_get_issue",
    {
      description: "Get one GitLab project issue by IID.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema }),
      annotations: readAnnotations,
    },
    async ({ project, iid }) =>
      safe(async () =>
        (await client.request("GET", `${projectPath(config, project)}/issues/${iid}`)).data,
      ),
  );

  server.registerTool(
    "gitlab_list_merge_requests",
    {
      description: "List merge requests in a GitLab project.",
      inputSchema: z.object({
        project: projectSchema,
        state: z.enum(["opened", "closed", "locked", "merged", "all"]).optional(),
        search: z.string().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      }),
      annotations: readAnnotations,
    },
    async ({ project, state, search, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/merge_requests`, {
          query: { state, search, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_get_merge_request",
    {
      description: "Get one GitLab merge request by IID.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema }),
      annotations: readAnnotations,
    },
    async ({ project, iid }) =>
      safe(async () =>
        (await client.request("GET", `${projectPath(config, project)}/merge_requests/${iid}`)).data,
      ),
  );

  server.registerTool(
    "gitlab_get_merge_request_diffs",
    {
      description: "Get file diffs for one GitLab merge request.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema, page: pageSchema, perPage: perPageSchema }),
      annotations: readAnnotations,
    },
    async ({ project, iid, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/merge_requests/${iid}/diffs`, {
          query: { page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_list_pipelines",
    {
      description: "List CI/CD pipelines for a GitLab project.",
      inputSchema: z.object({ project: projectSchema, ref: z.string().optional(), status: z.string().optional(), page: pageSchema, perPage: perPageSchema }),
      annotations: readAnnotations,
    },
    async ({ project, ref, status, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/pipelines`, {
          query: { ref, status, page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_get_pipeline",
    {
      description: "Get one GitLab pipeline by pipeline ID.",
      inputSchema: z.object({ project: projectSchema, pipelineId: z.number().int().positive() }),
      annotations: readAnnotations,
    },
    async ({ project, pipelineId }) =>
      safe(async () =>
        (await client.request("GET", `${projectPath(config, project)}/pipelines/${pipelineId}`)).data,
      ),
  );

  server.registerTool(
    "gitlab_list_pipeline_jobs",
    {
      description: "List jobs belonging to one GitLab pipeline.",
      inputSchema: z.object({ project: projectSchema, pipelineId: z.number().int().positive(), page: pageSchema, perPage: perPageSchema }),
      annotations: readAnnotations,
    },
    async ({ project, pipelineId, page, perPage }) =>
      safe(async () =>
        client.request("GET", `${projectPath(config, project)}/pipelines/${pipelineId}/jobs`, {
          query: { page, per_page: perPage ?? 50 },
        }),
      ),
  );

  server.registerTool(
    "gitlab_get_job_trace",
    {
      description: "Read the trace/log output for one GitLab CI job.",
      inputSchema: z.object({ project: projectSchema, jobId: z.number().int().positive() }),
      annotations: readAnnotations,
    },
    async ({ project, jobId }) => {
      try {
        const response = await client.request<string>(
          "GET",
          `${projectPath(config, project)}/jobs/${jobId}/trace`,
          { responseType: "text" },
        );
        return okText(response.data);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "gitlab_create_issue",
    {
      description: "Create an issue in a GitLab project. Requires GITLAB_WRITE_ENABLED=true.",
      inputSchema: z.object({ project: projectSchema, title: z.string().min(1), description: z.string().optional() }),
      annotations: writeAnnotations,
    },
    async ({ project, title, description }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("POST", `${projectPath(config, project)}/issues`, { body: { title, description } })).data;
      }),
  );

  server.registerTool(
    "gitlab_update_issue",
    {
      description: "Update an issue title, description, or state. Requires writes enabled.",
      inputSchema: z.object({
        project: projectSchema,
        iid: iidSchema,
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        stateEvent: z.enum(["close", "reopen"]).optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, title, description, stateEvent }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("PUT", `${projectPath(config, project)}/issues/${iid}`, { body: { title, description, state_event: stateEvent } })).data;
      }),
  );

  server.registerTool(
    "gitlab_comment_issue",
    {
      description: "Add a comment/note to a GitLab issue. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema, body: z.string().min(1) }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, body }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("POST", `${projectPath(config, project)}/issues/${iid}/notes`, { body: { body } })).data;
      }),
  );

  server.registerTool(
    "gitlab_create_merge_request",
    {
      description: "Open a GitLab merge request. Requires writes enabled.",
      inputSchema: z.object({
        project: projectSchema,
        sourceBranch: z.string().min(1),
        targetBranch: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        removeSourceBranch: z.boolean().optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, sourceBranch, targetBranch, title, description, removeSourceBranch }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("POST", `${projectPath(config, project)}/merge_requests`, {
          body: {
            source_branch: sourceBranch,
            target_branch: targetBranch,
            title,
            description,
            remove_source_branch: removeSourceBranch,
          },
        })).data;
      }),
  );

  server.registerTool(
    "gitlab_update_merge_request",
    {
      description: "Update metadata or state for a GitLab merge request. Requires writes enabled.",
      inputSchema: z.object({
        project: projectSchema,
        iid: iidSchema,
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        targetBranch: z.string().min(1).optional(),
        stateEvent: z.enum(["close", "reopen"]).optional(),
      }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, title, description, targetBranch, stateEvent }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("PUT", `${projectPath(config, project)}/merge_requests/${iid}`, {
          body: { title, description, target_branch: targetBranch, state_event: stateEvent },
        })).data;
      }),
  );

  server.registerTool(
    "gitlab_comment_merge_request",
    {
      description: "Add a comment/note to a GitLab merge request. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, iid: iidSchema, body: z.string().min(1) }),
      annotations: writeAnnotations,
    },
    async ({ project, iid, body }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("POST", `${projectPath(config, project)}/merge_requests/${iid}/notes`, { body: { body } })).data;
      }),
  );

  server.registerTool(
    "gitlab_merge_merge_request",
    {
      description: "Merge a GitLab merge request. Requires both write and merge flags enabled.",
      inputSchema: z.object({
        project: projectSchema,
        iid: iidSchema,
        squash: z.boolean().optional(),
        shouldRemoveSourceBranch: z.boolean().optional(),
      }),
      annotations: mergeAnnotations,
    },
    async ({ project, iid, squash, shouldRemoveSourceBranch }) =>
      safe(async () => {
        assertMergeEnabled(config);
        return (await client.request("PUT", `${projectPath(config, project)}/merge_requests/${iid}/merge`, {
          body: { squash, should_remove_source_branch: shouldRemoveSourceBranch },
        })).data;
      }),
  );

  server.registerTool(
    "gitlab_create_branch",
    {
      description: "Create a GitLab repository branch from a ref. Requires writes enabled.",
      inputSchema: z.object({ project: projectSchema, branch: z.string().min(1), ref: z.string().min(1) }),
      annotations: writeAnnotations,
    },
    async ({ project, branch, ref }) =>
      safe(async () => {
        assertWriteEnabled(config);
        return (await client.request("POST", `${projectPath(config, project)}/repository/branches`, { body: { branch, ref } })).data;
      }),
  );
}
