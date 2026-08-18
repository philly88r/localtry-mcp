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
- Create tenant-owned AI agents that become available in Flow Studio.
- Inspect the complete tenant workspace architecture.
- Plan and apply tenant-only workspace customizations.
- Run saved workflows.
- Ask LocalTry Command to carry out multi-step business operations.
- Review customization versions and restore an earlier version.
- Read a tenant-scoped activity and audit history.

## Available tools

| Tool | Purpose |
| --- | --- |
| `get_workspace_overview` | Inspect the connected business's pages, modules, fields, workflows, integrations, and customization history. |
| `search_crm` | Search tenant-scoped CRM records without exposing raw SQL. |
| `create_or_update_crm_record` | Create or update a validated CRM record. |
| `create_workflow_agent` | Describe and save a tenant-owned AI agent for use in Flow Studio workflows. |
| `request_workspace_customization` | Submit the same tenant-scoped engineering request as the Customize Workspace prompt. |
| `get_workspace_customization_status` | Read the latest customization conversation, progress, questions, and result. |
| `list_workspace_versions` | Review the workspace's customization history. |
| `restore_workspace_version` | Restore an approved earlier version for the connected workspace. |
| `run_workflow` | Run one of the business's saved workflows. |
| `run_localtry_command` | Use LocalTry Command for verified, multi-step CRM and business operations. |
| `get_recent_activity` | Review recent CRM, workflow, and customization activity. |

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

The production endpoint is live:

```text
https://mcp.localtry.com/mcp
```

Health check:

```text
https://mcp.localtry.com/health
```

Clients discover OAuth 2.1 metadata automatically. Authorization supports
PKCE, dynamic client registration, short-lived access tokens, and refresh
tokens. Users sign in to LocalTry and approve one visible workspace; no LocalTry
API key is copied into the MCP client.

## Local development

Requirements: Node.js 20 or newer and a Cloudflare account.

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

The `LOCALTRY_API` service binding must point to the named
`LocalTryMcpBridge` WorkerEntrypoint exported by the LocalTry CRM deployment.

See the [bridge contract](docs/localtry-bridge-contract.md) for the exact trust
boundary.

## ChatGPT

ChatGPT supports remote MCP apps through developer mode. See
[`docs/chatgpt.md`](docs/chatgpt.md) for the connection flow and current plan
requirements. Creating a private custom app connects this server to a ChatGPT
account or workspace; publishing in the public ChatGPT app directory is a
separate OpenAI review process.

The non-secret public-review listing, starter prompts, test cases, and release
notes are maintained in
[`docs/openai-submission.md`](docs/openai-submission.md).

## Design principles

- No raw SQL tool.
- No tenant ID tool argument.
- No secret-reading tool.
- Goal-oriented tools instead of mirroring the entire API.
- Explicit approval for consequential workspace changes.
- Versioning, audit events, and restore support.
- Permission checks in both the MCP Worker and the CRM domain layer.

## Status

Production is deployed at `mcp.localtry.com`. OAuth authorization, refresh
tokens, MCP initialization, tool discovery, tenant binding, and a live workspace
read have been verified end to end. The public Worker reaches the CRM only
through a private Cloudflare service binding and has no database binding.

## License

MIT
