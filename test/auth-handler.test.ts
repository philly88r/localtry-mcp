import { describe, expect, it } from "vitest";
import { mcpDirectoryMetadata } from "../src/directory-metadata";
import { authorizationResponseRedirect } from "../src/oauth-redirect";

describe("OAuth authorization response", () => {
  it("identifies the authorization server without dropping client parameters", () => {
    const result = new URL(
      authorizationResponseRedirect(
        "http://127.0.0.1:1455/callback?code=authorization-code&state=client-state",
        "https://mcp.localtry.com",
      ),
    );

    expect(result.searchParams.get("code")).toBe("authorization-code");
    expect(result.searchParams.get("state")).toBe("client-state");
    expect(result.searchParams.get("iss")).toBe("https://mcp.localtry.com");
  });
});

describe("MCP directory discovery", () => {
  it("publishes the canonical remote endpoint metadata", () => {
    expect(mcpDirectoryMetadata).toMatchObject({
      name: "LocalTry AI CRM",
      url: "https://mcp.localtry.com/mcp",
      transport: "streamable-http",
      authentication: "OAuth 2.1",
    });
  });
});
