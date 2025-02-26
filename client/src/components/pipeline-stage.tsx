import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, MessageSquare, Clock, AlertCircle } from "lucide-react";
import type { PipelineStage } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PipelineStageProps {
  stage: PipelineStage;
  isSelected: boolean;
  onClick: () => void;
}

export function PipelineStage({ stage, isSelected, onClick }: PipelineStageProps) {
  const statusIcons = {
    inProgress: <MessageSquare className="h-4 w-4" />,
    waitingForApproval: <Clock className="h-4 w-4" />,
    completed: <Check className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
  };

  const statusColors = {
    inProgress: "bg-blue-500",
    waitingForApproval: "bg-yellow-500",
    completed: "bg-green-500",
    error: "bg-red-500",
  };

  const getStatusText = (status: string) => {
    if (status === "waitingForApproval") return "Waiting for Approval";
    if (status === "not_started") return "";
    return status.replace(/([A-Z])/g, ' $1').trim(); // Add spaces before capital letters
  };

  // Don't show status badge for "not_started" stages
  const shouldShowStatus = stage.status && stage.status !== "not_started";

  return (
    <Card 
      className={`cursor-pointer transition-all border ${
        isSelected 
          ? 'bg-primary/5 shadow-md border-primary' 
          : 'hover:bg-gray-50 hover:shadow-sm border-transparent'
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>
            {stage.name}
          </h3>
          {shouldShowStatus && (
            <Badge 
              className={cn(
                "text-white",
                statusColors[stage.status as keyof typeof statusColors]
              )}
            >
              <div className="flex items-center gap-1">
                {statusIcons[stage.status as keyof typeof statusIcons]}
                <span>{getStatusText(stage.status)}</span>
              </div>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Use the description from the backend instead of hardcoding */}
        <p className="text-sm text-gray-600">{stage.description || "No description available"}</p>
      </CardContent>
    </Card>
  );
}