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
  simulateAgentResponse(stageId: number, userMessage: string): Promise<Message>;
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

    // Add initial stages with empty status
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
      status: "",
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

    // If stage is approved, update the requirements summary
    if (updates.isComplete && stage.name === "Requirements Gathering") {
      const messages = await this.getMessages(id);
      const requirements = messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join("\n");
      updatedStage.requirementsSummary = `Requirements Summary:\n${requirements}`;
      this.stages.set(id, updatedStage);
    }

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

    // Update stage status to inProgress when first message is created
    const stage = await this.getPipelineStage(message.stageId);
    if (stage && !stage.status) {
      await this.updatePipelineStage(stage.id, { status: "inProgress" });
    }

    return newMessage;
  }

  async simulateAgentResponse(stageId: number, userMessage: string): Promise<Message> {
    const stage = await this.getPipelineStage(stageId);
    if (!stage) throw new Error("Stage not found");

    // Simulate different agent responses based on the stage
    let response: string;
    let shouldRequestApproval = false;

    switch (stage.name) {
      case "Requirements Gathering":
        if (userMessage.toLowerCase().includes("yes") || userMessage.toLowerCase().includes("that's correct")) {
          response = "Great! I think I have gathered all the necessary requirements. Please review them and approve if everything looks correct.";
          shouldRequestApproval = true;
        } else {
          response = "Could you please provide more details about the specific functionality you need? This will help me better understand the requirements.";
        }
        break;
      case "Technical Specification":
        response = "Based on the requirements, I suggest using the following technical approach. Let me know if you'd like me to adjust any part of this specification.";
        break;
      case "Implementation":
        response = "I'm working on implementing the changes according to the technical specification. Would you like me to explain any part of the implementation?";
        break;
      case "Code Review":
        response = "I've reviewed the code changes. Everything looks good, but please let me know if you'd like me to focus on any specific aspects.";
        break;
      default:
        response = "How can I help you with this stage?";
    }

    if (shouldRequestApproval) {
      await this.updatePipelineStage(stageId, { status: "waitingForApproval" });
    }

    return this.createMessage({
      stageId,
      role: "agent",
      content: response,
    });
  }
}

export const storage = new MemStorage();