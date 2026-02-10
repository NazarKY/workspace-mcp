import type { ToolModule } from "../../core/toolRegistry.js";
import { confluenceRequest } from "./client.js";

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

const parseConfluencePageUrl = (url: string) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const pagesIndex = parts.indexOf("pages");
  if (pagesIndex === -1 || parts.length < pagesIndex + 2) {
    throw new Error("Invalid Confluence page URL.");
  }
  const pageId = parts[pagesIndex + 1];
  if (!/^\d+$/.test(pageId)) {
    throw new Error("Invalid Confluence page URL.");
  }
  return pageId;
};

export const confluenceToolModule: ToolModule = {
  tools: [
    {
      name: "confluence_get_page",
      description: "Fetch a Confluence page by ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Page ID" },
          expand: {
            type: "string",
            description:
              "Optional expand fields (default: body.storage,version,space)",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "confluence_get_page_by_url",
      description: "Fetch a Confluence page by URL.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Confluence page URL" },
          expand: {
            type: "string",
            description:
              "Optional expand fields (default: body.storage,version,space)",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "confluence_search",
      description: "Search Confluence using CQL.",
      inputSchema: {
        type: "object",
        properties: {
          cql: { type: "string", description: "CQL query" },
          limit: {
            type: "number",
            description: "Max results to return (default 10)",
          },
        },
        required: ["cql"],
      },
    },
  ],
  handlers: {
    confluence_get_page: async (args) => {
      const id = getStringArg(args, "id");
      const expand =
        typeof args.expand === "string" && args.expand.trim().length > 0
          ? args.expand
          : "body.storage,version,space";
      const page = await confluenceRequest(
        `/rest/api/content/${encodeURIComponent(id)}?expand=${encodeURIComponent(
          expand
        )}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(page, null, 2),
          },
        ],
      };
    },
    confluence_get_page_by_url: async (args) => {
      const url = getStringArg(args, "url");
      const id = parseConfluencePageUrl(url);
      const expand =
        typeof args.expand === "string" && args.expand.trim().length > 0
          ? args.expand
          : "body.storage,version,space";
      const page = await confluenceRequest(
        `/rest/api/content/${encodeURIComponent(id)}?expand=${encodeURIComponent(
          expand
        )}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(page, null, 2),
          },
        ],
      };
    },
    confluence_search: async (args) => {
      const cql = getStringArg(args, "cql");
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const results = await confluenceRequest(
        `/rest/api/content/search?cql=${encodeURIComponent(
          cql
        )}&limit=${encodeURIComponent(String(limit))}`
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    },
  },
};
