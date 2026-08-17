import { getMcpAuthContext } from "agents/mcp/server";
import {
  tenantAuthSchema,
  type LocalTryScope,
  type TenantAuth,
} from "./contracts";

export function currentTenant(): TenantAuth {
  const context = getMcpAuthContext();
  const parsed = tenantAuthSchema.safeParse(context?.props);
  if (!parsed.success) {
    throw new Error("A verified LocalTry tenant authorization is required.");
  }
  return parsed.data;
}

export function requireScope(
  tenant: TenantAuth,
  scope: LocalTryScope,
): TenantAuth {
  if (!tenant.scopes.includes(scope)) {
    throw new Error(`The authorized LocalTry connection is missing ${scope}.`);
  }
  return tenant;
}
