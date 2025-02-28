import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { pipelineService } from '@/services/pipeline-service';
import { Message, PipelineStage } from '@/types/schema';
import { useState } from 'react';

export function usePipeline(stageId: number | null) {
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  
  // Get messages for a stage
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/stages/${stageId}/messages`],
    queryFn: () => stageId ? pipelineService.getStageMessages(stageId) : [],
    enabled: !!stageId, // Only run if we have a stage ID
  });

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ content, chatId }: { content: string, chatId?: number }) => {
      // Handle both new chats and existing chats
      let finalStageId = stageId;
      let chatWasCreated = false;
      
      // If this is a new chat, create it first
      if (!stageId && chatId === undefined) {
        // Create a new chat
        const chat = await pipelineService.getStages(chatId!);
        finalStageId = chat[0].id;
        chatWasCreated = true;
      }
      
      // Send the user message
      await pipelineService.sendMessage(finalStageId!, { 
        role: 'user',
        content
      });
      
      // Get the message history
      const messageHistory = await pipelineService.getStageMessages(finalStageId!);
      
      // Process the message through the pipeline
      const response = await pipelineService.processPipeline({
        prompt_model_name: 'gpt-4',
        message_history: messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });
      
      // Save the agent response
      await pipelineService.sendMessage(finalStageId!, {
        role: response.response.role,
        content: response.response.content,
      });
      
      // Set approval needed state
      setApprovalNeeded(!!response.approval_needed);
      
      return {
        stageId: finalStageId,
        chatWasCreated,
        approvalNeeded: !!response.approval_needed,
      };
    },
    onSuccess: (result) => {
      // Invalidate queries with the final stage ID
      queryClient.invalidateQueries({
        queryKey: [`/api/stages/${result.stageId}/messages`],
      });
      
      if (result.chatWasCreated) {
        // Invalidate the chats query if a new chat was created
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      }
    },
  });

  // Approve stage mutation
  const { mutate: approveStage, isPending: isApproving } = useMutation({
    mutationFn: () => stageId ? pipelineService.approveStage(stageId) : Promise.reject('No stage ID'),
    onSuccess: () => {
      // Reset approval needed state
      setApprovalNeeded(false);
      
      // Invalidate stages query to update stage status
      queryClient.invalidateQueries({
        queryKey: ['/api/chats', undefined, 'stages'],
      });
    },
  });

  // Reject stage mutation
  const { mutate: rejectStage, isPending: isRejecting } = useMutation({
    mutationFn: () => stageId ? pipelineService.rejectStage(stageId) : Promise.reject('No stage ID'),
    onSuccess: () => {
      // Reset approval needed state
      setApprovalNeeded(false);
      
      // Invalidate stages query to update stage status
      queryClient.invalidateQueries({
        queryKey: ['/api/chats', undefined, 'stages'],
      });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    isSending,
    approveStage,
    isApproving,
    rejectStage,
    isRejecting,
    approvalNeeded,
  };
}