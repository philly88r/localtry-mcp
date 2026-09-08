import { describe, expect, it } from "vitest";
import {
  assertNoTenantSelector,
  executeLocalTry,
  type LocalTryRpcService,
} from "../src/localtry-client";
import type { TenantAuth } from "../src/contracts";

const tenant: TenantAuth = {
  userId: "42",
  businessId: 42,
  membershipId: null,
  role: "owner",
  email: "owner@example.com",
  displayName: "Owner",
  scopes: ["crm:read", "crm:write", "workspace:read", "workspace:write"],
};

describe("tenant boundary", () => {
  it("rejects tenant selectors anywhere in tool input", () => {
    expect(() =>
      assertNoTenantSelector({ values: { businessId: 9001 } }),
    ).toThrow("Tenant identity comes from OAuth");
    expect(() => assertNoTenantSelector({ tenantId: 9001 })).toThrow(
      "Tenant identity comes from OAuth",
    );
  });

  it("injects the OAuth-bound tenant into internal operations", async () => {
    let body: Parameters<LocalTryRpcService["execute"]>[0] | undefined;
    const service: LocalTryRpcService = {
      async health() {
        return { ok: true };
      },
      async exchangeAuthorizationCode() {
        throw new Error("not used");
      },
      async execute(input) {
        body = input;
        return { ok: true };
      },
    };

    await executeLocalTry(service, tenant, "crm.search", { query: "Alfredo" });

    expect(body).toMatchObject({
      actor: {
        userId: "42",
        businessId: 42,
        role: "owner",
      },
      operation: "crm.search",
      input: { query: "Alfredo" },
    });
  });

  it.each([
    ["synthetic-agency-mcp-9201", "agency", 9201],
    ["synthetic-service-mcp-9202", "service", 9202],
  ])(
    "binds Social Research for %s (%s) to its distinct OAuth workspace",
    async (_fixture, _profile, businessId) => {
      let body: Parameters<LocalTryRpcService["execute"]>[0] | undefined;
      const service: LocalTryRpcService = {
        async health() {
          return { ok: true };
        },
        async exchangeAuthorizationCode() {
          throw new Error("not used");
        },
        async execute(input) {
          body = input;
          return { ok: true };
        },
      };
      await executeLocalTry(
        service,
        {
          ...tenant,
          userId: String(businessId + 100),
          businessId,
          scopes: [...tenant.scopes, "assistant:run"],
        },
        "socialResearch.run",
        { query: "small business trends", platform: "web" },
      );
      expect(body).toMatchObject({
        actor: { businessId },
        operation: "socialResearch.run",
        input: { query: "small business trends", platform: "web" },
      });
    },
  );

  it("propagates a private RPC authorization failure", async () => {
    const service: LocalTryRpcService = {
      async health() {
        return { ok: true };
      },
      async exchangeAuthorizationCode() {
        throw new Error("not used");
      },
      async execute() {
        throw new Error("Operation not permitted");
      },
    };

    await expect(
      executeLocalTry(service, tenant, "crm.search", { query: "test" }),
    ).rejects.toThrow("Operation not permitted");
  });
});
