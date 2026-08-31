const AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";

export async function withCodexIssuerCompatibility(
  request: Request,
  response: Response,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (
    !pathname.startsWith(AUTHORIZATION_SERVER_METADATA_PATH) ||
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    return response;
  }

  const metadata = (await response.json()) as Record<string, unknown>;
  metadata.authorization_response_iss_parameter_supported = false;

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");

  return new Response(JSON.stringify(metadata), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
