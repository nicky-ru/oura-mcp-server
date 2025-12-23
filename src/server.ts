import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  registerTools,
  registerPrompts,
  registerResources,
} from './registry';

export function createOuraMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'oura-mcp-server',
    version: '1.0.0',
  });

  registerPrompts(mcp);
  registerTools(mcp);
  registerResources(mcp);

  return mcp;
}

