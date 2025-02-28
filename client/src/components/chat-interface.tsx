import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, type Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApprovalButtons } from "@/components/approval-buttons";
import { useStore } from "@/lib/store";

interface ChatInterfaceProps {
  stageId: number;
  stageName: string;
  isPendingChat?: boolean;
  onTechSpecLoading?: (isLoading: boolean) => void;
}

export function ChatInterface({ stageId, stageName, isPendingChat = false, onTechSpecLoading }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { setSelectedChatId, setSelectedStageId, setPendingChat } = useStore();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      stageId,
      role: "user"
    }
  });

  // Only fetch messages if not in pending chat mode
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/stages/${stageId}/messages`] as const,
    enabled: !isPendingChat && stageId > 0, // Do not fetch messages for pending chats
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pendingAgentResponses, setPendingAgentResponses] = useState<number[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<Partial<Message> | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  // Function to create a new chat directly (not using React Query's mutate)
  const createNewChat = async () => {
    const response = await apiRequest("POST", "/api/chats", {
      description: null,
      create_default_stages: true
    });
    return await response.json();
  };

  // Mutation for sending messages
  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: async (data: { content: string, chatId?: number }) => {
      console.log("Sending message to server");
      
      let chatId = data.chatId;
      let actualStageId = stageId;
      
      // If this is a pending chat, create the chat first
      if (isPendingChat) {
        try {
          setIsCreatingChat(true);
          // Create new chat directly
          const newChat = await createNewChat();
          chatId = newChat.id;
          
          // Set the selected chat ID
          setSelectedChatId(chatId);
          
          // Log that chat was created but DON'T update pending state yet
          console.log("Chat created");
          
          // Get the first stage ID from the new chat
          if (newChat.stages && newChat.stages.length > 0) {
            actualStageId = newChat.stages[0].id;
            setSelectedStageId(actualStageId);
          }
          
          // Invalidate chat list query to refresh it
          queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
          setIsCreatingChat(false);
        } catch (error) {
          setIsCreatingChat(false);
          console.error("Error creating chat:", error);
          throw new Error("Failed to create chat");
        }
      }
      
      // Now save the user message to the appropriate stage
      await apiRequest("POST", `/api/stages/${actualStageId}/messages`, {
        role: "user",
        content: data.content,
      });

      // Get updated messages including the newly saved message
      const allMessages = await apiRequest("GET", `/api/stages/${actualStageId}/messages`);
      const messageHistory = await allMessages.json();

      console.log("messageHistory", messageHistory);

      // Send to pipeline with message history
      const pipelineResponse = await apiRequest("POST", "/api/pipeline", {
        prompt_model_name: "gpt-4",
        message_history: messageHistory.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      // Print the raw response body
      const pipelineResult = await pipelineResponse.json();
      
      console.log("pipelineResult", pipelineResult);

      // Save the received message to the db
      await apiRequest("POST", `/api/stages/${actualStageId}/messages`, {
        role: pipelineResult.response.role,
        content: pipelineResult.response.content,
        stageId: actualStageId,
      });

      // Update approval needed state
      setApprovalNeeded(!!pipelineResult.approval_needed);

      // Invalidate the messages query to trigger a refresh
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/stages/${actualStageId}/messages`] 
      });

      return { response: pipelineResult.response, actualStageId };
    },

    onMutate: async (newMessage) => {
      console.log("onMutate called, adding pending response");
      
      // Add the user message immediately to local state if in pending chat mode
      if (isPendingChat) {
        setPendingUserMessage({
          id: `pending-${Date.now()}`,
          content: newMessage.content,
          role: "user",
          createdAt: new Date().toISOString(),
        });
      }
      
      // Add pending agent response indicator
      setPendingAgentResponses(prev => {
        const newState = [...prev, Date.now()];
        console.log(`Adding pending response. Old count: ${prev.length}, New count: ${newState.length}`);
        return newState;
      });
      
      // Reset approval state when sending new message
      setApprovalNeeded(false);

      if (!isPendingChat) {
        // Optimistically update with user message (only for existing chats)
        await queryClient.cancelQueries({ queryKey: [`/api/stages/${stageId}/messages`] as const });
        
        const previousMessages = queryClient.getQueryData<Message[]>([`/api/stages/${stageId}/messages`] as const) || [];
        
        // For optimistic update, we only show the content - the real message will replace this on success
        queryClient.setQueryData([`/api/stages/${stageId}/messages`] as const, [
          ...previousMessages, 
          { content: newMessage.content, role: "user" } as Message
        ]);
      }
      
      reset();
      
      return { previousMessages: isPendingChat ? [] : queryClient.getQueryData([`/api/stages/${stageId}/messages`]) };
    },

    onError: (error, _variables, context) => {
      toast({
        title: "Error sending message",
        description: (error as Error).message,
        variant: "destructive",
      });
      console.log(`Error sending message: ${error}`);
      setPendingAgentResponses([]);
      setPendingUserMessage(null);
      setApprovalNeeded(false);
      
      // Revert to previous messages on error
      if (!isPendingChat && context?.previousMessages) {
        queryClient.setQueryData(
          [`/api/stages/${stageId}/messages`],
          context.previousMessages
        );
      }
    },

    onSuccess: (result) => {
      console.log("Message sent successfully");
      
      // If the stage ID changed (due to new chat creation), update queries
      if (result.actualStageId !== stageId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/stages/${result.actualStageId}/messages`] 
        });
      }
      
      // Update pending chat state here after everything is complete
      if (isPendingChat) {
        setPendingChat(false);
      }
      
      // Clear pending user message and responses after successful response
      setPendingUserMessage(null);
      setPendingAgentResponses([]);
    },
  });

  const stageIdRef = useRef(stageId);

  useEffect(() => {
    stageIdRef.current = stageId;
  }, [stageId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    console.log(`Messages changed: ${messages.length}, Pending responses: ${pendingAgentResponses.length}, isPendingChat: ${isPendingChat}`);
    if (messageListRef.current) {
      messageListRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pendingAgentResponses.length, isPendingChat]);

  const onSubmit = handleSubmit((data) => {
    if (data.content.trim()) {
      console.log("Sending message:", data);
      sendMessage(data);
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const shouldShowApprovalButtons = () => {
    return approvalNeeded;
  };

  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const isPending = isSendingMessage || isCreatingChat;

  // For pending chats, start with an empty array until we have messages
  // but still ensure we show any messages that appear after a pending chat becomes active
  // We need to combine real messages with any pending user message
  const baseMessages = isPendingChat && messages.length === 0 ? [] : messages;
  
  // Create a combined messages array that includes the pending user message if it exists
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
                    {isPendingChat && isCreatingChat ? "Creating chat and processing response..." : "Agent is thinking..."}
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
          />
        </div>
      )}
    </div>
  );
}