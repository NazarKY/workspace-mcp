import { jiraApiVersion, jiraRequest } from "./client.js";
import type { ToolModule } from "../../core/toolRegistry.js";

const getStringArg = (
  args: Record<string, unknown>,
  key: string
): string => {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing or invalid argument: ${key}`);
  }
  return value;
};

export const jiraToolModule: ToolModule = {
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
  handlers: {
    jira_get_issue: async (args) => {
      const key = getStringArg(args, "key");
      const issue = await jiraRequest(
        `/rest/api/${jiraApiVersion}/issue/${encodeURIComponent(key)}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(issue, null, 2),
          },
        ],
      };
    },
    jira_search: async (args) => {
      const jql = getStringArg(args, "jql");
      const maxResults =
        typeof args.maxResults === "number" ? args.maxResults : 20;
      const payload = { jql, maxResults };
      const issues = await jiraRequest(
        `/rest/api/${jiraApiVersion}/search`,
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
    },
  },
};
