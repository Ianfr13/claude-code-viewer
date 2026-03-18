import { Brain } from "lucide-react";
import type { FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Returns the context window size in tokens for a given model.
 * - Claude Opus 4.x and Claude Sonnet 4.x: 1,048,576 (1M)
 * - All other models: 200,000
 */
function getContextWindowSize(modelName: string | undefined): number {
  if (!modelName) return 200_000;
  if (/claude-(opus|sonnet)-4/i.test(modelName)) return 1_048_576;
  return 200_000;
}

type ContextUsageProps = {
  inputTokens: number;
  outputTokens: number;
  modelName: string | undefined;
};

export const ContextUsage: FC<ContextUsageProps> = ({
  inputTokens,
  outputTokens,
  modelName,
}) => {
  const maxTokens = getContextWindowSize(modelName);
  const percentage = Math.min((inputTokens / maxTokens) * 100, 100);

  const barColor =
    percentage >= 80
      ? "bg-red-500"
      : percentage >= 50
        ? "bg-yellow-500"
        : "bg-green-500";

  const textColor =
    percentage >= 80
      ? "text-red-500"
      : percentage >= 50
        ? "text-yellow-500"
        : "text-green-500";

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 mt-1 px-2 cursor-default select-none w-fit">
          <Brain className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono ${textColor}`}>
              {formatTokens(inputTokens)}/{formatTokens(maxTokens)}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1">
        <p className="font-semibold">Context window</p>
        <p>
          Input: {inputTokens.toLocaleString()} tokens ({percentage.toFixed(1)}
          %)
        </p>
        <p>Output: {outputTokens.toLocaleString()} tokens</p>
        <p className="text-muted-foreground">
          Max: {maxTokens.toLocaleString()} tokens
          {modelName ? ` (${modelName})` : ""}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
