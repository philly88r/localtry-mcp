import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LocalTryOperation } from "../src/contracts";

/**
 * The public MCP tool surface is a published contract. ChatGPT and every other
 * MCP client see exactly these tools, and adding or renaming one changes the
 * public app listing and requires re-review. These tests fail loudly when the
 * surface changes so it is always a deliberate decision.
 */
const PUBLISHED_TOOLS = [
  "get_workspace_overview",
  "search_localtry_features",
  "search_crm",
  "create_or_update_crm_record",
  "create_workflow_agent",
  "request_workspace_customization",
  "get_workspace_customization_status",
  "list_workspace_versions",
  "restore_workspace_version",
  "run_workflow",
  "run_social_research",
  "run_localtry_command",
  "get_recent_activity",
] as const;

/**
 * Operations the LocalTry CRM bridge accepts. Mirrors `operationSchema` in the
 * CRM's api/mcp-bridge.ts. Update both together when the bridge grows.
 */
const CRM_SUPPORTED_OPERATIONS: LocalTryOperation[] = [
  "workspace.overview",
  "workspace.search",
  "workspace.submitRequest",
  "workspace.requestStatus",
  "workspace.listVersions",
  "workspace.restoreVersion",
  "crm.search",
  "crm.mutate",
  "agent.create",
  "workflow.run",
  "activity.recent",
  "socialResearch.run",
  "command.run",
];

/** Operations this server actually sends. Legacy plan/apply are intentionally unused. */
const USED_OPERATIONS: LocalTryOperation[] = [
  "workspace.overview",
  "workspace.search",
  "crm.search",
  "crm.mutate",
  "agent.create",
  "workspace.submitRequest",
  "workspace.requestStatus",
  "workspace.listVersions",
  "workspace.restoreVersion",
  "workflow.run",
  "socialResearch.run",
  "command.run",
  "activity.recent",
];

function source() {
  return readFileSync(resolve("src/mcp.ts"), "utf8");
}

function manifestTools() {
  const manifest = JSON.parse(readFileSync(resolve("lhm.plugin.json"), "utf8")) as {
    tools: Array<{ name: string }>;
  };
  return manifest.tools.map(tool => tool.name);
}

describe("published MCP tool surface", () => {
  it("exposes exactly the reviewed tool set", () => {
    const registered = [...source().matchAll(/server\.registerTool\(\s*"([^"]+)"/g)].map(
      match => match[1],
    );
    expect(registered).toEqual([...PUBLISHED_TOOLS]);
    expect(registered).toHaveLength(13);
  });

  it("keeps the public metadata manifest on the same tool contract", () => {
    expect(manifestTools()).toEqual([...PUBLISHED_TOOLS]);
  });

  it("never exposes the legacy plan/apply operations", () => {
    const body = source();
    expect(body).not.toContain("workspace.planChange");
    expect(body).not.toContain("workspace.applyChange");
  });
});

describe("CRM bridge contract", () => {
  it("only sends operations the CRM bridge supports", () => {
    const supported = new Set<string>(CRM_SUPPORTED_OPERATIONS);
    for (const operation of USED_OPERATIONS) {
      expect(supported.has(operation), `${operation} is not in the CRM operationSchema`).toBe(true);
    }
  });

  it("keeps the operation union in sync with the published tools", () => {
    // Every operation this server sends must appear in a registered tool.
    const body = source();
    for (const operation of USED_OPERATIONS) {
      expect(body, `${operation} is sent but no tool sends it`).toContain(`"${operation}"`);
    }
  });

  it("requires a scope for every mutating operation", () => {
    const body = source();
    for (const operation of ["crm.mutate", "agent.create", "workspace.submitRequest", "workspace.restoreVersion", "socialResearch.run"]) {
      const index = body.indexOf(`"${operation}"`);
      expect(index, `${operation} is not sent by any tool`).toBeGreaterThan(-1);
      // requireScope must appear before the execute call for that operation.
      const preceding = body.slice(Math.max(0, index - 600), index);
      expect(preceding, `${operation} runs without a scope check`).toContain("requireScope");
    }
  });
});
