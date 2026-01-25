import fetch, { type RequestInit } from "node-fetch";

const JIRA_BASE = process.env.JIRA_BASE;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_API_VERSION = process.env.JIRA_API_VERSION || "3";

if (!JIRA_BASE || !JIRA_EMAIL || !JIRA_TOKEN) {
  throw new Error(
    "Missing Jira config. Set JIRA_BASE, JIRA_EMAIL, and JIRA_TOKEN."
  );
}

export const jiraApiVersion = JIRA_API_VERSION;

export const jiraRequest = async (
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
