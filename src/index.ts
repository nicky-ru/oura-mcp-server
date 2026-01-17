import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { startHttpServer } from './http';
import { createOuraMcpServer } from './server';

async function main() {
  const mcp = createOuraMcpServer();

  const httpPort = process.env.MCP_HTTP_PORT
    ? parseInt(process.env.MCP_HTTP_PORT, 10)
    : 0;

  if (httpPort > 0) {
    startHttpServer(httpPort);
  } else {
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    console.error('Stdio server started');
  }
}

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
