# Connect LocalTry to ChatGPT

LocalTry is exposed as a remote MCP app at:

```text
https://mcp.localtry.com/mcp
```

Full MCP write actions are currently available in ChatGPT Business and
Enterprise/Edu. ChatGPT Pro currently supports read/fetch custom apps.

1. Enable developer mode in ChatGPT workspace or app settings.
2. Open **Settings -> Apps -> Create**.
3. Enter the LocalTry MCP endpoint.
4. Choose OAuth authentication and select **Scan tools**.
5. Sign in to LocalTry and review the requested business and permissions.
6. Approve the connection, test the draft app, and publish it for the workspace.

ChatGPT may require confirmation before write or modify actions. LocalTry also
enforces approval tokens for workspace application and restoration operations.

Official OpenAI instructions:
https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta
