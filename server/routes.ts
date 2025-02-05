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
    try {
      const stage = await storage.updatePipelineStage(Number(req.params.id), req.body);

      // If stage was approved, simulate the next stage starting
      if (req.body.isComplete && req.body.status === "complete") {
        const nextStageId = stage.id + 1;
        const nextStage = await storage.getPipelineStage(nextStageId);
        if (nextStage) {
          await storage.updatePipelineStage(nextStageId, { status: "inProgress" });
          // Create initial agent message for next stage
          await storage.createMessage({
            stageId: nextStageId,
            role: "agent",
            content: `Starting ${nextStage.name}. How would you like to proceed?`
          });
        }
      }

      res.json(stage);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
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

    try {
      // First create the user's message
      const userMessage = await storage.createMessage(parsed.data);

      // Then simulate the agent's response
      const agentMessage = await storage.simulateAgentResponse(
        userMessage.stageId,
        userMessage.content
      );

      // Update stage status to inProgress if it was pending
      const stage = await storage.getPipelineStage(userMessage.stageId);
      if (stage && stage.status === "pending") {
        await storage.updatePipelineStage(stage.id, { status: "inProgress" });
      }

      // Return both messages
      res.json([userMessage, agentMessage]);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  return createServer(app);
}