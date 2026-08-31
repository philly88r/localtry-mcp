import { describe, expect, it } from "vitest";
import { withCodexIssuerCompatibility } from "../src/oauth-metadata";

describe("OAuth authorization server metadata", () => {
  it("works around Codex issuer relay failures without changing the issuer", async () => {
    const request = new Request(
      "https://mcp.localtry.com/.well-known/oauth-authorization-server",
    );
    const response = Response.json({
      issuer: "https://mcp.localtry.com",
      authorization_response_iss_parameter_supported: true,
    });

    const patched = await withCodexIssuerCompatibility(request, response);
    const metadata = (await patched.json()) as Record<string, unknown>;

    expect(metadata.issuer).toBe("https://mcp.localtry.com");
    expect(metadata.authorization_response_iss_parameter_supported).toBe(false);
    expect(patched.headers.get("cache-control")).toBe("no-store");
  });

  it("does not modify non-metadata responses", async () => {
    const request = new Request("https://mcp.localtry.com/health");
    const response = Response.json({ ok: true });

    expect(await withCodexIssuerCompatibility(request, response)).toBe(response);
  });
});
