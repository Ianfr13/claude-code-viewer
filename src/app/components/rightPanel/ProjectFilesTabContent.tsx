import { useQuery } from "@tanstack/react-query";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  Loader2,
} from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { fileCompletionQuery } from "@/lib/api/queries";
import { FileContentDialog } from "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/FileContentDialog";

interface ProjectFilesTabContentProps {
  projectId: string;
  projectPath: string;
}

export const ProjectFilesTabContent: FC<ProjectFilesTabContentProps> = ({
  projectId,
  projectPath,
}) => {
  // basePath relativo à raiz do projeto (ex: "" = raiz, "src" = /src)
  const [currentBasePath, setCurrentBasePath] = useState("/");
  // breadcrumb para navegação
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  const { data, isLoading, error } = useQuery(
    fileCompletionQuery(projectId, currentBasePath),
  );

  const handleNavigateInto = (entryPath: string, entryName: string) => {
    setCurrentBasePath(`/${entryPath}`);
    setBreadcrumbs((prev) => [...prev, entryName]);
  };

  const handleNavigateUp = (targetIndex: number) => {
    if (targetIndex < 0) {
      // volta para a raiz
      setCurrentBasePath("/");
      setBreadcrumbs([]);
      return;
    }
    const newBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1);
    // reconstrói o path a partir dos breadcrumbs
    const newPath = `/${newBreadcrumbs.join("/")}`;
    setCurrentBasePath(newPath);
    setBreadcrumbs(newBreadcrumbs);
  };

  const isAtRoot = breadcrumbs.length === 0;

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Breadcrumb / navegação */}
      <div className="px-2 py-1.5 border-b border-border/40 bg-muted/20 flex items-center gap-1 flex-wrap min-h-[32px]">
        <button
          type="button"
          onClick={() => handleNavigateUp(-1)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-muted/50"
          title="Raiz do projeto"
        >
          <HomeIcon className="w-3 h-3" />
        </button>
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex items-center gap-1">
            <ChevronRightIcon className="w-3 h-3 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => handleNavigateUp(index)}
              className={
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-muted/50"
              }
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
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
            {/* Botão para subir um nível */}
            {!isAtRoot && (
              <button
                type="button"
                onClick={() => handleNavigateUp(breadcrumbs.length - 2)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
              >
                <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-mono">..</span>
              </button>
            )}

            {data.entries.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Pasta vazia
              </div>
            )}

            {data.entries.map((entry) => {
              const absolutePath = `${projectPath}/${entry.path}`;

              if (entry.type === "directory") {
                return (
                  <button
                    key={entry.path}
                    type="button"
                    onClick={() => handleNavigateInto(entry.path, entry.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors text-left group"
                  >
                    <FolderOpenIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-400 group-hover:text-blue-500" />
                    <span className="font-mono truncate flex-1 text-foreground">
                      {entry.name}
                    </span>
                    <ChevronRightIcon className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                );
              }

              // arquivo — abre FileContentDialog
              return (
                <FileContentDialog
                  key={entry.path}
                  projectId={projectId}
                  filePaths={[absolutePath]}
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <FileIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="font-mono truncate flex-1 text-foreground">
                      {entry.name}
                    </span>
                  </button>
                </FileContentDialog>
              );
            })}
          </>
        )}
      </div>

      {/* Path atual no rodapé */}
      <div className="px-2 py-1 border-t border-border/40 bg-muted/10">
        <p className="font-mono text-[10px] text-muted-foreground truncate" title={projectPath}>
          {projectPath}
          {!isAtRoot && `/${breadcrumbs.join("/")}`}
        </p>
      </div>
    </div>
  );
};
