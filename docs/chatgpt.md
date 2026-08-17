# Connect LocalTry to ChatGPT

LocalTry is exposed as a remote MCP app at:

```text
https://mcp.localtry.com/mcp
```

Full MCP write actions are currently available in ChatGPT Business and
Enterprise/Edu on the web. ChatGPT Pro currently supports read/fetch custom
apps; plan capabilities can change, so verify the current OpenAI documentation
before rollout.

1. Enable developer mode under **Settings -> Security and login**.
2. Open **Plugins** and choose **Create app**.
3. Name the app `LocalTry` and enter `https://mcp.localtry.com/mcp` as the
   server URL.
4. Keep OAuth authentication selected, accept the unverified-app notice, and
   create the app.
5. Sign in to LocalTry and review the requested business and permissions.
6. Choose **Connect workspace**. The resulting grant is limited to that visible
   LocalTry business and the signed-in user's current role.

The connection can be removed from ChatGPT plugin settings at any time. LocalTry
also rechecks the user's active membership, role, and scopes on every tool call,
so access changes take effect without waiting for an old connection to expire.

ChatGPT may require confirmation before write or modify actions. LocalTry also
enforces approval tokens for workspace application and restoration operations.

Official OpenAI instructions:
https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta
