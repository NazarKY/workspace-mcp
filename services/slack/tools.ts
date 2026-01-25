import type { ToolModule } from "../../core/toolRegistry.js";
import { slackRequest } from "./client.js";

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

const parseSlackMessageUrl = (url: string) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const archivesIndex = parts.indexOf("archives");
  if (archivesIndex === -1 || parts.length < archivesIndex + 3) {
    throw new Error("Invalid Slack message URL.");
  }
  const channelId = parts[archivesIndex + 1];
  const messageId = parts[archivesIndex + 2];
  if (!messageId.startsWith("p") || messageId.length < 8) {
    throw new Error("Invalid Slack message URL.");
  }
  const raw = messageId.slice(1);
  const ts = `${raw.slice(0, -6)}.${raw.slice(-6)}`;
  return { channelId, ts };
};

export const slackToolModule: ToolModule = {
  tools: [
    {
      name: "slack_get_message_by_url",
      description: "Fetch a Slack message using a message URL.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Slack message URL",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "slack_get_channel_history",
      description: "Fetch recent messages from a channel by ID or name.",
      inputSchema: {
        type: "object",
        properties: {
          channel: {
            type: "string",
            description: "Channel ID (C...) or name (general)",
          },
          limit: {
            type: "number",
            description: "Max messages to return (default 20)",
          },
        },
        required: ["channel"],
      },
    },
    {
      name: "slack_find_channel",
      description: "Resolve a channel name to its ID.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Channel name without #." },
        },
        required: ["name"],
      },
    },
    {
      name: "slack_find_user",
      description: "Resolve a user by email or display name.",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "User email" },
          name: { type: "string", description: "Display name" },
        },
      },
    },
  ],
  handlers: {
    slack_get_message_by_url: async (args) => {
      const url = getStringArg(args, "url");
      const { channelId, ts } = parseSlackMessageUrl(url);
      const data = await slackRequest(
        "conversations.history",
        {
          channel: channelId,
          latest: ts,
          inclusive: true,
          limit: 1,
        },
        "POST"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
    slack_get_channel_history: async (args) => {
      const channel = getStringArg(args, "channel");
      const limit = typeof args.limit === "number" ? args.limit : 20;
      const channelId = channel.startsWith("C")
        ? channel
        : await resolveChannelId(channel);
      const data = await slackRequest(
        "conversations.history",
        { channel: channelId, limit },
        "POST"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    },
    slack_find_channel: async (args) => {
      const name = getStringArg(args, "name");
      const channelId = await resolveChannelId(name);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: channelId, name }, null, 2),
          },
        ],
      };
    },
    slack_find_user: async (args) => {
      const email = typeof args.email === "string" ? args.email : undefined;
      const name = typeof args.name === "string" ? args.name : undefined;
      if (!email && !name) {
        throw new Error("Provide email or name.");
      }
      if (email) {
        const data = await slackRequest("users.lookupByEmail", { email }, "GET");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      const data = await slackRequest(
        "users.list",
        { limit: 200, presence: false },
        "GET"
      );
      const users = (data as { members?: Array<{ name?: string; profile?: { display_name?: string } }> })
        .members || [];
      const normalized = name!.toLowerCase();
      const match = users.find((user) => {
        const display = user.profile?.display_name?.toLowerCase() || "";
        const handle = user.name?.toLowerCase() || "";
        return display === normalized || handle === normalized;
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ user: match ?? null }, null, 2),
          },
        ],
      };
    },
  },
};

const resolveChannelId = async (name: string): Promise<string> => {
  const data = await slackRequest(
    "conversations.list",
    { limit: 1000, exclude_archived: true },
    "GET"
  );
  const channels = (data as { channels?: Array<{ id: string; name: string }> })
    .channels || [];
  const match = channels.find((channel) => channel.name === name);
  if (!match) {
    throw new Error(`Channel not found: ${name}`);
  }
  return match.id;
};
