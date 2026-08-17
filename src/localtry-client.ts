import type { LocalTryOperation, TenantAuth } from "./contracts";

export type LocalTryRpcService = {
  health(): Promise<{ ok: boolean }>;
  exchangeAuthorizationCode(input: {
    code: string;
    handoff: string;
  }): Promise<unknown>;
  execute(input: {
    actor: {
      userId: string;
      businessId: number;
      membershipId: number | null;
      role: TenantAuth["role"];
      scopes: TenantAuth["scopes"];
    };
    operation: LocalTryOperation;
    input: Record<string, unknown>;
  }): Promise<unknown>;
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
  service: LocalTryRpcService,
  tenant: TenantAuth,
  operation: LocalTryOperation,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  assertNoTenantSelector(input);

  return service.execute({
    actor: {
      userId: tenant.userId,
      businessId: tenant.businessId,
      membershipId: tenant.membershipId,
      role: tenant.role,
      scopes: tenant.scopes,
    },
    operation,
    input,
  });
}
