import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

export function registerRoutes(app: Express) {
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
    const stage = await storage.updatePipelineStage(Number(req.params.id), req.body);
    res.json(stage);
  });

  app.get("/api/stages/:id/messages", async (req, res) => {
    const messages = await storage.getMessages(Number(req.params.id));
    res.json(messages);
  });

  app.post("/api/stages/:id/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid message data" });
      return;
    }
    
    const message = await storage.createMessage(parsed.data);
    res.json(message);
  });

  return createServer(app);
}
