import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// WebSocket connections for live preview sync
const livePreviewConnections = new Set<WebSocket>();

// Broadcast a message to all connected clients
function broadcastToClients(message: any) {
  const jsonMessage = JSON.stringify(message);
  for (const client of livePreviewConnections) {
    try {
      client.send(jsonMessage);
    } catch (error) {
      console.error('Error sending message to client:', error);
      livePreviewConnections.delete(client);
    }
  }
}

// Handle WebSocket upgrade requests
function handleWebSocketUpgrade(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname === '/api/ws') {
    const upgradeHeader = request.headers.get('upgrade');
    if (upgradeHeader !== 'websocket') {
      return null;
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = webSocketPair;

    server.accept();
    
    // Add the new connection to our set
    livePreviewConnections.add(server);
    
    // Remove the connection when it closes
    server.addEventListener('close', () => {
      livePreviewConnections.delete(server);
    });
    
    // Handle errors
    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      livePreviewConnections.delete(server);
    });

    // Send welcome message
    server.send(JSON.stringify({ type: 'connected', message: 'Live preview connected' }));

    return new Response(null, { status: 101, webSocket: client });
  }
  
  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // Handle WebSocket upgrade requests
    const wsResponse = handleWebSocketUpgrade(request);
    if (wsResponse) {
      return wsResponse;
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

// Export function to notify clients of file changes
export function notifyFileChange() {
  broadcastToClients({ type: 'fileChange', timestamp: Date.now() });
}
