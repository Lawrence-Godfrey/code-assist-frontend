import type { Express } from "express";
import { Request, Response } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const clients = new Set<WebSocket>();

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Helper function to proxy requests to the backend API
async function proxyRequest(req: Request, res: Response, method: string, path: string): Promise<void> {
  try {
    const backendResponse = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        ...(req.headers as Record<string, string>)
      },
      body: (method === "GET" || method === "HEAD") ? undefined : JSON.stringify(req.body),
    });
    const data = await backendResponse.json();
    res.status(backendResponse.status).json(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.toString() });
    } else {
      res.status(500).json({ message: String(error) });
    }
  }
}

export function registerRoutes(app: Express) {
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

  app.get("/api/stages", (req, res) => {
    return proxyRequest(req, res, "GET", "/api/stages");
  });

  app.get("/api/stages/:id", (req, res) => {
    return proxyRequest(req, res, "GET", `/api/stages/${req.params.id}`);
  });

  app.patch("/api/stages/:id", (req, res) => {
    return proxyRequest(req, res, "PATCH", `/api/stages/${req.params.id}`);
  });

  app.get("/api/stages/:id/messages", (req, res) => {
    return proxyRequest(req, res, "GET", `/api/stages/${req.params.id}/messages`);
  });

  app.post("/api/stages/:id/messages", (req, res) => {
    return proxyRequest(req, res, "POST", `/api/stages/${req.params.id}/messages`);
  });

  return server;
}