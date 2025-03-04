import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  requirementsSummary: text("requirements_summary"),
  isComplete: boolean("is_complete").notNull().default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull(),
  role: text("role").notNull(), // 'user' | 'agent'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ 
  id: true,
  isComplete: true,
  status: true,
  requirementsSummary: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true,
  timestamp: true,
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
