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
import { Loader2, MessageSquarePlus } from "lucide-react";

export default function Home() {
  const { selectedStageId, setSelectedStageId } = useStore();
  const [techSpecLoading, setTechSpecLoading] = useState(false);

  const { data: stages = [], isLoading } = useQuery<PipelineStageType[]>({
    queryKey: ["/api/stages"],
  });

  const selectedStage = stages.find(stage => stage.id === selectedStageId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Code Assistant</h1>
          <Button className="flex items-center gap-2" onClick={() => {}}>
            <MessageSquarePlus className="w-4 h-4" />
            New Chat
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
                {isLoading ? (
                  <div className="text-center p-4">Loading stages...</div>
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
              
              {selectedStage ? (
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
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a pipeline stage to view the conversation
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}