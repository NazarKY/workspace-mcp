# Work Integrations MCP

This is a small MCP server that exposes tools for multiple work systems
(Jira now, with Slack/GitHub and others planned).

## Current tools

- `jira_get_issue` - Fetch a Jira issue by key
- `jira_search` - Search Jira using JQL
- `slack_get_message_by_url` - Fetch a Slack message by URL
- `slack_get_channel_history` - Fetch recent Slack messages
- `slack_find_channel` - Resolve channel name to ID
- `slack_find_user` - Resolve user by email or display name
- `confluence_get_page` - Fetch a Confluence page by ID
- `confluence_get_page_by_url` - Fetch a Confluence page by URL
- `confluence_search` - Search Confluence using CQL

## Setup

1) Install dependencies:

   - `npm install`

2) Configure environment variables (examples):

   - `JIRA_BASE=https://company.atlassian.net`
   - `JIRA_EMAIL=you@company.com`
   - `JIRA_TOKEN=your_api_token`
   - `JIRA_API_VERSION=3`
   - `SLACK_TOKEN=xoxb-your-slack-bot-token`
   - `CONFLUENCE_BASE=https://company.atlassian.net/wiki`
   - `CONFLUENCE_EMAIL=you@company.com`
   - `CONFLUENCE_TOKEN=your_api_token`

3) Register the MCP server in Cursor (`~/.cursor/mcp.json`):

   ```json
   {
     "mcpServers": {
       "work-integrations-mcp": {
         "command": "npx",
         "args": [
           "tsx",
           "/ABS/PATH/jira-mcp/server.ts"
         ],
         "env": {
           "JIRA_BASE": "https://company.atlassian.net",
           "JIRA_EMAIL": "you@company.com",
           "JIRA_TOKEN": "your_api_token",
           "JIRA_API_VERSION": "3",
          "SLACK_TOKEN": "xoxb-your-slack-bot-token",
          "CONFLUENCE_BASE": "https://company.atlassian.net/wiki",
          "CONFLUENCE_EMAIL": "you@company.com",
          "CONFLUENCE_TOKEN": "your_api_token"
         }
       }
     }
   }
   ```

4) Restart Cursor.

## Usage examples

- "Use `jira_get_issue` with key `CVR-248`"
- "Search Jira with JQL: `project = CVR ORDER BY updated DESC`"
- "Use `slack_get_message_by_url` with url `https://...`"
- "Use `slack_get_channel_history` with channel `general`"
- "Use `slack_find_user` with email `user@company.com`"
- "Use `confluence_get_page` with id `123456`"
- "Use `confluence_get_page_by_url` with url `https://.../wiki/...`"
- "Use `confluence_search` with cql `space = DOCS and type = page`"

## Slack setup notes

Create a Slack App and install it in your workspace. Minimum scopes for
public channels:

- `channels:read`
- `channels:history`
- `users:read`
- `users:read.email`

For private channels, add:

- `groups:read`
- `groups:history`

## Extending

Add new tools for Slack, GitHub, or other services by adding a new folder
under `services/` and registering the module in `server.ts`:

1) Create `services/<service>/client.ts` for auth + API calls
2) Create `services/<service>/tools.ts` exporting a `ToolModule`
3) Import the module in `server.ts` and pass it to `mergeToolModules`
4) Add any new env variables in the Cursor MCP config if needed

Keep the tool names stable so existing prompts continue to work.
