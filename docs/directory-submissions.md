# LocalTry MCP distribution tracker

Last verified: 2026-08-18.

This tracker is only for the LocalTry MCP server and the forthcoming LocalTry
ChatGPT plugin. It is separate from the CRM affiliate-program tracker and the
general SaaS review-directory tracker.

## Canonical listing facts

- Name: LocalTry AI CRM
- Website and MCP documentation: https://localtry.com/mcp
- Remote MCP endpoint: https://mcp.localtry.com/mcp
- Public repository: https://github.com/philly88r/localtry-mcp
- Official registry ID: `io.github.philly88r/localtry-mcp`
- Authentication: OAuth 2.1 with PKCE and dynamic client registration
- Plugin status: dedicated ChatGPT plugin submitted to OpenAI and awaiting review
- Required wording: `MCP available now. Dedicated ChatGPT plugin coming soon.`

Never state that the ChatGPT plugin is live until OpenAI approves and publishes
it. Never publish secrets, reviewer credentials, tenant identifiers, or customer
data in a listing.

## Existing distribution

| Surface | Status | Public or review URL | Next action |
| --- | --- | --- | --- |
| Official MCP Registry | Live, version 1.0.0 | https://registry.modelcontextprotocol.io/?q=io.github.philly88r%2Flocaltry-mcp | Publish metadata version 1.0.1 with the plugin-coming-soon wording |
| OpenAI ChatGPT plugin | Submitted, awaiting review | OpenAI Platform submission portal | Keep reviewer materials current; do not claim it is live |
| Cline Marketplace | Pull request open | https://github.com/cline/marketplace/pull/47 | Update the entry and pull-request summary with the plugin-coming-soon wording |
| Awesome MCP Servers | Pull request open, checks passed | https://github.com/punkpeye/awesome-mcp-servers/pull/12365 | Update the listing sentence and pull-request summary |

## Ten-directory expansion queue

| Priority | Directory | Submission route | Cost | Status | Positioning angle |
| --- | --- | --- | --- | --- | --- |
| 1 | Smithery | `smithery mcp publish https://mcp.localtry.com/mcp -n localtry/localtry-ai-crm` | Free listing | Prepared | Remote OAuth MCP for operating an entire business from compatible AI clients |
| 2 | Glama | https://glama.ai/ | Free listing | Prepared | Secure business operations, tenant isolation, rich tool discovery, and ChatGPT plugin coming soon |
| 3 | MCP.so | https://mcp.so/submit?type=server | Free review queue | Prepared | AI CRM, workflow execution, marketing, reviews, and workspace customization through MCP |
| 4 | PulseMCP | https://www.pulsemcp.com/submit | Free curation | Prepared | Official-registry remote server with OAuth and a broad business-tool surface |
| 5 | MCP.Directory | https://mcp.directory/submit | Free review | Prepared | Tenant-isolated CRM and business operations MCP with public source and documentation |
| 6 | MCPServers.org | https://mcpservers.org/submit | Free listing | Prepared | Productivity and business MCP for customers, jobs, sales, marketing, and workflows |
| 7 | MCP Find | https://mcpfind.org/submit | Free review | Prepared | Live remote MCP with a copyable endpoint and OAuth account authorization |
| 8 | MCP Marketplace | https://mcp-marketplace.io/ | Free listing | Prepared | Production remote endpoint, clear use cases, safety controls, and public repository |
| 9 | mcpub | https://mcpub.dev/ | Free endpoint submission | Prepared | Always-on remote MCP verified directly from the published endpoint |
| 10 | ServerHub | https://www.serverhub.digital/ | Free listing | Prepared | Maintained MCP with CI, public source, documentation, OAuth, and active endpoint |

## Submission rules

1. Check for an existing auto-imported listing before creating another entry.
2. Claim an existing entry when the directory imported it from the official MCP
   Registry; do not create duplicates.
3. Use the directory-specific description from `docs/directory-listing.md`, with
   a distinct opening sentence for each marketplace.
4. Select only free listing or review options unless a paid placement is
   separately approved.
5. Record the submission date, confirmation ID, review status, public URL, and
   backlink status in this file immediately after each submission.
6. Recheck every pending listing after seven days and every live endpoint once a
   month.
