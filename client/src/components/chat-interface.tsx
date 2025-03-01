import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema } from "@/types/schema";
import { type Message } from "@/types/schema";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApprovalButtons } from "@/components/approval-buttons";
import { useStore } from "@/lib/store";
import { usePipeline } from "@/hooks/use-pipeline";
import { queryClient } from "@/lib/queryClient";
import { chatService, pipelineService } from "@/services";

interface ChatInterfaceProps {
  stageId: number;
  stageName: string;
  isPendingChat?: boolean;
  onTechSpecLoading?: (isLoading: boolean) => void;
}

export function ChatInterface({ stageId, stageName, isPendingChat = false, onTechSpecLoading }: ChatInterfaceProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Get global state from store using our improved selectors
  const setSelectedChatId = useStore.setSelectedChatId();
  const setSelectedStageId = useStore.setSelectedStageId();
  const setPendingChat = useStore.setPendingChat();
  
  // Form handling
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      stageId,
      role: "user"
    }
  });

  // Local UI state
  const [pendingAgentResponses, setPendingAgentResponses] = useState<number[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<Partial<Message> | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Use our custom hook to get messages (only if not in pending chat mode)
  const { 
    messages = [], 
    isLoading,
    sendMessage: pipelineSendMessage, 
    isSending: pipelineIsSending 
  } = usePipeline(isPendingChat ? null : stageId);
  
  // Combined loading state
  const isPending = pipelineIsSending || isCreatingChat;
  
  // Function to determine if approval buttons should be shown
  const shouldShowApprovalButtons = () => {
    return approvalNeeded && !isPendingChat && !isPending;
  };

  // Function to create a new chat 
  const createNewChat = async () => {
    try {
      return await chatService.createChat({
        description: null,
        create_default_stages: true
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      throw new Error("Failed to create chat");
    }
  };

  // Handle sending a message
  const handleSendMessage = async (data: { content: string }) => {
    if (!data.content.trim()) return;
    
    try {
      console.log("Sending message:", data.content);
      
      // Add the user message to local state for pending chats
      if (isPendingChat) {
        setPendingUserMessage({
          id: `pending-${Date.now()}`,
          content: data.content,
          role: "user",
          createdAt: new Date().toISOString(),
        });
        
        // Show pending response indicator
        setPendingAgentResponses(prev => [...prev, Date.now()]);
        
        // Reset approval state
        setApprovalNeeded(false);
        
        // Create new chat if in pending mode
        setIsCreatingChat(true);
        const newChat = await createNewChat();
        const chatId = newChat.id;
        
        // Update store state
        setSelectedChatId(chatId);
        
        // Get the first stage ID
        let actualStageId = stageId;
        if (newChat.stages && newChat.stages.length > 0) {
          actualStageId = newChat.stages[0].id;
          setSelectedStageId(actualStageId);
        }
        
        // Process the message
        const newMessageContent = data.content;
        
        // Send user message
        await pipelineService.sendMessage(actualStageId, {
          role: "user",
          content: newMessageContent
        });
        
        // Get message history
        const messageHistory = await pipelineService.getStageMessages(actualStageId);
        
        // Process through pipeline - use requirements gathering endpoint for initial messages
        const response = await pipelineService.processRequirementsGathering({
          prompt_model_name: "gpt-4",
          message_history: messageHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          stage_id: actualStageId
        });
        
        // Save agent response
        await pipelineService.sendMessage(actualStageId, {
          role: response.response.role,
          content: response.response.content
        });
        
        // Update state
        setApprovalNeeded(!!response.approval_needed);
        setPendingChat(false);
        setPendingUserMessage(null);
        setPendingAgentResponses([]);
        setIsCreatingChat(false);
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/stages/${actualStageId}/messages`] });
        queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      } else {
        // For existing chats, add the user message to the local UI immediately
        setPendingUserMessage({
          id: `pending-${Date.now()}`,
          content: data.content,
          role: "user",
          createdAt: new Date().toISOString(),
        });
        
        // Use our pipeline hook to send the message
        pipelineSendMessage({ content: data.content });
        
        // Show pending response
        setPendingAgentResponses(prev => [...prev, Date.now()]);
      }
      
      // Reset form
      reset();
      
    } catch (error) {
      setIsCreatingChat(false);
      setPendingAgentResponses([]);
      setPendingUserMessage(null);
      
      toast({
        title: "Error sending message",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Clear pending user message and check for approval needed when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Clear pending user message if it exists
      if (pendingUserMessage) {
        setPendingUserMessage(null);
        setPendingAgentResponses([]);
      }
      
      // Check for approval needed in the latest message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content.includes('[APPROVAL_NEEDED]')) {
        setApprovalNeeded(true);
      }
    }
  }, [messages.length, pendingUserMessage]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pendingAgentResponses.length, isPendingChat]);

  // Form submission handler
  const onSubmit = handleSubmit(handleSendMessage);

  // Handle Enter key for submitting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // For pending chats, always start with empty messages
  const baseMessages = isPendingChat ? [] : messages;
  
  // Include pending user message if it exists
  const displayMessages = pendingUserMessage 
    ? [...baseMessages, pendingUserMessage as Message]
    : baseMessages;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{stageName}</h2>
        <p className="text-sm text-gray-600">
          {isPendingChat 
            ? "Send a message to start this conversation" 
            : "Chat with the agent to refine the stage output"}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading && !isPendingChat ? (
          <div className="text-center p-4">Loading conversation history...</div>
        ) : displayMessages.length === 0 && pendingAgentResponses.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            {isPendingChat 
              ? "Type a message below to start a new conversation"
              : "No messages yet. Start the conversation!"}
          </div>
        ) : (
          <div ref={messageListRef}>
            {displayMessages.map((message: Message) => (
              <div 
                key={message.id}
                className={cn(
                  "flex gap-3 p-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "agent" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {pendingAgentResponses.length > 0 && (
              <div key={pendingAgentResponses[0]} className="flex items-center gap-3 p-4 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Agent is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="p-4 border-t"
      >
        <div className="flex gap-2">
          <Textarea
            {...register("content")}
            ref={register("content").ref}
            placeholder={isPending ? "Please wait..." : "Type your message..."}
            className="flex-1"
            disabled={isPending}
            onKeyDown={handleKeyDown}
          />
          <Button type="submit" disabled={isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {errors.content && (
          <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>
        )}
      </form>

      {shouldShowApprovalButtons() && (
        <div className="p-4 border-t">
          <ApprovalButtons 
            stageId={stageId} 
            onTechSpecLoading={onTechSpecLoading}
            getStageMessages={async () => {
              // Get all messages from the current stage
              const stageMessages = await pipelineService.getStageMessages(stageId);
              // Format them for the pipeline API
              return stageMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
              }));
            }}
          />
        </div>
      )}
    </div>
  );
}