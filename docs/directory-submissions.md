# LocalTry MCP distribution tracker

Last verified: 2026-08-20.

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
| Official MCP Registry | Live, version 1.0.1 | https://registry.modelcontextprotocol.io/v0.1/servers/io.github.philly88r%2Flocaltry-mcp/versions/latest | Recheck monthly and publish new versions only when metadata changes |
| OpenAI ChatGPT plugin | Submitted, awaiting review | OpenAI Platform submission portal | Keep reviewer materials current; do not claim it is live |
| Cline Marketplace | Pull request open; current wording pushed | https://github.com/cline/marketplace/pull/47 | Monitor review; latest listing commit is `6b423cc` |
| Awesome MCP Servers | Pull request open; current wording pushed | https://github.com/punkpeye/awesome-mcp-servers/pull/12365 | Monitor review; latest listing commit is `840b0cc4` |

## Ten-directory expansion queue

| Priority | Directory | Submission route | Cost | Status | Positioning angle |
| --- | --- | --- | --- | --- | --- |
| 1 | Smithery | https://smithery.ai/servers/pmatthews/localtry-ai-crm/releases | Free listing | Submitted; review pending | Release `e0f104ea-6866-4b2f-bc52-b7e289b7e317` accepted by the registry |
| 2 | Glama | https://glama.ai/mcp/servers | Free listing | Submitted; review pending | Open-source server was submitted; Glama reports the remote endpoint already exists, so do not create another connector |
| 3 | MCP.so | https://mcp.so/submit?type=server | $39 current submission fee | Skipped; paid-only | No payment was authorized or made |
| 4 | PulseMCP | https://www.pulsemcp.com/servers?q=LocalTry | Free curation | Queued through official-registry ingestion | PulseMCP currently auto-ingests Official Registry metadata; recheck after its pipeline refreshes |
| 5 | MCP.Directory | https://mcp.directory/submit | Free review | Submitted 2026-08-19 | Confirmation states editorial review and publication within 24 hours |
| 6 | MCPServers.org | https://mcpservers.org/submit | Free listing | Submitted 2026-08-19 | Confirmation states editorial review within 12 hours |
| 7 | MCP Find | https://github.com/MCPFind/mcp-find | Free review | Ineligible under current package rules | Current intake requires a real public npm, PyPI, or Docker package; do not mislabel the OAuth remote URL as a package |
| 8 | MCP Marketplace | https://mcp-marketplace.io/dashboard#servers | Free listing | Official import approved; branded listing pending review | Official-registry import is approved with security score 10.0; do not create another listing |
| 9 | mcpub | https://mcpub.dev/ | Free endpoint submission | Live 2026-08-19 | Endpoint was registered and made searchable immediately |
| 10 | ServerHub | https://www.serverhub.digital/ | Free listing | Live and approved | Listing ID `8a1db629-7963-4099-ba0c-0100181fbfdd`, slug `localtry-ai-crm`, quality score 70 |

## Additional completed distribution

| Directory | Status | Confirmation or next action |
| --- | --- | --- |
| MCPServerHub.com | Submitted 2026-08-19 | Tally confirmation: `Done! Thanks for your submission!` |
| MCP Market | Already in free review queue | The free GitHub-repository intake reported that the repository is already queued; do not resubmit |
| LobeHub | Published version 1.0.1; repository enrichment processing | Approved GitHub authorization completed on 2026-08-20. `@lobehub/market-cli` published `philly88r-localtry-mcp@1.0.1` from the public repository; recheck the marketplace after enrichment completes. |

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
