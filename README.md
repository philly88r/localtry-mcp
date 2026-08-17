# LocalTry MCP

Use LocalTry from ChatGPT and other MCP clients while keeping every business
strictly isolated.

LocalTry MCP is a remote Model Context Protocol server for operating a LocalTry
CRM with plain-language instructions. It runs on Cloudflare Workers, uses OAuth
2.1, and binds every connection to one verified LocalTry user, business, role,
and permission set.

## What it enables

- Search customers, companies, contacts, leads, jobs, estimates, and invoices.
- Create and update validated CRM records.
- Inspect the complete tenant workspace architecture.
- Plan and apply tenant-only workspace customizations.
- Run saved workflows.
- Review customization versions and restore an earlier version.
- Read a tenant-scoped activity and audit history.

## The tenant boundary

There is one shared MCP service, but every authorization is logically private.
The client cannot supply or change a tenant identifier.

```text
MCP client
  -> LocalTry OAuth consent
  -> token bound to user + business + role + scopes
  -> LocalTry MCP Worker
  -> private Cloudflare service binding
  -> LocalTry domain services
  -> business-scoped data and workspace runtime
```

The MCP Worker does not receive a database binding. It can reach LocalTry only
through the private service contract in
[`docs/localtry-bridge-contract.md`](docs/localtry-bridge-contract.md).

## Remote endpoint

Production is designed to use:

```text
https://mcp.localtry.com/mcp
```

The endpoint is not live until the LocalTry authorization and internal bridge
routes described below are deployed and the Worker receives its production KV
and service bindings.

## Local development

Requirements: Node.js 24 or newer and a Cloudflare account.

```bash
npm install
npm run types
npm run check
npm run dev
```

Create an OAuth KV namespace and replace the placeholder namespace ID in
`wrangler.jsonc`:

```bash
npx wrangler kv namespace create OAUTH_KV
```

The service binding must point to a LocalTry deployment implementing:

- `POST /api/internal/mcp/exchange`
- `POST /api/internal/mcp/execute`

See the [bridge contract](docs/localtry-bridge-contract.md) for the exact trust
boundary.

## ChatGPT

ChatGPT supports remote MCP apps through developer mode. See
[`docs/chatgpt.md`](docs/chatgpt.md) for the connection flow and current plan
requirements.

## Design principles

- No raw SQL tool.
- No tenant ID tool argument.
- No secret-reading tool.
- Goal-oriented tools instead of mirroring the entire API.
- Explicit approval for consequential workspace changes.
- Versioning, audit events, and restore support.
- Permission checks in both the MCP Worker and the CRM domain layer.

## Status

This repository contains the customer-facing MCP Worker and its tested tenant
boundary. Production enablement additionally requires the LocalTry CRM bridge,
OAuth consent screen, KV binding, custom domain, and end-to-end authorization
tests.

## License

MIT
