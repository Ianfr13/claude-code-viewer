/**
 * Tool style configuration — colors and icons per tool category.
 * Used to visually differentiate tool calls in the conversation view.
 */

export type ToolCategory =
  | "read"
  | "write"
  | "bash"
  | "agent"
  | "web"
  | "mcp"
  | "default";

export type ToolStyle = {
  category: ToolCategory;
  /** Tailwind border color class */
  border: string;
  /** Tailwind background color class */
  bg: string;
  /** Tailwind hover background class */
  hoverBg: string;
  /** Tailwind icon color class */
  iconColor: string;
  /** Tailwind text color class (for label) */
  textColor: string;
  /** Tailwind separator border class */
  separatorBorder: string;
  /** Tailwind inner border class (for tool_id / params sections) */
  innerBorder: string;
};

const STYLES: Record<ToolCategory, ToolStyle> = {
  read: {
    category: "read",
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    hoverBg: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-700 dark:text-emerald-300",
    separatorBorder: "border-emerald-200 dark:border-emerald-800",
    innerBorder: "border-emerald-200 dark:border-emerald-800",
  },
  write: {
    category: "write",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    hoverBg: "hover:bg-amber-100/50 dark:hover:bg-amber-900/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    textColor: "text-amber-700 dark:text-amber-300",
    separatorBorder: "border-amber-200 dark:border-amber-800",
    innerBorder: "border-amber-200 dark:border-amber-800",
  },
  bash: {
    category: "bash",
    border: "border-rose-200 dark:border-rose-800",
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    hoverBg: "hover:bg-rose-100/50 dark:hover:bg-rose-900/20",
    iconColor: "text-rose-600 dark:text-rose-400",
    textColor: "text-rose-700 dark:text-rose-300",
    separatorBorder: "border-rose-200 dark:border-rose-800",
    innerBorder: "border-rose-200 dark:border-rose-800",
  },
  agent: {
    category: "agent",
    border: "border-purple-200 dark:border-purple-800",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    hoverBg: "hover:bg-purple-100/50 dark:hover:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    textColor: "text-purple-700 dark:text-purple-300",
    separatorBorder: "border-purple-200 dark:border-purple-800",
    innerBorder: "border-purple-200 dark:border-purple-800",
  },
  web: {
    category: "web",
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50/50 dark:bg-sky-950/20",
    hoverBg: "hover:bg-sky-100/50 dark:hover:bg-sky-900/20",
    iconColor: "text-sky-600 dark:text-sky-400",
    textColor: "text-sky-700 dark:text-sky-300",
    separatorBorder: "border-sky-200 dark:border-sky-800",
    innerBorder: "border-sky-200 dark:border-sky-800",
  },
  mcp: {
    category: "mcp",
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
    hoverBg: "hover:bg-violet-100/50 dark:hover:bg-violet-900/20",
    iconColor: "text-violet-600 dark:text-violet-400",
    textColor: "text-violet-700 dark:text-violet-300",
    separatorBorder: "border-violet-200 dark:border-violet-800",
    innerBorder: "border-violet-200 dark:border-violet-800",
  },
  default: {
    category: "default",
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    hoverBg: "hover:bg-blue-100/50 dark:hover:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-700 dark:text-blue-300",
    separatorBorder: "border-blue-200 dark:border-blue-800",
    innerBorder: "border-blue-200 dark:border-blue-800",
  },
};

/** Tools that read/navigate the filesystem or search */
const READ_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "LS",
  "ListFiles",
  "ReadFile",
  "SearchFiles",
]);

/** Tools that write or modify files */
const WRITE_TOOLS = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "WriteFile",
  "CreateFile",
]);

/** Shell/process execution */
const BASH_TOOLS = new Set(["Bash", "Execute", "RunCommand", "Shell"]);

/** Sub-agents, background tasks, or agent orchestration */
const AGENT_TOOLS = new Set([
  "Task",
  "Agent",
  "TodoWrite",
  "TodoRead",
  "SendMessage",
  "TaskCreate",
  "TaskUpdate",
  "TaskGet",
  "TaskList",
  "TaskOutput",
  "TaskStop",
]);

/** Web browsing or HTTP requests */
const WEB_TOOLS = new Set([
  "WebFetch",
  "WebSearch",
  "BrowserAction",
  "Browse",
  "Fetch",
]);

export const getToolStyle = (toolName: string): ToolStyle => {
  if (toolName.startsWith("mcp__")) return STYLES.mcp;
  if (READ_TOOLS.has(toolName)) return STYLES.read;
  if (WRITE_TOOLS.has(toolName)) return STYLES.write;
  if (BASH_TOOLS.has(toolName)) return STYLES.bash;
  if (AGENT_TOOLS.has(toolName)) return STYLES.agent;
  if (WEB_TOOLS.has(toolName)) return STYLES.web;
  return STYLES.default;
};

export const getCategoryLabel = (category: ToolCategory): string => {
  switch (category) {
    case "read":
      return "Read";
    case "write":
      return "Write";
    case "bash":
      return "Shell";
    case "agent":
      return "Agent";
    case "web":
      return "Web";
    case "mcp":
      return "MCP";
    default:
      return "Tool";
  }
};
