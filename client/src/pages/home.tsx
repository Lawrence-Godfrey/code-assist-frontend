import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { PipelineStage } from "@/components/pipeline-stage";
import { ChatInterface } from "@/components/chat-interface";
import { ApprovalButtons } from "@/components/approval-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PipelineStage as PipelineStageType } from "@shared/schema";

export default function Home() {
  const { selectedStageId, setSelectedStageId } = useStore();

  const { data: stages = [], isLoading } = useQuery<PipelineStageType[]>({
    queryKey: ["/api/stages"],
  });

  const selectedStage = stages.find(stage => stage.id === selectedStageId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">LLM Agent Pipeline</h1>

        <div className="grid grid-cols-12 gap-6">
          {/* Pipeline Stages */}
          <div className="col-span-4">
            <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              {isLoading ? (
                <div className="text-center p-4">Loading stages...</div>
              ) : (
                <div className="space-y-4 pr-4">
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

          {/* Chat Interface */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-sm h-[calc(100vh-12rem)] flex flex-col">
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