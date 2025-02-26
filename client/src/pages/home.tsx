import { useQuery, useMutation } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { PipelineStage } from "@/components/pipeline-stage";
import { ChatInterface } from "@/components/chat-interface";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatList } from "@/components/chat-list";
import type { PipelineStage as PipelineStageType } from "@shared/schema";
import { useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Function to create a new chat
const createChat = async () => {
  const response = await apiRequest('POST', '/api/chats', {
    description: null,
    create_default_stages: true
  });
  return await response.json();
};

export default function Home() {
  const { selectedChatId, selectedStageId, setSelectedChatId, setSelectedStageId } = useStore();
  const [techSpecLoading, setTechSpecLoading] = useState(false);
  const { toast } = useToast();

  // Fetch stages for the selected chat
  const { 
    data: stages = [], 
    isLoading: stagesLoading 
  } = useQuery<PipelineStageType[]>({
    queryKey: ["/api/chats", selectedChatId, "stages"],
    queryFn: async () => {
      if (!selectedChatId) return [];
      const response = await apiRequest('GET', `/api/chats/${selectedChatId}/stages`);
      return await response.json();
    },
    enabled: !!selectedChatId, // Only run this query if we have a selected chat
  });

  const selectedStage = stages.find(stage => stage.id === selectedStageId);
  
  const mutation = useMutation({
    mutationFn: createChat,
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      
      // Set the selected chat
      setSelectedChatId(newChat.id);
      
      // Navigate to the new chat by selecting the first stage
      if (newChat.stages && newChat.stages.length > 0) {
        setSelectedStageId(newChat.stages[0].id);
      }
      
      toast({
        title: "Chat created",
        description: "Your new conversation is ready",
      });
    },
    onError: (error) => {
      console.error('Error creating chat:', error);
      toast({
        title: "Error creating chat",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Code Assistant</h1>
          <Button 
            className="flex items-center gap-2" 
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-4 h-4" />
            )}
            {mutation.isPending ? 'Creating...' : 'New Chat'}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Chat List Sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-semibold mb-4">Chats</h2>
              <ChatList />
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
              <ScrollArea className="h-[calc(100vh-16rem)]">
                {!selectedChatId ? (
                  <div className="text-center p-4 text-gray-500">
                    Please select or create a chat first
                  </div>
                ) : stagesLoading ? (
                  <div className="text-center p-4">Loading stages...</div>
                ) : stages.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No stages found for this chat
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stages.map((stage: PipelineStageType) => (
                      <PipelineStage
                        key={stage.id}
                        stage={stage}
                        isSelected={stage.id === selectedStageId}
                        onClick={() => setSelectedStageId(stage.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-12rem)] flex flex-col relative">
              {techSpecLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building Technical Specification...
                  </div>
                </div>
              )}
              
              {!selectedChatId ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select or create a chat to begin
                </div>
              ) : !selectedStage ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a pipeline stage to view the conversation
                </div>
              ) : (
                <>
                  {selectedStage.status === 'waitingForApproval' && (
                    <div className="p-4 border-b">
                      <ApprovalButtons stageId={selectedStage.id} />
                    </div>
                  )}
                  <ChatInterface
                    stageId={selectedStage.id}
                    stageName={selectedStage.name}
                    onTechSpecLoading={setTechSpecLoading}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}