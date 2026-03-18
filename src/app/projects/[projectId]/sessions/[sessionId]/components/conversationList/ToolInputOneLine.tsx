import type { FC } from "react";

/**
 * Priority-ordered keys to use as the "main" value shown inline.
 * We extract just the basename/last segment to keep it compact.
 */
const PRIORITY_KEYS = [
  "file_path",
  "path",
  "command",
  "url",
  "query",
  "pattern",
  "prompt",
  "description",
];

const basename = (value: string): string => {
  const parts = value.replace(/\\/g, "/").split("/");
  return parts.at(-1) ?? value;
};

const truncate = (value: string, max = 40): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

export const ToolInputOneLine: FC<{
  input: Record<string, unknown>;
}> = ({ input }) => {
  const entries = Object.entries(input);
  if (entries.length === 0) return null;

  // Find the best key to display
  let bestKey: string | undefined;
  let bestValue: string | undefined;

  for (const key of PRIORITY_KEYS) {
    const val = input[key];
    if (typeof val === "string" && val.trim()) {
      bestKey = key;
      bestValue = val;
      break;
    }
  }

  // Fall back to first string entry
  if (bestValue === undefined) {
    for (const [key, val] of entries) {
      if (typeof val === "string" && val.trim()) {
        bestKey = key;
        bestValue = val;
        break;
      }
    }
  }

  if (!bestValue || !bestKey) return null;

  // For paths/files show just the basename; for commands show first word
  const display =
    bestKey === "file_path" || bestKey === "path"
      ? basename(bestValue)
      : bestKey === "command"
        ? truncate(bestValue.trim().split(/\s+/)[0] ?? bestValue)
        : truncate(bestValue);

  return <span>{display}</span>;
};
