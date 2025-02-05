import { 
  messages,
  pipelineStages,
  type Message,
  type InsertMessage,
  type PipelineStage,
  type InsertPipelineStage,
} from "@shared/schema";

export interface IStorage {
  getPipelineStages(): Promise<PipelineStage[]>;
  getPipelineStage(id: number): Promise<PipelineStage | undefined>;
  createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage>;
  updatePipelineStage(id: number, updates: Partial<PipelineStage>): Promise<PipelineStage>;
  getMessages(stageId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private stages: Map<number, PipelineStage>;
  private msgs: Map<number, Message>;
  private stageId: number;
  private msgId: number;

  constructor() {
    this.stages = new Map();
    this.msgs = new Map();
    this.stageId = 1;
    this.msgId = 1;

    // Add initial stages
    this.createPipelineStage({ name: "Requirements Gathering" });
    this.createPipelineStage({ name: "Technical Specification" });
    this.createPipelineStage({ name: "Implementation" });
    this.createPipelineStage({ name: "Code Review" });
  }

  async getPipelineStages(): Promise<PipelineStage[]> {
    return Array.from(this.stages.values());
  }

  async getPipelineStage(id: number): Promise<PipelineStage | undefined> {
    return this.stages.get(id);
  }

  async createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage> {
    const id = this.stageId++;
    const newStage: PipelineStage = {
      ...stage,
      id,
      status: "pending",
      isComplete: false,
      requirementsSummary: null,
    };
    this.stages.set(id, newStage);
    return newStage;
  }

  async updatePipelineStage(id: number, updates: Partial<PipelineStage>): Promise<PipelineStage> {
    const stage = await this.getPipelineStage(id);
    if (!stage) throw new Error("Stage not found");
    
    const updatedStage = { ...stage, ...updates };
    this.stages.set(id, updatedStage);
    return updatedStage;
  }

  async getMessages(stageId: number): Promise<Message[]> {
    return Array.from(this.msgs.values()).filter(msg => msg.stageId === stageId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.msgId++;
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };
    this.msgs.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
