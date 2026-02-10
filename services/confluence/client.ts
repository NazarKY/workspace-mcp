import fetch, { type RequestInit } from "node-fetch";

const CONFLUENCE_BASE =
  process.env.CONFLUENCE_BASE ||
  (process.env.JIRA_BASE ? `${process.env.JIRA_BASE}/wiki` : undefined);
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL || process.env.JIRA_EMAIL;
const CONFLUENCE_TOKEN = process.env.CONFLUENCE_TOKEN || process.env.JIRA_TOKEN;

if (!CONFLUENCE_BASE || !CONFLUENCE_EMAIL || !CONFLUENCE_TOKEN) {
  throw new Error(
    "Missing Confluence config. Set CONFLUENCE_BASE, CONFLUENCE_EMAIL, and CONFLUENCE_TOKEN."
  );
}

export const confluenceRequest = async (
  path: string,
  options: RequestInit = {}
): Promise<unknown> => {
  const res = await fetch(`${CONFLUENCE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_TOKEN}`).toString("base64"),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Confluence error ${res.status}: ${text}`);
  }

  return res.json();
};
