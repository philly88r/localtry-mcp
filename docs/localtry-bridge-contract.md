# LocalTry bridge contract

The public MCP Worker never connects directly to D1 and never accepts a tenant
identifier from a tool call. It communicates with the LocalTry CRM through a
Cloudflare service binding named `LOCALTRY_API`.

## Private RPC contract

The CRM Worker exports a named `WorkerEntrypoint` named
`LocalTryMcpBridge`. The public MCP Worker receives it through the
`LOCALTRY_API` service binding. No public HTTP bridge route or shared bridge
secret is required.

### Authorization exchange

`exchangeAuthorizationCode(input)`

Input:

```json
{
  "code": "one-time-code-from-localtry",
  "handoff": "opaque-oauth-handoff-id"
}
```

The CRM must verify that the code:

- was created by an authenticated LocalTry authorization screen;
- belongs to the same handoff;
- is unused and unexpired;
- records the user, membership, business, role, approved scopes, and client;
- is consumed atomically before returning.

Output:

```json
{
  "userId": "123",
  "businessId": 42,
  "membershipId": null,
  "role": "owner",
  "email": "owner@example.com",
  "displayName": "Owner",
  "scopes": ["crm:read", "workspace:read", "workspace:write"],
  "codeExpiresAt": "2026-08-17T14:05:00.000Z"
}
```

### Tool execution

`execute(input)`

Input:

```json
{
  "actor": {
    "userId": "123",
    "businessId": 42,
    "membershipId": null,
    "role": "owner",
    "scopes": ["crm:read", "workspace:read"]
  },
  "operation": "workspace.overview",
  "input": {}
}
```

The Worker supplies the OAuth-bound actor, operation, and validated tool input.
The CRM must independently re-check membership status, role, entitlements,
scope, record ownership, and operation policy. Write operations must use the
same domain services as the LocalTry application and must create an audit event.

The CRM must never expose connector secrets, password hashes, session tokens,
OAuth refresh tokens, raw database access, or cross-tenant search through this
bridge.

Agent creation uses the `agent.create` operation. The public MCP Worker sends a
validated name, tagline, category, and description of the agent's duties. The
CRM reuses its existing tenant-scoped agent service to produce and store the
hidden instruction. The MCP Worker never receives a D1 binding or database
credential, and the saved agent becomes available through the normal Flow
Studio agent roster.

Engineering customizations use `workspace.submitRequest`, which calls the same
tenant-scoped conversation and queue service as the Customize Workspace prompt
in the LocalTry application. `workspace.requestStatus` reads that request's
saved conversation and progress. MCP does not implement, test, or deploy the
customization itself. The public MCP server intentionally does not expose the
legacy plan/apply operations, so there is only one supported route for a custom
feature request.

Complete feature discovery uses `workspace.overview` and `workspace.search`.
They read LocalTry's shared capability catalog, which is the same source used by
Command, Flow Studio, Workspace Builder, and saved agents. AI-ready work still
runs through LocalTry's registered domain actions; MCP cannot call a raw router,
execute SQL, supply a tenant ID, or bypass LocalTry validation and approvals.
