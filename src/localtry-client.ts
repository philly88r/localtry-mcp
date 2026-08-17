import type { LocalTryOperation, TenantAuth } from "./contracts";

export type FetchService = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

const forbiddenTenantKeys = new Set(["businessId", "tenantId"]);

export function assertNoTenantSelector(value: unknown, path = "input"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoTenantSelector(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenTenantKeys.has(key)) {
      throw new Error(
        `${path}.${key} is not accepted. Tenant identity comes from OAuth.`,
      );
    }
    assertNoTenantSelector(child, `${path}.${key}`);
  }
}

export async function executeLocalTry(
  service: FetchService,
  tenant: TenantAuth,
  operation: LocalTryOperation,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  assertNoTenantSelector(input);

  const response = await service.fetch(
    "https://localtry.internal/api/internal/mcp/execute",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        actor: {
          userId: tenant.userId,
          businessId: tenant.businessId,
          membershipId: tenant.membershipId,
          role: tenant.role,
          scopes: tenant.scopes,
        },
        operation,
        input,
      }),
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `LocalTry returned ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}
