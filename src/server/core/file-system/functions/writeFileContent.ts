import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateFilePath } from "./getFileContent";

export type WriteFileResult =
  | { success: true; filePath: string }
  | {
      success: false;
      error: "INVALID_PATH" | "WRITE_ERROR";
      message: string;
      filePath: string;
    };

/**
 * Writes content to a file within the project root.
 * Creates intermediate directories if they don't exist.
 * Rejects path traversal attempts and paths outside project root.
 */
export const writeFileContent = async (
  projectRoot: string,
  filePath: string,
  content: string,
): Promise<WriteFileResult> => {
  const validation = validateFilePath(projectRoot, filePath);
  if (!validation.valid) {
    return {
      success: false,
      error: "INVALID_PATH",
      message: validation.message,
      filePath,
    };
  }

  const { resolvedPath } = validation;

  try {
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, content, "utf-8");
    return { success: true, filePath };
  } catch (error) {
    return {
      success: false,
      error: "WRITE_ERROR",
      message: error instanceof Error ? error.message : "Failed to write file",
      filePath,
    };
  }
};
