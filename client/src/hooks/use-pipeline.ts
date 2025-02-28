import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { pipelineService } from '@/services/pipeline-service';
import { Message, PipelineStage } from '@/types/schema';
import { useState, useEffect, useRef } from 'react';

export function usePipeline(stageId: number | null, options?: { 
  autoTest?: boolean;
  testMessages?: {role: string, content: string}[];
  testResponses?: {role: string, content: string, approvalNeeded?: boolean}[];
}) {
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [autoTestIndex, setAutoTestIndex] = useState(0);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  
  // Use a ref to keep track of mounted state
  const isMounted = useRef(true);
  
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

  // Handle cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Auto testing functionality
  useEffect(() => {
    if (!options?.autoTest || !options?.testMessages || !options?.testResponses) {
      return;
    }

    if (isAutoTesting || autoTestIndex >= (options.testMessages?.length || 0)) {
      return;
    }

    // Automatically send the next test message
    const nextMessage = options.testMessages[autoTestIndex];
    const simulatedResponse = options.testResponses[autoTestIndex];
    
    // Skip if we don't have a message or response for this index
    if (!nextMessage || !simulatedResponse) {
      return;
    }

    const runTest = async () => {
      setIsAutoTesting(true);
      
      try {
        // Simulate sending a message and getting a response
        // This is a mock that doesn't actually call the API
        console.log(`[Auto Test] Sending message: ${nextMessage.content}`);
        
        // Add a small delay to make it look realistic
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted.current) return;
        
        // Add user message to message history
        const userMessage: Message = {
          id: `auto-user-${Date.now()}`,
          content: nextMessage.content,
          role: nextMessage.role,
          createdAt: new Date().toISOString(),
          stageId: stageId || 0
        };
        
        // Add to message list
        queryClient.setQueryData(
          [`/api/stages/${stageId}/messages`], 
          (old: Message[] = []) => [...old, userMessage]
        );
        
        // Add a small delay to make it look realistic
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!isMounted.current) return;
        
        // Add agent response
        const agentMessage: Message = {
          id: `auto-agent-${Date.now()}`,
          content: simulatedResponse.content,
          role: simulatedResponse.role,
          createdAt: new Date().toISOString(),
          stageId: stageId || 0
        };
        
        // Add to message list
        queryClient.setQueryData(
          [`/api/stages/${stageId}/messages`], 
          (old: Message[] = []) => [...old, agentMessage]
        );
        
        // Set approval state if needed
        if (simulatedResponse.approvalNeeded) {
          setApprovalNeeded(true);
        }
        
        // Move to next message
        if (isMounted.current) {
          setAutoTestIndex(prev => prev + 1);
        }
      } finally {
        if (isMounted.current) {
          setIsAutoTesting(false);
        }
      }
    };
    
    // Run the test with a small delay to make it feel more natural
    const timer = setTimeout(() => {
      runTest();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [autoTestIndex, isAutoTesting, options?.autoTest, options?.testMessages, options?.testResponses, stageId]);

  // Determine if testing is complete
  const isTestingComplete = options?.autoTest && 
    options?.testMessages && 
    autoTestIndex >= (options.testMessages?.length || 0);

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
    // Auto testing properties
    isAutoTesting,
    autoTestIndex,
    isTestingComplete,
  };
}