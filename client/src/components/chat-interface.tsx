import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, type Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send } from "lucide-react";

interface ChatInterfaceProps {
  stageId: number;
}

export function ChatInterface({ stageId }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(insertMessageSchema),
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/stages", stageId, "messages"],
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/stages/${stageId}/messages`, {
        stageId,
        role: "user",
        content,
      });
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["/api/stages", stageId, "messages"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          messages.map((message: Message) => (
            <div
              key={message.id}
              className={`mb-4 p-3 rounded-lg max-w-[80%] ${
                message.role === "user"
                  ? "ml-auto bg-primary text-white"
                  : "bg-gray-100"
              }`}
            >
              {message.content}
            </div>
          ))
        )}
      </ScrollArea>

      <form
        onSubmit={handleSubmit((data) => sendMessage(data.content))}
        className="p-4 border-t"
      >
        <div className="flex gap-2">
          <Textarea
            {...register("content")}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" disabled={isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}