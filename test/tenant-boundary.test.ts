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
