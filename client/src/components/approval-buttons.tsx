import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";

interface ApprovalButtonsProps {
  stageId: number;
  onTechSpecLoading?: (isLoading: boolean) => void;
}

export function ApprovalButtons({ stageId, onTechSpecLoading }: ApprovalButtonsProps) {
  const { toast } = useToast();
  const { setSelectedStageId } = useStore();

  const { mutate: updateStage, isPending } = useMutation({
    mutationFn: async (approved: boolean) => {
      return apiRequest("PATCH", `/api/stages/${stageId}`, {
        status: approved ? "complete" : "inProgress",
        isComplete: approved,
      });
    },
    onSuccess: (_, approved) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      
      if (approved && stageId === 1) {
        // Moving from Requirements to Technical Specification
        const nextStageId = stageId + 1;
        setSelectedStageId(nextStageId);
        onTechSpecLoading?.(true);
      }
      
      toast({
        title: approved ? "Stage Approved" : "Changes Requested",
        description: approved
          ? "Moving to the next stage"
          : "The agent will address your concerns",
      });
    },
  });

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
