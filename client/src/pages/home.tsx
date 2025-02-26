import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { PipelineStage } from "@/components/pipeline-stage";
import { ChatInterface } from "@/components/chat-interface";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PipelineStage as PipelineStageType } from "@shared/schema";
import { useState } from "react";
import { Loader2, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ChatList } from "@/components/chat-list";

export default function Home() {
  const { selectedChatId, selectedStageId, setSelectedChatId, setSelectedStageId } = useStore();
  const [techSpecLoading, setTechSpecLoading] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);

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
    <div className="flex h-screen bg-gray-50">
      {/* Chat Sidebar - flush with left edge */}
      <div 
        className={cn(
          "h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out relative flex flex-col z-10",
          chatPanelCollapsed ? "w-0" : "w-72"
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center h-16">
          <h1 className={cn(
            "text-xl font-semibold transition-opacity duration-200",
            chatPanelCollapsed ? "opacity-0" : "opacity-100"
          )}>Chats</h1>
        </div>
         
        <div className={cn(
          "flex-1 overflow-hidden transition-opacity duration-150",
          chatPanelCollapsed ? "opacity-0" : "opacity-100"
        )}>
          <ScrollArea className="h-full px-3 py-4">
            <ChatList />
          </ScrollArea>
        </div>
        
        {/* Toggle button */}
        <button 
          onClick={toggleChatPanel}
          className="absolute top-4 -right-4 bg-white rounded-full w-8 h-8 shadow-md flex items-center justify-center z-20 border border-gray-200"
          aria-label={chatPanelCollapsed ? "Expand chat panel" : "Collapse chat panel"}
        >
          {chatPanelCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 px-6 flex items-center border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold">Code Assistant</h1>
        </header>
        
        {/* Main grid area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Pipeline Stages */}
            <div className="col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 h-full">
                <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
                <ScrollArea className="h-[calc(100vh-12rem)]">
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