import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { WebSocketServer, WebSocket } from "ws";

const clients = new Set<WebSocket>();

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
    const payload = JSON.stringify({ type: 'messages', stageId, messages });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  app.get("/api/stages", async (req, res) => {
    const stages = await storage.getPipelineStages();
    res.json(stages);
  });

  app.get("/api/stages/:id", async (req, res) => {
    const stage = await storage.getPipelineStage(Number(req.params.id));
    if (!stage) {
      res.status(404).json({ message: "Stage not found" });
      return;
    }
    res.json(stage);
  });

  app.patch("/api/stages/:id", async (req, res) => {
    try {
      const stage = await storage.updatePipelineStage(Number(req.params.id), req.body);

      if (req.body.isComplete && req.body.status === "complete") {
        const nextStageId = stage.id + 1;
        const nextStage = await storage.getPipelineStage(nextStageId);
        if (nextStage) {
          await storage.updatePipelineStage(nextStageId, { status: "inProgress" });
          const message = await storage.createMessage({
            stageId: nextStageId,
            role: "agent",
            content: `Starting ${nextStage.name}. How would you like to proceed?`
          });
          broadcastMessages(nextStageId, [message]);
        }
      }

      res.json(stage);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get("/api/stages/:id/messages", async (req, res) => {
    const messages = await storage.getMessages(Number(req.params.id));
    console.log("Sending messages:", messages);
    res.json(messages);
  });

  app.post("/api/stages/:id/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid message data" });
      return;
    }

    try {
      const userMessage = await storage.createMessage(parsed.data);
      console.log("Created user message:", userMessage);

      const agentMessage = await storage.simulateAgentResponse(
        userMessage.stageId,
        userMessage.content
      );
      console.log("Created agent message:", agentMessage);

      const stage = await storage.getPipelineStage(userMessage.stageId);
      if (stage && stage.status === "pending") {
        await storage.updatePipelineStage(stage.id, { status: "inProgress" });
      }

      const messages = [userMessage, agentMessage];
      console.log("Sending response messages:", messages);

      // Broadcast messages through WebSocket
      broadcastMessages(userMessage.stageId, messages);

      res.json(messages);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  return server;
}