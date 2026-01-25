# Work Integrations MCP

This is a small MCP server that exposes tools for multiple work systems
(Jira now, with Slack/GitHub and others planned).

## Current tools

- `jira_get_issue` - Fetch a Jira issue by key
- `jira_search` - Search Jira using JQL

## Setup

1) Install dependencies:

   - `npm install`

2) Configure environment variables (examples):

   - `JIRA_BASE=https://company.atlassian.net`
   - `JIRA_EMAIL=you@company.com`
   - `JIRA_TOKEN=your_api_token`
   - `JIRA_API_VERSION=3`

3) Register the MCP server in Cursor (`~/.cursor/mcp.json`):

   ```json
   {
     "mcpServers": {
       "work-integrations-mcp": {
         "command": "npx",
         "args": ["tsx", "/ABS/PATH/jira-mcp/server.ts"],
         "env": {
           "JIRA_BASE": "https://company.atlassian.net",
           "JIRA_EMAIL": "you@company.com",
           "JIRA_TOKEN": "your_api_token",
           "JIRA_API_VERSION": "3"
         }
       }
     }
   }
   ```

4) Restart Cursor.

## Usage examples

- "Use `jira_get_issue` with key `CVR-248`"
- "Search Jira with JQL: `project = CVR ORDER BY updated DESC`"

## Extending

Add new tools for Slack, GitHub, or other services in `server.js` by:

1) Defining a new tool in the `ListToolsRequestSchema` handler
2) Handling the tool in the `CallToolRequestSchema` handler
3) Adding new env variables in the Cursor MCP config if needed

Keep the tool names stable so existing prompts continue to work.
