import { z } from "zod";

export const messageRoleSchema = z.enum(["system", "user", "assistant"]);

// Base message fields needed for API requests
export const messageBaseSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
});

// Full message as returned from the API
export const messageSchema = messageBaseSchema.extend({
  id: z.number(),
  stageId: z.number(),
  timestamp: z.date(),
});

// Schema for creating a new message
export const insertMessageSchema = messageBaseSchema.extend({
  stageId: z.number(),
});

export const pipelineRequestSchema = z.object({
  prompt_model_name: z.string().optional().default("gpt-4"),
  message_history: z.array(messageBaseSchema.pick({ role: true, content: true })),
});

export const pipelineResponseSchema = z.object({
  status: z.string(),
  response: messageBaseSchema.pick({ role: true, content: true }),
});

export const pipelineStageSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string().nullable(),
  created_at: z.string(),
  next_stage_id: z.number().nullable(),
});

export type Message = z.infer<typeof messageSchema>;
export type MessageBase = z.infer<typeof messageBaseSchema>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type PipelineRequest = z.infer<typeof pipelineRequestSchema>;
export type PipelineResponse = z.infer<typeof pipelineResponseSchema>;
export type PipelineStage = z.infer<typeof pipelineStageSchema>;
