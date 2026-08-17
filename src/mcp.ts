import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { executeLocalTry } from "./localtry-client";
import type { LocalTryRpcService } from "./localtry-client";
import { currentTenant, requireScope } from "./tenant";

function textResult(result: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

type McpEnv = Omit<Env, "LOCALTRY_API"> & {
  LOCALTRY_API: LocalTryRpcService;
};

export function createLocalTryMcpServer(env: McpEnv) {
  const server = new McpServer({
    name: "LocalTry",
    title: "LocalTry AI CRM",
    version: "1.0.0",
    websiteUrl: "https://localtry.com/mcp",
    icons: [
      {
        src: "https://localtry.com/media/localtry-logo.png",
        mimeType: "image/png",
      },
    ],
  });

  server.registerTool(
    "get_workspace_overview",
    {
      title: "Inspect Workspace",
      description:
        "Inspect the authenticated business's current LocalTry pages, modules, fields, workflows, integrations, and customization history.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async () => {
      const tenant = requireScope(currentTenant(), "workspace:read");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.overview",
        ),
      );
    },
  );

  server.registerTool(
    "search_crm",
    {
      title: "Search CRM",
      description:
        "Search the authenticated business's CRM. The server chooses safe tenant-scoped queries; raw SQL and tenant identifiers are not accepted.",
      inputSchema: {
        query: z.string().min(1).max(1_000),
        entityTypes: z
          .array(
            z.enum([
              "customers",
              "companies",
              "contacts",
              "leads",
              "jobs",
              "estimates",
              "invoices",
              "documents",
              "workflows",
            ]),
          )
          .max(9)
          .optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "crm:read");
      return textResult(
        await executeLocalTry(env.LOCALTRY_API, tenant, "crm.search", input),
      );
    },
  );

  server.registerTool(
    "create_or_update_crm_record",
    {
      title: "Create or Update CRM Record",
      description:
        "Create or update one CRM record for the authenticated business using LocalTry domain rules and validation.",
      inputSchema: {
        entityType: z.enum([
          "customer",
          "company",
          "contact",
          "lead",
          "job",
          "estimate",
          "invoice",
          "document",
        ]),
        recordId: z.number().int().positive().optional(),
        values: z.record(z.string(), z.unknown()),
        reason: z.string().min(1).max(500),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "crm:write");
      return textResult(
        await executeLocalTry(env.LOCALTRY_API, tenant, "crm.mutate", input),
      );
    },
  );

  server.registerTool(
    "plan_workspace_change",
    {
      title: "Plan Workspace Change",
      description:
        "Inspect the current tenant workspace and create a versioned implementation plan. This does not apply the change.",
      inputSchema: {
        request: z.string().min(10).max(10_000),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "workspace:read");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.planChange",
          input,
        ),
      );
    },
  );

  server.registerTool(
    "apply_workspace_change",
    {
      title: "Apply Workspace Change",
      description:
        "Apply an approved workspace plan only to the authenticated tenant. LocalTry validates, tests, versions, and records the change before returning success.",
      inputSchema: {
        planId: z.string().min(1).max(200),
        approvalToken: z.string().min(1).max(500),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "workspace:write");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.applyChange",
          input,
        ),
      );
    },
  );

  server.registerTool(
    "list_workspace_versions",
    {
      title: "List Workspace Versions",
      description:
        "List versioned customization history for the authenticated tenant.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(25),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "workspace:read");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.listVersions",
          input,
        ),
      );
    },
  );

  server.registerTool(
    "restore_workspace_version",
    {
      title: "Restore Workspace Version",
      description:
        "Restore an earlier workspace version for the authenticated tenant after explicit approval.",
      inputSchema: {
        versionId: z.string().min(1).max(200),
        approvalToken: z.string().min(1).max(500),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: true,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "workspace:write");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.restoreVersion",
          input,
        ),
      );
    },
  );

  server.registerTool(
    "run_workflow",
    {
      title: "Run Saved Workflow",
      description:
        "Run one saved workflow belonging to the authenticated tenant. Publishing and communication steps still enforce their own approvals.",
      inputSchema: {
        workflowId: z.number().int().positive(),
        input: z.record(z.string(), z.unknown()).default({}),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: true,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "workflows:run");
      return textResult(
        await executeLocalTry(env.LOCALTRY_API, tenant, "workflow.run", input),
      );
    },
  );

  server.registerTool(
    "run_localtry_command",
    {
      title: "Run LocalTry Command",
      description:
        "Talk to LocalTry Command using the authenticated business's live architecture, CRM data, integrations, and registered actions. It executes real work, verifies results, and asks for missing information instead of inventing it.",
      inputSchema: {
        prompt: z.string().min(1).max(4_000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(8_000),
            }),
          )
          .max(12)
          .optional(),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: true,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "assistant:run");
      return textResult(
        await executeLocalTry(env.LOCALTRY_API, tenant, "command.run", input),
      );
    },
  );

  server.registerTool(
    "get_recent_activity",
    {
      title: "Review Recent Activity",
      description:
        "Show recent CRM actions, workflow runs, and workspace changes for the authenticated tenant.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(25),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input) => {
      const tenant = requireScope(currentTenant(), "crm:read");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "activity.recent",
          input,
        ),
      );
    },
  );

  return server;
}
