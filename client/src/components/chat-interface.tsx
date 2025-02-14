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
import { getWebSocketUrl } from "@/lib/websocket";


interface ChatInterfaceProps {
  stageId: number;
  stageName: string;
  onTechSpecLoading?: (isLoading: boolean) => void;
}

export function ChatInterface({ stageId, stageName, onTechSpecLoading }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
      stageId,
      role: "user"
    }
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/stages/${stageId}/messages`] as const,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (data: { content: string }) => {
      console.log("Sending message to server");
      
      // First, create and save the user message
      await apiRequest("POST", `/api/stages/${stageId}/messages`, {
        role: "user",
        content: data.content,
        stageId,
      });

      // Get updated messages including the newly saved message
      const allMessages = await apiRequest("GET", `/api/stages/${stageId}/messages`);
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

      console.log(JSON.stringify({
        prompt_model_name: "gpt-4",
        message_history: messageHistory.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
        })),
      }))

      console.log({
        prompt_model_name: "gpt-4",
        message_history: messageHistory.map((msg: Message) => ({
          role: msg.role,
          content: msg.content,
        })),
      });
      // print the raw response body
      const pipelineResult = await pipelineResponse.json();
      
      
      console.log("pipelineResult", pipelineResult);

      // Save the assistant's response
      await apiRequest("POST", `/api/stages/${stageId}/messages`, {
        role: pipelineResult.response.role,
        content: pipelineResult.response.content,
        stageId,
      });

      // Invalidate the messages query to trigger a refresh
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/stages/${stageId}/messages`] 
      });

      return pipelineResult.response;
    },
    onMutate: async (newMessage) => {
      console.log("onMutate called, adding pending response");
      setPendingAgentResponses(prev => {
        const newState = [...prev, Date.now()];
        console.log("New pending responses state:", newState);
        return newState;
      });
      
      // Optimistically update with user message
      await queryClient.cancelQueries({ queryKey: [`/api/stages/${stageId}/messages`] as const });
      
      const previousMessages = queryClient.getQueryData<Message[]>([`/api/stages/${stageId}/messages`] as const) || [];
      
      // For optimistic update, we only show the content - the real message will replace this on success
      queryClient.setQueryData([`/api/stages/${stageId}/messages`] as const, [
        ...previousMessages, 
        { content: newMessage.content, role: "user" } as Message
      ]);
      reset();
      
      return { previousMessages };
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: (error as Error).message,
        variant: "destructive",
      });
      setPendingAgentResponses([]);
      
      // Revert to previous messages on error
      queryClient.setQueryData(
        [`/api/stages/${stageId}/messages`],
        (old: Message[] | undefined) => old?.slice(0, -1) || []
      );
    },
    onSuccess: () => {
      // Clear pending responses when we get the agent's response
      setPendingAgentResponses([]);
    },
  });

  const [pendingAgentResponses, setPendingAgentResponses] = useState<number[]>([]);

  const stageIdRef = useRef(stageId);

  useEffect(() => {
    stageIdRef.current = stageId;
    const wsUrl = getWebSocketUrl('/ws');
    console.log("Connecting to WebSocket:", wsUrl);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected successfully");
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    socket.onmessage = (event) => {
      console.log("Raw WebSocket message:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed WebSocket data:", data);

        if (data.type === 'messages' && data.stageId === stageIdRef.current) {
          console.log("Processing messages for stage:", stageIdRef.current);
          
          // Check for thinking message first
          const hasThinkingMessage = data.messages.some((msg: { type?: string; content?: string }) => 
            msg.type === 'thinking' || 
            (msg.content && typeof msg.content === 'string' && 
             msg.content.includes("Building Technical Specification"))
          );

          if (hasThinkingMessage) {
            console.log("Found thinking message - setting loading to true");
            onTechSpecLoading?.(true);
            return; // Don't process further
          }

          // Only process regular messages if no thinking message
          const hasAgentResponse = data.messages.some((msg: { role?: string; type?: string }) => 
            msg.role === 'agent' && 
            msg.type !== 'thinking'
          );

          if (hasAgentResponse) {
            console.log("Found regular agent response - clearing loading state");
            onTechSpecLoading?.(false);
            setPendingAgentResponses(prev => prev.slice(1));
            setTimeout(() => textareaRef.current?.focus(), 100);
          }

          queryClient.invalidateQueries({ 
            queryKey: [`/api/stages/${stageIdRef.current}/messages`] 
          });
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      console.log("Cleaning up WebSocket connection");
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [stageId, onTechSpecLoading]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pendingAgentResponses.length]);

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
    if (!messages.length) return false;
    const lastMessage = messages[messages.length - 1];
    return (
      lastMessage.role === "agent" && 
      lastMessage.content.includes("please click the \"Approve\" button")
    );
  };

  console.log("Rendering with pending responses:", pendingAgentResponses);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{stageName}</h2>
        <p className="text-sm text-gray-600">Chat with the agent to refine the stage output</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center p-4">Loading conversation history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div ref={messageListRef}>
            {messages.map((message: Message) => (
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
            {pendingAgentResponses.map((id, index) => (
              <div key={id} className="flex items-center gap-3 p-4 animate-fade-in">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    {index === 0 ? "Agent is thinking..." : "Queueing response..."}
                  </span>
                </div>
              </div>
            ))}
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
            placeholder={pendingAgentResponses.length > 0 ? "Please wait for the agent to respond..." : "Type your message..."}
            className="flex-1"
            disabled={isPending || pendingAgentResponses.length > 0}
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