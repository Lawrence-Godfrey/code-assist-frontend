import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, type Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  stageId: number;
  stageName: string;
}

export function ChatInterface({ stageId, stageName }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
    queryKey: [`/api/stages/${stageId}/messages`],
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (data: { content: string }) => {
      const response = await apiRequest("POST", `/api/stages/${stageId}/messages`, {
        stageId,
        role: "user",
        content: data.content,
      });
      const messages = await response.json() as Message[];
      console.log("Received messages from server:", messages);
      return messages;
    },
    onSuccess: (newMessages) => {
      console.log("Mutation succeeded, new messages:", newMessages);
      reset();
      queryClient.invalidateQueries({ queryKey: [`/api/stages/${stageId}/messages`] });
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'messages' && data.stageId === stageId) {
        queryClient.invalidateQueries({ queryKey: [`/api/stages/${stageId}/messages`] });
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [stageId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">{stageName}</h2>
        <p className="text-sm text-gray-600">Chat with the agent to refine the stage output</p>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center p-4">Loading conversation history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message: Message) => (
            <div
              key={message.id}
              className={`mb-4 flex gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "agent" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div
                className={`p-3 rounded-lg max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-gray-100"
                }`}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))
        )}
      </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="p-4 border-t"
      >
        <div className="flex gap-2">
          <Textarea
            {...register("content")}
            placeholder="Type your message..."
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
    </div>
  );
}