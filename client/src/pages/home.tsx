import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { PipelineStage } from "@/components/pipeline-stage";
import { ChatInterface } from "@/components/chat-interface";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatList } from "@/components/chat-list";
import type { PipelineStage as PipelineStageType } from "@shared/schema";
import { useState } from "react";
import { Loader2, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Home() {
  const { selectedChatId, selectedStageId, setSelectedChatId, setSelectedStageId } = useStore();
  const [techSpecLoading, setTechSpecLoading] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);
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
  
  const toggleChatPanel = () => {
    setChatPanelCollapsed(!chatPanelCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Code Assistant</h1>
        </div>

        <div className="flex">
          {/* Chat List Sidebar - Collapsible */}
          <div className={cn(
            "transition-all duration-300 ease-in-out relative",
            chatPanelCollapsed ? "w-12" : "w-64 mr-6"
          )}>
            <div className="bg-white rounded-lg shadow-sm p-4 h-[calc(100vh-10rem)]">
              {!chatPanelCollapsed && (
                <h2 className="text-xl font-semibold mb-4">Chats</h2>
              )}
              
              <div className={cn(chatPanelCollapsed ? "opacity-0 invisible" : "opacity-100 visible")}>
                <ChatList />
              </div>
              
              {chatPanelCollapsed && (
                <div className="flex flex-col items-center space-y-4 mt-2">
                  <MessageSquare className="w-6 h-6 text-gray-500" />
                </div>
              )}
            </div>
            
            {/* Toggle button */}
            <button 
              onClick={toggleChatPanel}
              className="absolute top-4 -right-4 bg-white rounded-full w-8 h-8 shadow-md flex items-center justify-center z-10 border border-gray-200"
            >
              {chatPanelCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 grid grid-cols-3 gap-6">
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
    </div>
  );
}