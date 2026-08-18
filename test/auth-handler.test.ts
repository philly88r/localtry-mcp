import { describe, expect, it } from "vitest";
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
