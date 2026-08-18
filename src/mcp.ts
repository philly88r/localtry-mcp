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
        "Inspect the authenticated business's complete LocalTry feature catalog: every registered page, action, agent, integration, workflow, tenant addition, and customization history. Secrets and raw database access are never returned.",
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
    "search_localtry_features",
    {
      title: "Find LocalTry Feature",
      description:
        "Search the authenticated business's live LocalTry capability registry before choosing an action. Returns exact pages, actions, agents, integrations, additions, inputs, outputs, and persistence behavior without exposing secrets.",
      inputSchema: {
        query: z.string().trim().min(2).max(500),
        kind: z
          .enum([
            "page",
            "agent",
            "action",
            "integration",
            "addition",
            "runtime",
          ])
          .optional(),
        limit: z.number().int().min(1).max(20).default(10),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async input => {
      const tenant = requireScope(currentTenant(), "workspace:read");
      return textResult(
        await executeLocalTry(
          env.LOCALTRY_API,
          tenant,
          "workspace.search",
          input,
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
    "create_workflow_agent",
    {
      title: "Create Workflow Agent",
      description:
        "Create a reusable AI agent for the authenticated business. Describe the agent's duties; LocalTry writes and saves its tenant-scoped instruction, then makes the agent available in Flow Studio.",
      inputSchema: {
        name: z.string().trim().min(2).max(80),
        tagline: z.string().trim().max(160).default(""),
        category: z.enum(["today", "growth", "manage"]).default("growth"),
        duties: z.string().trim().min(10).max(2_000),
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
        await executeLocalTry(env.LOCALTRY_API, tenant, "agent.create", {
          name: input.name,
          tagline: input.tagline,
          category: input.category,
          idea: input.duties,
        }),
      );
    },
  );

  server.registerTool(
    "request_workspace_customization",
    {
      title: "Request Workspace Customization",
      description:
        "Submit a plain-language request to the authenticated business's Customize Workspace builder. This is the same action as entering the request in LocalTry and pressing Send request; LocalTry owns the queued engineering work, testing, deployment, history, and restore point.",
      inputSchema: {
        request: z.string().trim().min(8).max(8_000),
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
          "workspace.submitRequest",
          input,
        ),
      );
    },
  );

  server.registerTool(
    "get_workspace_customization_status",
    {
      title: "Check Workspace Customization",
      description:
        "Read the authenticated business's latest Customize Workspace request, conversation, progress, questions, errors, and completed result.",
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
          "workspace.requestStatus",
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
        "Use any AI-ready LocalTry feature through the authenticated business's live capability registry. LocalTry chooses and executes its own tenant-scoped domain action, verifies results, and asks for missing information instead of inventing it. Search the feature registry first when the requested capability is unclear.",
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
