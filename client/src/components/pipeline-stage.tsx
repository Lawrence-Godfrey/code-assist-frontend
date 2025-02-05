import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle } from "lucide-react";
import type { PipelineStage } from "@shared/schema";

interface PipelineStageProps {
  stage: PipelineStage;
  isSelected: boolean;
  onClick: () => void;
}

export function PipelineStage({ stage, isSelected, onClick }: PipelineStageProps) {
  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    inProgress: <AlertCircle className="h-4 w-4" />,
    complete: <Check className="h-4 w-4" />,
  };

  const statusColors = {
    pending: "bg-gray-500",
    inProgress: "bg-blue-500",
    complete: "bg-green-500",
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{stage.name}</h3>
          <Badge className={statusColors[stage.status as keyof typeof statusColors]}>
            <div className="flex items-center gap-1">
              {statusIcons[stage.status as keyof typeof statusIcons]}
              {stage.status}
            </div>
          </Badge>
        </div>
      </CardHeader>
      {stage.requirementsSummary && (
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-gray-600">{stage.requirementsSummary}</p>
        </CardContent>
      )}
    </Card>
  );
}
