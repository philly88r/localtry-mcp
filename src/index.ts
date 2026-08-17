import { OAuthProvider, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp/server";
import { authHandler } from "./auth-handler";
import { supportedScopes } from "./contracts";
import { createLocalTryMcpServer } from "./mcp";

const MCP_ORIGIN = "https://mcp.localtry.com";
const MCP_RESOURCE = `${MCP_ORIGIN}/mcp`;

type AppEnv = Env & { OAUTH_PROVIDER: OAuthHelpers };

const protectedMcpHandler = {
  fetch(request, env, ctx) {
    return createMcpHandler(() => createLocalTryMcpServer(env), {
      route: "/mcp",
      allowedHostnames: ["mcp.localtry.com"],
      allowedOriginHostnames: [
        "chatgpt.com",
        "chat.openai.com",
        "localtry.com",
        "playground.ai.cloudflare.com",
        "localhost",
        "127.0.0.1",
      ],
      corsOptions: { origin: "*" },
      onerror(error) {
        console.error(
          JSON.stringify({
            event: "mcp_handler_error",
            message: error.message,
          }),
        );
      },
    })(request, env, ctx);
  },
} satisfies ExportedHandler<AppEnv>;

export default new OAuthProvider<AppEnv>({
  apiRoute: "/mcp",
  apiHandler: protectedMcpHandler,
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  clientIdMetadataDocumentEnabled: true,
  allowPlainPKCE: false,
  scopesSupported: [...supportedScopes],
  resourceMetadata: {
    resource: MCP_RESOURCE,
    authorization_servers: [MCP_ORIGIN],
    scopes_supported: [...supportedScopes],
    bearer_methods_supported: ["header"],
    resource_name: "LocalTry CRM",
  },
  accessTokenTTL: 3_600,
  refreshTokenTTL: 2_592_000,
  onError(error) {
    console.error(
      JSON.stringify({
        event: "oauth_error",
        code: error.code,
        description: error.description,
        category: error.internal?.category,
      }),
    );
  },
});
