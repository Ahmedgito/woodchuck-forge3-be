import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import { safeDeleteAttachments } from './file-cleanup.util';

export interface AttachmentFile {
  filename: string;
  path: string;
  format?: ReportFormatEnum;
  // Optional human-friendly label shown as the download link text in emails.
  // Falls back to the filename (without extension) when not set.
  displayName?: string;
}

export interface MonthlyAttachments {
  monthName: string;
  attachments: AttachmentFile[];
}

/**
 * Renames the file extension of a zip attachment on disk and returns the updated AttachmentFile.
 * Only the extension changes — file content is untouched.
 */
export function renameAttachmentExtension(
  attachment: AttachmentFile,
  newExtension: string,
): AttachmentFile {
  if (!fs.existsSync(attachment.path)) {
    throw new Error(`File not found for renaming: ${attachment.path}`);
  }
  const dir = path.dirname(attachment.path);
  const oldExt = path.extname(attachment.path);
  const base = path.basename(attachment.path, oldExt);
  const filenameBase = path.basename(attachment.filename, path.extname(attachment.filename));

  const newPath = path.join(dir, `${base}.${newExtension}`);
  const newFilename = `${filenameBase}.${newExtension}`;

  if (newPath !== attachment.path) {
    fs.renameSync(attachment.path, newPath);
  }

  return { ...attachment, filename: newFilename, path: newPath };
}

/**
 * Creates a zip file containing multiple attachments organized by format folders
 * @param attachments Array of attachment files to include in the zip
 * @param zipFilename Name of the zip file to create
 * @param outputDir Directory where the zip file will be created (defaults to process.cwd())
 * @param deleteSourceFiles Whether to delete source files after ZIP creation (defaults to true for email delivery)
 * @returns Promise<AttachmentFile> The zip file attachment
 */
export async function createZipFromAttachments(
  attachments: AttachmentFile[],
  zipFilename: string,
  outputDir: string = process.cwd(),
  deleteSourceFiles: boolean = true,
): Promise<AttachmentFile> {
  const zipPath = path.join(outputDir, zipFilename);

  return new Promise<AttachmentFile>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    let resolved = false;

    output.on('close', () => {
      if (!resolved) {
        resolved = true;
        // Verify ZIP file exists and has content before resolving
        try {
          if (!fs.existsSync(zipPath)) {
            reject(new Error(`ZIP file was not created: ${zipPath}`));
            return;
          }
          const stat = fs.statSync(zipPath);
          if (stat.size === 0) {
            reject(new Error(`ZIP file is empty: ${zipPath}`));
            return;
          }
        } catch (err) {
          reject(err);
          return;
        }
        resolve({ filename: zipFilename, path: zipPath });
      }
    });

    output.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    archive.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    archive.pipe(output);

    // Add each attachment directly to the zip without format folders
    attachments.forEach((attachment) => {
      if (attachment.path && fs.existsSync(attachment.path)) {
        const fileName = attachment.filename;
        archive.file(attachment.path, { name: fileName });
      } else {
        console.warn(`Attachment file not found, skipping: ${attachment.path}`);
      }
    });

    archive.finalize();
  }).then(async (zipFile) => {
    // Verify ZIP is valid before returning
    if (!fs.existsSync(zipFile.path)) {
      throw new Error(
        `ZIP file does not exist after creation: ${zipFile.path}`,
      );
    }
    const stat = fs.statSync(zipFile.path);
    if (stat.size === 0) {
      throw new Error(`ZIP file is empty after creation: ${zipFile.path}`);
    }

    // Delete source files after ZIP is created only if requested (for email delivery)
    if (deleteSourceFiles) {
      await safeDeleteAttachments(attachments);
    }
    return zipFile;
  });
}

/**
 * Creates separate zip files for each month with attachments organized by format
 * @param monthlyAttachments Array of monthly attachment groups
 * @param reportType Type of report (job-site, dashboard)
 * @param jobSiteId Optional job site ID for job-site reports
 * @param outputDir Directory where the zip files will be created (defaults to process.cwd())
 * @param deleteSourceFiles Whether to delete source files after ZIP creation (defaults to true for email delivery)
 * @returns Promise<AttachmentFile[]> Array of zip file attachments
 */
export async function createMonthlyZipFiles(
  monthlyAttachments: MonthlyAttachments[],
  reportType: 'job-site' | 'dashboard',
  jobSiteId?: number,
  outputDir: string = process.cwd(),
  deleteSourceFiles: boolean = true,
): Promise<AttachmentFile[]> {
  const zipFiles: AttachmentFile[] = [];

  for (const monthlyData of monthlyAttachments) {
    if (monthlyData.attachments.length > 0) {
      const zipFilename = `${monthlyData.monthName}.zip`;

      const zipFile = await createZipFromAttachments(
        monthlyData.attachments,
        zipFilename,
        outputDir,
        deleteSourceFiles,
      );

      zipFiles.push(zipFile);
    }
  }

  return zipFiles;
}
