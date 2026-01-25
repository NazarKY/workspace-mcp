import fetch from "node-fetch";

const SLACK_TOKEN = process.env.SLACK_TOKEN;

if (!SLACK_TOKEN) {
  throw new Error("Missing Slack config. Set SLACK_TOKEN.");
}

export const slackRequest = async (
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  method: "GET" | "POST" = "POST"
): Promise<unknown> => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  const url =
    method === "GET"
      ? `https://slack.com/api/${path}${query ? `?${query}` : ""}`
      : `https://slack.com/api/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${SLACK_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body: method === "GET" ? undefined : query,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Slack error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack error: ${data.error || "unknown_error"}`);
  }

  return data;
};
