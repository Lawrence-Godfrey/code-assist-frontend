import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, MessageSquare } from "lucide-react";
import type { PipelineStage } from "@shared/schema";

interface PipelineStageProps {
  stage: PipelineStage;
  isSelected: boolean;
  onClick: () => void;
}

export function PipelineStage({ stage, isSelected, onClick }: PipelineStageProps) {
  const getStageDescription = (name: string) => {
    switch (name) {
      case "Requirements Gathering":
        return "Clarify and document project requirements";
      case "Technical Specification":
        return "Convert requirements into technical specifications";
      case "Implementation":
        return "Generate and implement code changes";
      case "Code Review":
        return "Review and validate code changes";
      default:
        return "";
    }
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4" />,
    inProgress: <MessageSquare className="h-4 w-4" />,
    complete: <Check className="h-4 w-4" />,
  };

  const statusColors = {
    pending: "bg-gray-400 hover:bg-gray-500",
    inProgress: "bg-blue-500 hover:bg-blue-600",
    complete: "bg-green-500 hover:bg-green-600",
  };

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
          <Badge 
            className={`${statusColors[stage.status as keyof typeof statusColors]} text-white`}
          >
            <div className="flex items-center gap-1">
              {statusIcons[stage.status as keyof typeof statusIcons]}
              <span className="capitalize">{stage.status}</span>
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-gray-600">{getStageDescription(stage.name)}</p>
        {stage.requirementsSummary && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
            <p className="font-medium text-gray-900">Summary:</p>
            <p className="text-gray-600">{stage.requirementsSummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}