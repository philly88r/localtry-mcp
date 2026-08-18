import {
  AuthorizationError,
  type AuthRequest,
  type OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import {
  authorizationExchangeSchema,
  supportedScopes,
  type PendingAuthorization,
} from "./contracts";
import type { LocalTryRpcService } from "./localtry-client";
import { authorizationResponseRedirect } from "./oauth-redirect";

type AppEnv = Omit<Env, "LOCALTRY_API"> & {
  LOCALTRY_API: LocalTryRpcService;
  OAUTH_PROVIDER: OAuthHelpers;
  OPENAI_APPS_CHALLENGE?: string;
};

const HANDOFF_TTL_SECONDS = 30 * 60;
const HANDOFF_COOKIE = "__Host-LOCALTRY_MCP_HANDOFF";

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function handoffCookie(value: string, maxAge = HANDOFF_TTL_SECONDS): string {
  return `${HANDOFF_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function authorizationError(error: AuthorizationError): Response {
  if (!error.redirectUri) {
    return new Response(error.description, { status: 400 });
  }
  const redirect = new URL(error.redirectUri);
  redirect.searchParams.set("error", error.code);
  redirect.searchParams.set("error_description", error.description);
  if (error.state) redirect.searchParams.set("state", error.state);
  if (error.issuer) redirect.searchParams.set("iss", error.issuer);
  return Response.redirect(redirect, 302);
}

async function beginAuthorization(request: Request, env: AppEnv) {
  let oauthRequest: AuthRequest;
  try {
    oauthRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  } catch (error) {
    if (error instanceof AuthorizationError) return authorizationError(error);
    throw error;
  }

  const client = await env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
  if (!client) return new Response("Unknown OAuth client", { status: 400 });
  const clientName = client.clientName?.trim() || "MCP client";

  const handoff = crypto.randomUUID();
  const pending: PendingAuthorization = {
    oauthRequest,
    clientName,
    createdAt: new Date().toISOString(),
  };
  await env.OAUTH_KV.put(`localtry:handoff:${handoff}`, JSON.stringify(pending), {
    expirationTtl: HANDOFF_TTL_SECONDS,
  });

  const redirect = new URL(env.LOCALTRY_AUTH_URL);
  redirect.searchParams.set("handoff", handoff);
  redirect.searchParams.set(
    "return_to",
    `${new URL(request.url).origin}/oauth/callback`,
  );
  redirect.searchParams.set("client_name", clientName);
  redirect.searchParams.set("scope", oauthRequest.scope.join(" "));

  return new Response(null, {
    status: 302,
    headers: {
      location: redirect.toString(),
      "set-cookie": handoffCookie(handoff),
    },
  });
}

async function completeLocalTryAuthorization(request: Request, env: AppEnv) {
  const url = new URL(request.url);
  const handoff = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieHandoff = cookieValue(request, HANDOFF_COOKIE);

  if (!handoff || !code || handoff !== cookieHandoff) {
    return new Response("Invalid or expired authorization handoff.", {
      status: 400,
    });
  }

  const key = `localtry:handoff:${handoff}`;
  const serialized = await env.OAUTH_KV.get(key);
  await env.OAUTH_KV.delete(key);
  if (!serialized) {
    return new Response("Authorization handoff expired.", { status: 400 });
  }

  const pending = JSON.parse(serialized) as PendingAuthorization;
  let rawIdentity: unknown;
  try {
    rawIdentity = await env.LOCALTRY_API.exchangeAuthorizationCode({
      code,
      handoff,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "localtry_authorization_exchange_failed",
        message: error instanceof Error ? error.message : "Unknown RPC error",
      }),
    );
    return new Response("LocalTry could not verify this authorization.", {
      status: 401,
    });
  }

  const identity = authorizationExchangeSchema.parse(rawIdentity);
  if (Date.parse(identity.codeExpiresAt) <= Date.now()) {
    return new Response("LocalTry authorization code expired.", { status: 401 });
  }

  const supported = new Set<string>(supportedScopes);
  const allowed = new Set<string>(identity.scopes);
  const grantedScopes = pending.oauthRequest.scope.filter(
    (scope) => supported.has(scope) && allowed.has(scope),
  );

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: pending.oauthRequest,
    userId: identity.userId,
    metadata: {
      businessId: identity.businessId,
      clientName: pending.clientName,
      role: identity.role,
    },
    scope: grantedScopes,
    props: { ...identity, scopes: grantedScopes },
  });

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizationResponseRedirect(
        redirectTo,
        new URL(request.url).origin,
      ),
      "set-cookie": handoffCookie("", 0),
    },
  });
}

export const authHandler = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/openai-apps-challenge") {
      if (!env.OPENAI_APPS_CHALLENGE) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(env.OPENAI_APPS_CHALLENGE, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (url.pathname === "/.well-known/glama.json") {
      return Response.json({
        $schema: "https://glama.ai/mcp/schemas/connector.json",
        maintainers: [{ email: "phillip@localtry.com" }],
      });
    }
    if (url.pathname === "/") {
      return Response.json({
        name: "LocalTry MCP",
        endpoint: "/mcp",
        authentication: "OAuth 2.1",
        tenantIsolation: "token-bound",
      });
    }
    if (url.pathname === "/health") {
      try {
        const dependency = await env.LOCALTRY_API.health();
        return Response.json({ ok: dependency.ok, crm: dependency.ok });
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "localtry_rpc_health_failed",
            message: error instanceof Error ? error.message : "Unknown RPC error",
          }),
        );
        return Response.json({ ok: false, crm: false }, { status: 503 });
      }
    }
    if (url.pathname === "/authorize") {
      return beginAuthorization(request, env);
    }
    if (url.pathname === "/oauth/callback") {
      return completeLocalTryAuthorization(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<AppEnv>;
