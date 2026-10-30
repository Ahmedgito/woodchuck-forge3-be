import * as fs from 'fs';
import * as path from 'path';

/**
 * Safely deletes a file or directory if it exists
 * @param filePath Path to the file or directory to delete
 * @returns Promise<boolean> True if file/directory was deleted, false if it didn't exist or couldn't be deleted
 */
export async function safeDeleteFile(filePath: string): Promise<boolean> {
  try {
    if (!filePath) {
      return false;
    }

    // Check if file/directory exists
    const exists = await fs.promises
      .access(filePath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return false;
    }

    // Check if it's a directory or file
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      // Delete directory recursively
      await fs.promises.rm(filePath, { recursive: true, force: true });
    } else {
      // Delete the file
      await fs.promises.unlink(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete file/directory ${filePath}:`, error);
    return false;
  }
}

/**
 * Safely deletes multiple files
 * @param filePaths Array of file paths to delete
 * @returns Promise<void>
 */
export async function safeDeleteFiles(
  filePaths: (string | null | undefined)[],
): Promise<void> {
  const deletePromises = filePaths
    .filter((p): p is string => !!p)
    .map((filePath) => safeDeleteFile(filePath));

  await Promise.allSettled(deletePromises);
}

/**
 * Safely deletes files from attachment objects
 * @param attachments Array of attachment objects with path property
 * @returns Promise<void>
 */
export async function safeDeleteAttachments(
  attachments: Array<{ path?: string | null } | null | undefined>,
): Promise<void> {
  const filePaths = attachments
    .filter((att): att is { path?: string | null } => !!att)
    .map((att) => att.path);

  await safeDeleteFiles(filePaths);
}
