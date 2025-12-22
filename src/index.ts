import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTools, registerPrompts } from './registry';

async function main() {
  const mcp = new McpServer({
    name: 'oura-mcp-server',
    version: '1.0.0',
  });

  registerPrompts(mcp);
  registerTools(mcp);

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error('Server started');
}

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
