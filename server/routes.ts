import type { Express } from "express";
import { Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./vite";

const clients = new Set<WebSocket>();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Helper function to proxy requests to the backend API
async function proxyRequest(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    log(`Proxying request to ${BACKEND_URL}${path}`, "proxy");
    const backendResponse = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        ...(req.headers as Record<string, string>)
      },
      body: (method === "GET" || method === "HEAD") ? undefined : JSON.stringify(req.body),
    });
    const data = await backendResponse.json();
    log(`Received response from backend with status ${backendResponse.status}`, "proxy");
    res.status(backendResponse.status).json(data);
  } catch (error: unknown) {
    log(`Error in proxy request: ${error}`, "proxy-error");
    if (error instanceof Error) {
      res.status(500).json({ message: error.toString() });
    } else {
      res.status(500).json({ message: String(error) });
    }
  }
}

export function registerRoutes(app: Express) {
  log("Starting to register routes...", "startup");
  const server = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast messages to all connected clients
  function broadcastMessages(stageId: number, messages: any[]) {
    const payload = JSON.stringify({
      type: 'messages',
      stageId,
      messages: messages[0]?.type === 'messages' ? messages[0].messages : messages
    });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Proxy all /api requests to the backend
  app.all("/api/*", (req: Request, res: Response) => {
    console.log('DEBUG - Hit proxy route:', req.method, req.path);
    process.stdout.write(`DEBUG - Hit proxy route: ${req.method} ${req.path}\n`);
    log(`Received API request: ${req.method} ${req.path}`, "proxy-route");
    return proxyRequest(req, res, req.method, req.path);
  });

  return server;
}