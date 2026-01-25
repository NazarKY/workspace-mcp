import fetch, { type RequestInit } from "node-fetch";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const JIRA_BASE = process.env.JIRA_BASE;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_API_VERSION = process.env.JIRA_API_VERSION || "3";

if (!JIRA_BASE || !JIRA_EMAIL || !JIRA_TOKEN) {
  throw new Error(
    "Missing Jira config. Set JIRA_BASE, JIRA_EMAIL, and JIRA_TOKEN."
  );
}

const server = new Server(
  { name: "jira-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const jiraRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<unknown> => {
  const res = await fetch(`${JIRA_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64"),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira error ${res.status}: ${text}`);
  }

  return res.json();
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "jira_get_issue",
      description: "Fetch a Jira issue by key.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Issue key, e.g. ABC-123" },
        },
        required: ["key"],
      },
    },
    {
      name: "jira_search",
      description: "Search Jira using JQL.",
      inputSchema: {
        type: "object",
        properties: {
          jql: { type: "string", description: "JQL query" },
          maxResults: {
            type: "number",
            description: "Max issues to return (default 20)",
          },
        },
        required: ["jql"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "jira_get_issue") {
    const issue = await jiraRequest(
      `/rest/api/${JIRA_API_VERSION}/issue/${encodeURIComponent(args.key)}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  if (name === "jira_search") {
    const payload = {
      jql: args.jql,
      maxResults: args.maxResults ?? 20,
    };
    const issues = await jiraRequest(
      `/rest/api/${JIRA_API_VERSION}/search`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(issues, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
