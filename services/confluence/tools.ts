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

type ConfluenceMultiEntityResponse<T> = {
  results?: T[];
  _links?: {
    next?: string;
  };
};

type ConfluenceComment = {
  id?: string | number;
  [key: string]: unknown;
};

const normalizeConfluencePath = (pathOrUrl: string): string => {
  const ensureLeadingSlash = (value: string) =>
    value.startsWith("/") ? value : `/${value}`;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const parsed = new URL(pathOrUrl);
    const normalized = `${parsed.pathname}${parsed.search}`;
    const withoutWiki = normalized.startsWith("/wiki/")
      ? normalized.slice("/wiki".length)
      : normalized;
    return ensureLeadingSlash(withoutWiki);
  }

  const withoutWiki = pathOrUrl.startsWith("/wiki/")
    ? pathOrUrl.slice("/wiki".length)
    : pathOrUrl;
  return ensureLeadingSlash(withoutWiki);
};

const getCommentId = (comment: ConfluenceComment): string => {
  if (typeof comment.id === "string" && comment.id.trim().length > 0) {
    return comment.id;
  }
  if (typeof comment.id === "number" && Number.isFinite(comment.id)) {
    return String(comment.id);
  }
  throw new Error("Confluence comment response is missing id.");
};

const confluenceRequestAllPages = async <T>(initialPath: string): Promise<T[]> => {
  const results: T[] = [];
  let nextPath: string | undefined = initialPath;

  while (nextPath) {
    const page = (await confluenceRequest(
      nextPath
    )) as ConfluenceMultiEntityResponse<T>;
    if (Array.isArray(page.results)) {
      results.push(...page.results);
    }
    nextPath =
      typeof page._links?.next === "string"
        ? normalizeConfluencePath(page._links.next)
        : undefined;
  }

  return results;
};

const fetchCommentChildren = async (
  kind: "footer-comments" | "inline-comments",
  commentId: string,
  bodyFormat: "storage" | "atlas_doc_format" | "view"
): Promise<ConfluenceComment[]> => {
  const encodedBodyFormat = encodeURIComponent(bodyFormat);
  const children = await confluenceRequestAllPages<ConfluenceComment>(
    `/api/v2/${kind}/${encodeURIComponent(
      commentId
    )}/children?body-format=${encodedBodyFormat}&limit=250`
  );

  return Promise.all(
    children.map(async (child) => {
      const childId = getCommentId(child);
      const nestedChildren = await fetchCommentChildren(kind, childId, bodyFormat);
      return {
        ...child,
        children: nestedChildren,
      };
    })
  );
};

const fetchPageComments = async (
  pageId: string,
  kind: "footer-comments" | "inline-comments",
  bodyFormat: "storage" | "atlas_doc_format" | "view"
): Promise<Array<ConfluenceComment & { children: ConfluenceComment[] }>> => {
  const encodedPageId = encodeURIComponent(pageId);
  const encodedBodyFormat = encodeURIComponent(bodyFormat);
  const rootComments = await confluenceRequestAllPages<ConfluenceComment>(
    `/api/v2/pages/${encodedPageId}/${kind}?body-format=${encodedBodyFormat}&limit=250`
  );

  return Promise.all(
    rootComments.map(async (comment) => {
      const commentId = getCommentId(comment);
      const children = await fetchCommentChildren(kind, commentId, bodyFormat);
      return {
        ...comment,
        children,
      };
    })
  );
};

const fetchPageWithComments = async (pageId: string) => {
  const encodedPageId = encodeURIComponent(pageId);
  const bodyFormat = "storage" as const;
  const page = await confluenceRequest(
    `/api/v2/pages/${encodedPageId}?body-format=${encodeURIComponent(bodyFormat)}`
  );
  const [footerComments, inlineComments] = await Promise.all([
    fetchPageComments(pageId, "footer-comments", bodyFormat),
    fetchPageComments(pageId, "inline-comments", bodyFormat),
  ]);

  return {
    page,
    comments: {
      footer: footerComments,
      inline: inlineComments,
    },
  };
};

export const confluenceToolModule: ToolModule = {
  tools: [
    {
      name: "confluence_get_page",
      description:
        "Fetch a Confluence page by ID with footer and inline comments (including nested replies).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Page ID" },
          expand: {
            type: "string",
            description:
              "Deprecated in v2 API and ignored. Kept for backward compatibility.",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "confluence_get_page_by_url",
      description:
        "Fetch a Confluence page by URL with footer and inline comments (including nested replies).",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Confluence page URL" },
          expand: {
            type: "string",
            description:
              "Deprecated in v2 API and ignored. Kept for backward compatibility.",
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
      const page = await fetchPageWithComments(id);
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
      const page = await fetchPageWithComments(id);
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
