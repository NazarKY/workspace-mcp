export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolHandlerResult = {
  content: Array<{ type: "text"; text: string }>;
};

export type ToolHandler = (
  args: Record<string, unknown>
) => Promise<ToolHandlerResult>;

export type ToolModule = {
  tools: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
};

export const mergeToolModules = (modules: ToolModule[]) => {
  const tools: ToolDefinition[] = [];
  const handlers: Record<string, ToolHandler> = {};

  for (const module of modules) {
    for (const tool of module.tools) {
      if (handlers[tool.name]) {
        throw new Error(`Duplicate tool name: ${tool.name}`);
      }
      tools.push(tool);
    }

    for (const [name, handler] of Object.entries(module.handlers)) {
      if (handlers[name]) {
        throw new Error(`Duplicate handler name: ${name}`);
      }
      handlers[name] = handler;
    }
  }

  return { tools, handlers };
};
