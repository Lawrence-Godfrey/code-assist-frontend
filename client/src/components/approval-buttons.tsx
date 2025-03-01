import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/services/api";
import { pipelineService } from "@/services/pipeline-service";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useState } from "react";

interface ApprovalButtonsProps {
  stageId: number;
  onTechSpecLoading?: (isLoading: boolean) => void;
  // Function to get messages from the current stage
  getStageMessages: () => Promise<{ role: string, content: string }[]>;
}

export function ApprovalButtons({ stageId, onTechSpecLoading, getStageMessages }: ApprovalButtonsProps) {
  const { toast } = useToast();
  const { setSelectedStageId } = useStore();
  const [isGeneratingTechSpec, setIsGeneratingTechSpec] = useState(false);

  const { mutate: updateStage, isPending: isUpdatingStage } = useMutation({
    mutationFn: async (approved: boolean) => {
      return api.patch(`/api/stages/${stageId}`, {
        status: approved ? "completed" : "in_progress",
      });
    },
    onSuccess: async (_, approved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      
      if (approved && stageId === 1) {
        // Moving from Requirements to Technical Specification
        const nextStageId = stageId + 1;
        setSelectedStageId(nextStageId);
        
        // Signal that we're starting to generate the tech spec
        onTechSpecLoading?.(true);
        setIsGeneratingTechSpec(true);
        
        try {
          // Get all messages from the requirements stage
          const messages = await getStageMessages();
          
          // Process through tech spec generator pipeline
          const response = await pipelineService.processTechSpecGenerator({
            prompt_model_name: "gpt-4",
            message_history: messages,
            stage_id: nextStageId,
          });
          
          // Save the tech spec generator's initial response to the next stage
          await pipelineService.sendMessage(nextStageId, {
            role: response.response.role,
            content: response.response.content,
          });
          
          // Refresh messages for the next stage
          queryClient.invalidateQueries({ queryKey: [`/api/stages/${nextStageId}/messages`] });
        } catch (error) {
          console.error("Error generating tech spec:", error);
          toast({
            title: "Error",
            description: "Failed to generate technical specification",
            variant: "destructive",
          });
        } finally {
          // Signal that we're done loading
          onTechSpecLoading?.(false);
          setIsGeneratingTechSpec(false);
        }
      }
      
      toast({
        title: approved ? "Stage Approved" : "Changes Requested",
        description: approved
          ? "Moving to the next stage"
          : "The agent will address your concerns",
      });
    },
  });

  const isPending = isUpdatingStage || isGeneratingTechSpec;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => updateStage(false)}
        disabled={isPending}
      >
        <ThumbsDown className="h-4 w-4 mr-2" />
        Request Changes
      </Button>
      <Button
        onClick={() => updateStage(true)}
        disabled={isPending}
      >
        <ThumbsUp className="h-4 w-4 mr-2" />
        Approve
      </Button>
    </div>
  );
}
