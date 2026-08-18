import { z } from "zod";

export const supportedScopes = [
  "crm:read",
  "crm:write",
  "workspace:read",
  "workspace:write",
  "workflows:run",
  "publish:write",
  "assistant:run",
  "offline_access",
] as const;

export type LocalTryScope = (typeof supportedScopes)[number];

export const tenantAuthSchema = z.object({
  userId: z.string().min(1),
  businessId: z.number().int().positive(),
  membershipId: z.number().int().positive().nullable(),
  role: z.enum(["owner", "full", "office", "technician", "viewer"]),
  email: z.string().email(),
  displayName: z.string().min(1),
  scopes: z.array(z.enum(supportedScopes)),
});

export type TenantAuth = z.infer<typeof tenantAuthSchema>;

export const authorizationExchangeSchema = tenantAuthSchema.extend({
  codeExpiresAt: z.string().datetime(),
});

export type LocalTryOperation =
  | "workspace.overview"
  | "workspace.search"
  | "workspace.planChange"
  | "workspace.applyChange"
  | "workspace.submitRequest"
  | "workspace.requestStatus"
  | "workspace.listVersions"
  | "workspace.restoreVersion"
  | "crm.search"
  | "crm.mutate"
  | "agent.create"
  | "workflow.run"
  | "activity.recent"
  | "command.run";

export type PendingAuthorization = {
  oauthRequest: {
    responseType: string;
    clientId: string;
    redirectUri: string;
    scope: string[];
    state: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    resource?: string | string[];
    issuer?: string;
  };
  clientName: string;
  createdAt: string;
};
