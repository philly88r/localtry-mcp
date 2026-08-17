import { describe, expect, it } from "vitest";
import {
  assertNoTenantSelector,
  executeLocalTry,
  type FetchService,
} from "../src/localtry-client";
import type { TenantAuth } from "../src/contracts";

const tenant: TenantAuth = {
  userId: "user-42",
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
    let body: unknown;
    const service: FetchService = {
      async fetch(_input, init) {
        body = JSON.parse(String(init?.body));
        return Response.json({ ok: true });
      },
    };

    await executeLocalTry(service, tenant, "crm.search", { query: "Alfredo" });

    expect(body).toMatchObject({
      actor: {
        userId: "user-42",
        businessId: 42,
        role: "owner",
      },
      operation: "crm.search",
      input: { query: "Alfredo" },
    });
  });

  it("does not leak internal error bodies from non-JSON services", async () => {
    const service: FetchService = {
      async fetch() {
        return new Response("Operation not permitted", { status: 403 });
      },
    };

    await expect(
      executeLocalTry(service, tenant, "crm.search", { query: "test" }),
    ).rejects.toThrow("Operation not permitted");
  });
});
