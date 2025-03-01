import { api } from './api';
import { PipelineStage, Message } from '@/types/schema';

export interface PipelineResponse {
  response: {
    role: string;
    content: string;
  };
  approval_needed?: boolean;
}

export const pipelineService = {
  // Get all stages for a chat
  getStages: (chatId: number) => 
    api.get<PipelineStage[]>(`/api/chats/${chatId}/stages`),
  
  // Get a specific stage
  getStage: (stageId: number) => 
    api.get<PipelineStage>(`/api/stages/${stageId}`),
  
  // Get messages for a stage
  getStageMessages: (stageId: number) => 
    api.get<Message[]>(`/api/stages/${stageId}/messages`),
  
  // Send a message to a stage
  sendMessage: (stageId: number, message: { role: string, content: string }) => 
    api.post<Message>(`/api/stages/${stageId}/messages`, message),
  
  // Generic process stage function that uses the endpoint from the stage
  processStage: (data: { 
    prompt_model_name: string, 
    message_history: { role: string, content: string }[],
    stage_id?: number,
    endpoint: string
  }) => api.post<PipelineResponse>(data.endpoint, {
    prompt_model_name: data.prompt_model_name,
    message_history: data.message_history,
    stage_id: data.stage_id
  }),
  
  // Legacy functions - to be deprecated
  processRequirementsGathering: (data: { 
    prompt_model_name: string, 
    message_history: { role: string, content: string }[],
    stage_id?: number
  }) => api.post<PipelineResponse>('/api/pipeline/requirements-gatherer', data),
  
  // Legacy function - to be deprecated
  processTechSpecGenerator: (data: { 
    prompt_model_name: string, 
    message_history: { role: string, content: string }[],
    stage_id?: number
  }) => api.post<PipelineResponse>('/api/pipeline/tech-spec-generator', data),
  
  // Approve a stage
  approveStage: (stageId: number) => 
    api.post<PipelineStage>(`/api/stages/${stageId}/approve`),
  
  // Reject a stage
  rejectStage: (stageId: number) => 
    api.post<PipelineStage>(`/api/stages/${stageId}/reject`),
};