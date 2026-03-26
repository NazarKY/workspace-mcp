import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mergeToolModules } from "./core/toolRegistry.js";
import type { ToolModule } from "./core/toolRegistry.js";
import { jiraToolModule } from "./services/jira/tools.js";
import { confluenceToolModule } from "./services/confluence/tools.js";

const server = new Server(
  { name: "jira-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const modules: ToolModule[] = [jiraToolModule, confluenceToolModule];
if (process.env.SLACK_TOKEN) {
  const { slackToolModule } = await import("./services/slack/tools.js");
  modules.push(slackToolModule);
}

const { tools, handlers } = mergeToolModules(modules);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const handler = handlers[name];

  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return handler((args ?? {}) as Record<string, unknown>);
});

const transport = new StdioServerTransport();
await server.connect(transport);
