import { randomUUID } from 'node:crypto';

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { createOuraMcpServer } from './server';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface Session {
  transport: WebStandardStreamableHTTPServerTransport;
  mcpServer: McpServer;
}

const sessions = new Map<string, Session>();

function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    session.transport.close().catch((err) => {
      console.error(`Error closing transport for session ${sessionId}:`, err);
    });
  }
}

export function startHttpServer(port: number = 3000) {
  const server = Bun.serve({
    port,
    async fetch(req: Request) {
      const url = new URL(req.url);

      if (url.pathname !== '/mcp') {
        return new Response('Not Found', { status: 404 });
      }

      const sessionId = req.headers.get('mcp-session-id');

      if (req.method === 'POST') {
        let parsedBody: unknown;
        try {
          parsedBody = await req.json();
        } catch {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32700, message: 'Parse error' },
              id: null,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          return session.transport.handleRequest(req, { parsedBody });
        }

        if (!sessionId && isInitializeRequest(parsedBody)) {
          const newSessionId = randomUUID();
          const mcpServer = createOuraMcpServer();
          const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
            onsessioninitialized: (id) => {
              // Session already stored, this is just for notification
              console.error(`Session initialized: ${id}`);
            },
            onsessionclosed: (id) => {
              cleanupSession(id);
            },
          });

          transport.onclose = () => {
            cleanupSession(newSessionId);
          };

          await mcpServer.connect(transport);

          // Store session immediately with the known session ID
          sessions.set(newSessionId, { transport, mcpServer });

          return transport.handleRequest(req, { parsedBody });
        }

        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Invalid session' },
            id: null,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (req.method === 'GET') {
        if (!sessionId) {
          return new Response('Session ID required', { status: 400 });
        }

        const session = sessions.get(sessionId);
        if (!session) {
          return new Response('Invalid session', { status: 404 });
        }

        return session.transport.handleRequest(req);
      }

      if (req.method === 'DELETE') {
        if (!sessionId) {
          return new Response('Session ID required', { status: 400 });
        }

        const session = sessions.get(sessionId);
        if (!session) {
          return new Response('Invalid session', { status: 404 });
        }

        const response = await session.transport.handleRequest(req);
        cleanupSession(sessionId);
        return response;
      }

      return new Response('Method Not Allowed', { status: 405 });
    },
  });

  console.error(`HTTP server started on port ${port}`);
  console.error(`MCP endpoint: http://localhost:${port}/mcp`);

  return server;
}
