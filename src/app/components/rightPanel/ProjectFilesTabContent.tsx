import { useQuery } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  Loader2,
} from "lucide-react";
import { type FC, useState } from "react";
import { fileCompletionQuery } from "@/lib/api/queries";
import { FileContentDialog } from "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/FileContentDialog";

interface ProjectFilesTabContentProps {
  projectId: string;
  projectPath: string;
}

interface TreeNodeProps {
  name: string;
  path: string;
  type: "file" | "directory";
  depth: number;
  projectId: string;
  projectPath: string;
}

const TreeNode: FC<TreeNodeProps> = ({
  name,
  path,
  type,
  depth,
  projectId,
  projectPath,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    ...fileCompletionQuery(projectId, `/${path}`),
    enabled: type === "directory" && isOpen,
  });

  const indentPx = depth * 12;
  const absolutePath = `${projectPath}/${path}`;

  if (type === "file") {
    return (
      <FileContentDialog projectId={projectId} filePaths={[absolutePath]}>
        <button
          type="button"
          className="w-full flex items-center gap-1.5 py-0.5 hover:bg-muted/40 transition-colors text-left pr-2 rounded"
          style={{ paddingLeft: `${indentPx + 8}px` }}
        >
          <FileIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="font-mono truncate text-foreground">{name}</span>
        </button>
      </FileContentDialog>
    );
  }

  // directory
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-1 py-0.5 hover:bg-muted/40 transition-colors text-left pr-2 rounded"
        style={{ paddingLeft: `${indentPx + 2}px` }}
      >
        <ChevronRightIcon
          className={`w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/60 transition-transform duration-150 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        {isOpen ? (
          <FolderOpenIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
        ) : (
          <FolderIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
        )}
        <span className="font-mono truncate text-foreground">{name}</span>
        {isLoading && (
          <Loader2 className="w-3 h-3 ml-auto flex-shrink-0 animate-spin text-muted-foreground" />
        )}
      </button>
      {isOpen &&
        data?.entries.map((entry) => (
          <TreeNode
            key={entry.path}
            name={entry.name}
            path={entry.path}
            type={entry.type}
            depth={depth + 1}
            projectId={projectId}
            projectPath={projectPath}
          />
        ))}
    </>
  );
};

export const ProjectFilesTabContent: FC<ProjectFilesTabContentProps> = ({
  projectId,
  projectPath,
}) => {
  const { data, isLoading, error } = useQuery(
    fileCompletionQuery(projectId, "/"),
  );

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8 text-destructive text-xs px-4 text-center">
            Erro ao carregar arquivos
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {data.entries.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Pasta vazia
              </div>
            )}
            {data.entries.map((entry) => (
              <TreeNode
                key={entry.path}
                name={entry.name}
                path={entry.path}
                type={entry.type}
                depth={0}
                projectId={projectId}
                projectPath={projectPath}
              />
            ))}
          </>
        )}
      </div>

      {/* Path atual no rodapé */}
      <div className="px-2 py-1 border-t border-border/40 bg-muted/10">
        <p
          className="font-mono text-[10px] text-muted-foreground truncate"
          title={projectPath}
        >
          {projectPath}
        </p>
      </div>
    </div>
  );
};
