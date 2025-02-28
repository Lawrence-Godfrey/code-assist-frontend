import { useState } from "react";
import { useStore } from "@/lib/store";
import { useChat } from "@/hooks/use-chat";
import { PipelineStage } from "@/components/pipeline-stage";
import { ChatInterface } from "@/components/chat-interface";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChatList } from "@/components/chat-list";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import type { PipelineStage as PipelineStageType } from "@/types/schema";

// Define default stages that match backend creation
const DEFAULT_STAGES: PipelineStageType[] = [
  { id: 1, name: "Requirements Gathering", description: "Clarify and document project requirements", status: "not_started" },
  { id: 2, name: "Technical Specification", description: "Convert requirements into technical specifications", status: "not_started" },
  { id: 3, name: "Implementation", description: "Generate and implement code changes", status: "not_started" },
  { id: 4, name: "Code Review", description: "Review and validate code changes", status: "not_started" }
];

export default function Home() {
  // App state from zustand store
  const selectedChatId = useStore.selectedChatId();
  const selectedStageId = useStore.selectedStageId();
  const pendingChat = useStore.pendingChat();
  const setSelectedStageId = useStore.setSelectedStageId();
  
  // Local UI state
  const [techSpecLoading, setTechSpecLoading] = useState(false);
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false);

  // Get chat and stages data using our custom hook
  const { stages, isLoading: stagesLoading } = useChat(selectedChatId);

  // Determine which stages to display based on app state
  const displayStages = pendingChat ? DEFAULT_STAGES : stages;
  const displaySelectedStageId = pendingChat ? 1 : selectedStageId; // Default to first stage in pending mode
  const displaySelectedStage = displayStages.find(stage => stage.id === displaySelectedStageId);
  
  // Handler for toggling the chat sidebar
  const toggleChatPanel = () => {
    setChatPanelCollapsed(!chatPanelCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat Sidebar */}
      <aside 
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 px-6 flex items-center border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold">Code Assistant</h1>
        </header>
        
        {/* Main content area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Pipeline Stages Panel */}
            <section className="col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 h-full">
                <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  {!selectedChatId && !pendingChat ? (
                    <div className="text-center p-4 text-gray-500">
                      Please select or create a chat first
                    </div>
                  ) : stagesLoading && !pendingChat ? (
                    <div className="text-center p-4">Loading stages...</div>
                  ) : displayStages.length === 0 ? (
                    <div className="text-center p-4 text-gray-500">
                      No stages found for this chat
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayStages.map((stage) => (
                        <PipelineStage
                          key={stage.id}
                          stage={stage}
                          isSelected={stage.id === displaySelectedStageId}
                          onClick={() => setSelectedStageId(stage.id)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </section>

            {/* Chat Interface Panel */}
            <section className="col-span-2">
              <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-12rem)] flex flex-col relative">
                {techSpecLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Building Technical Specification...
                    </div>
                  </div>
                )}
                
                {!selectedChatId && !pendingChat ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select or create a chat to begin
                  </div>
                ) : !displaySelectedStage ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a pipeline stage to view the conversation
                  </div>
                ) : (
                  <>
                    {displaySelectedStage.status === 'waitingForApproval' && (
                      <div className="p-4 border-b">
                        <ApprovalButtons stageId={displaySelectedStage.id} />
                      </div>
                    )}
                    <ChatInterface
                      stageId={displaySelectedStage.id}
                      stageName={displaySelectedStage.name}
                      onTechSpecLoading={setTechSpecLoading}
                      isPendingChat={pendingChat}
                    />
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}