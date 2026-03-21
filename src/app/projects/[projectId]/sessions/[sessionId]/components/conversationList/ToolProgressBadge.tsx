import { LoaderIcon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";

type ToolProgressBadgeProps = {
  toolName: string;
  elapsedSeconds: number;
};

export const ToolProgressBadge: FC<ToolProgressBadgeProps> = ({
  toolName,
  elapsedSeconds,
}) => {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1.5 text-xs px-2 py-1 h-auto"
    >
      <LoaderIcon className="w-3 h-3 animate-spin flex-shrink-0" />
      <span className="font-medium">{toolName}</span>
      <span className="text-muted-foreground">{elapsedSeconds}s</span>
    </Badge>
  );
};
