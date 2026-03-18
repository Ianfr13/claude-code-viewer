import { Trans, useLingui } from "@lingui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  RefreshCwIcon,
  SlashIcon,
  SparklesIcon,
} from "lucide-react";
import type { FC } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { claudeCommandsQuery } from "@/lib/api/queries";
import { Loading } from "../../../../../../../components/Loading";

type CommandInfo = {
  name: string;
  description: string | null;
  argumentHint: string | null;
};

const CommandItem: FC<{ cmd: CommandInfo; prefix: string }> = ({
  cmd,
  prefix,
}) => (
  <div className="px-3 py-2 rounded-md bg-sidebar-accent/50 border border-sidebar-border hover:bg-sidebar-accent transition-colors">
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-muted-foreground text-xs flex-shrink-0">
        {prefix}
      </span>
      <span className="text-sm font-mono font-medium text-sidebar-foreground truncate">
        {cmd.name}
      </span>
      {cmd.argumentHint && (
        <span className="text-xs text-muted-foreground font-mono truncate">
          {cmd.argumentHint}
        </span>
      )}
    </div>
    {cmd.description && (
      <p className="text-xs text-muted-foreground mt-0.5 pl-4 truncate">
        {cmd.description}
      </p>
    )}
  </div>
);

const Section: FC<{
  title: string;
  icon: FC<{ className?: string }>;
  items: CommandInfo[];
  prefix: string;
  defaultOpen?: boolean;
}> = ({ title, icon: Icon, items, prefix, defaultOpen = true }) => {
  if (items.length === 0) return null;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-1 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {title}
          <span className="text-[10px] font-normal normal-case tracking-normal bg-muted px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1.5 mt-1 mb-3">
          {items.map((cmd) => (
            <CommandItem key={cmd.name} cmd={cmd} prefix={prefix} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const CliTab: FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { i18n } = useLingui();

  const { data, isLoading, error, isFetching } = useQuery({
    ...claudeCommandsQuery(projectId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const handleReload = () => {
    queryClient.invalidateQueries({
      queryKey: claudeCommandsQuery(projectId).queryKey,
    });
  };

  const globalCommands: CommandInfo[] = data?.globalCommands ?? [];
  const projectCommands: CommandInfo[] = data?.projectCommands ?? [];
  const globalSkills: CommandInfo[] = data?.globalSkills ?? [];
  const projectSkills: CommandInfo[] = data?.projectSkills ?? [];
  const defaultCommands: CommandInfo[] = data?.defaultCommands ?? [];

  const hasAny =
    globalCommands.length > 0 ||
    projectCommands.length > 0 ||
    globalSkills.length > 0 ||
    projectSkills.length > 0 ||
    defaultCommands.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-sidebar-foreground flex items-center gap-1.5">
            <SlashIcon className="w-4 h-4" />
            <Trans id="cli.title" message="CLI Commands" />
          </h2>
          <button
            type="button"
            onClick={handleReload}
            className="h-7 w-7 p-0 flex items-center justify-center rounded hover:bg-sidebar-accent transition-colors disabled:opacity-50"
            disabled={isLoading || isFetching}
            title={i18n._("Reload CLI commands")}
          >
            <RefreshCwIcon
              className={`w-3 h-3 ${isLoading || isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loading />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            <Trans
              id="cli.error.load_failed"
              message="Failed to load CLI commands"
            />
          </div>
        )}

        {data && !hasAny && (
          <div className="text-sm text-muted-foreground text-center py-8">
            <Trans id="cli.no.commands" message="No CLI commands found" />
          </div>
        )}

        {data && hasAny && (
          <div className="space-y-1">
            <Section
              title="Project Commands"
              icon={SlashIcon}
              items={projectCommands}
              prefix="/"
              defaultOpen
            />
            <Section
              title="Global Commands"
              icon={SlashIcon}
              items={globalCommands}
              prefix="/"
            />
            <Section
              title="Project Skills"
              icon={SparklesIcon}
              items={projectSkills}
              prefix="/"
              defaultOpen
            />
            <Section
              title="Global Skills"
              icon={SparklesIcon}
              items={globalSkills}
              prefix="/"
            />
            <Section
              title="Built-in"
              icon={SlashIcon}
              items={defaultCommands}
              prefix="/"
            />
          </div>
        )}
      </div>
    </div>
  );
};
